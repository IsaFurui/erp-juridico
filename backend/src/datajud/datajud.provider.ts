import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'undici';
import { datajudAlias, datajudSearchUrl, onlyDigits } from './datajud-alias';
import { lookupFromResponse } from './datajud-response';
import type { TribunalLookup, TribunalProvider } from './tribunal-provider';

// A sonda real contra o CNJ mediu 37-45s por consulta (bem acima dos ~17s
// estimados); 30s estouravam quase sempre. 60s dá folga sem travar o job.
const REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class DatajudProvider implements TribunalProvider {
    private readonly logger = new Logger(DatajudProvider.name);

    constructor(private readonly config: ConfigService) {}

    async fetchMovements(code: string): Promise<TribunalLookup> {
        const alias = datajudAlias(code);
        if (!alias) {
            // Defensivo: o job já filtra alias nulo. Sem consulta à rede.
            return {
                movements: null,
                metadata: null,
                method: 'NONE',
                httpStatus: 0,
                rawResponse: null,
                durationMs: 0,
            };
        }

        const url = datajudSearchUrl(alias);
        const body = JSON.stringify({
            query: { match: { numeroProcesso: onlyDigits(code) } },
        });

        const started = Date.now();
        const res = await this.search(url, body);
        const parsed = lookupFromResponse(res.json);
        return {
            movements: parsed.movements,
            metadata: parsed.metadata,
            method: res.method,
            httpStatus: res.statusCode,
            rawResponse: res.json,
            durationMs: Date.now() - started,
        };
    }

    /**
     * Único ponto de I/O com o DataJud. O tutorial do CNJ (2023) usa GET com
     * corpo, mas tentamos POST primeiro (mais previsível). Sonda real
     * (2026-11): o POST responde 200 normalmente — o fallback para GET com
     * corpo (que o `fetch` do Node não envia, por isso undici) fica só como
     * defesa, para o caso de o endpoint recusar o método (405).
     */
    private async search(
        url: string,
        body: string,
    ): Promise<{ statusCode: number; json: unknown; method: string }> {
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

        let method = 'POST';
        let res = await this.send('POST', url, headers, body);
        if (res.statusCode === 405) {
            this.logger.debug(
                'DataJud recusou POST (405); tentando GET com corpo',
            );
            method = 'GET';
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

        return { ...res, method };
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
