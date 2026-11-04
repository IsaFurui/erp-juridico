import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'undici';
import { datajudAlias, datajudSearchUrl, onlyDigits } from './datajud-alias';
import { movementsFromResponse } from './datajud-response';
import type { TribunalMovement, TribunalProvider } from './tribunal-provider';

// A consulta ao TJSP já levou ~17s; damos folga sem deixar o job travar.
const REQUEST_TIMEOUT_MS = 30_000;

@Injectable()
export class DatajudProvider implements TribunalProvider {
    private readonly logger = new Logger(DatajudProvider.name);

    constructor(private readonly config: ConfigService) {}

    async fetchMovements(code: string): Promise<TribunalMovement[] | null> {
        const alias = datajudAlias(code);
        if (!alias) return null; // defensivo: o job já filtra alias nulo

        const url = datajudSearchUrl(alias);
        const body = JSON.stringify({
            query: { match: { numeroProcesso: onlyDigits(code) } },
        });

        const json = await this.search(url, body);
        return movementsFromResponse(json);
    }

    /**
     * Único ponto de I/O com o DataJud. O tutorial do CNJ (2023) usa GET com
     * corpo, mas tentamos POST primeiro (mais previsível); se o endpoint
     * recusar o método (405), caímos para GET com corpo — que o `fetch` do
     * Node não envia, por isso undici. Qual caminho vingou de fato:
     * confirmar com a sonda real e anotar aqui.
     */
    private async search(url: string, body: string): Promise<unknown> {
        const apiKey = this.config.get<string>('DATAJUD_API_KEY');
        if (!apiKey) {
            // Só estoura quando há de fato uma consulta — nunca no bootstrap.
            throw new Error('DATAJUD_API_KEY não configurada');
        }
        const headers = {
            'content-type': 'application/json',
            // APIKey, NÃO Basic Auth (o tutorial antigo do CNJ está defasado).
            authorization: `APIKey ${apiKey}`,
        };

        let res = await this.send('POST', url, headers, body);
        if (res.statusCode === 405) {
            this.logger.debug(
                'DataJud recusou POST (405); tentando GET com corpo',
            );
            res = await this.send('GET', url, headers, body);
        }

        if (res.statusCode === 401 || res.statusCode === 403) {
            // A chave é pública, mas o CNJ pode trocá-la — avisar alto e claro.
            this.logger.error(
                `DataJud respondeu ${res.statusCode}: chave inválida ou revogada (verifique DATAJUD_API_KEY)`,
            );
            throw new Error(`DataJud ${res.statusCode}: chave inválida`);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
            throw new Error(`DataJud respondeu HTTP ${res.statusCode}`);
        }

        return res.json;
    }

    private async send(
        method: 'GET' | 'POST',
        url: string,
        headers: Record<string, string>,
        body: string,
    ): Promise<{ statusCode: number; json: unknown }> {
        const res = await request(url, {
            method,
            headers,
            body,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        // Drena o corpo mesmo em erro HTTP; corpo não-JSON vira null.
        const json: unknown = await res.body.json().catch(() => null);
        return { statusCode: res.statusCode, json };
    }
}
