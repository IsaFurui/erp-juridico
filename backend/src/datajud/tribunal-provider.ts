/**
 * Porta de entrada para a consulta de andamentos num tribunal. O resto do
 * sistema (job de sync, endpoint sob demanda) depende só desta interface —
 * trocar o DataJud por um provedor pago depois é implementar outra classe e
 * religar o token no módulo, sem tocar no job.
 */

/** Movimento já normalizado, pronto para virar `ProcessMovement`. */
export interface TribunalMovement {
    code: number;
    name: string;
    occurredAt: Date;
    /** `complementosTabelados` cru, ou null quando ausente. */
    complements: unknown;
}

/**
 * Resultado de uma consulta, já com os dados crus para auditoria (log).
 * `movements` é `null` quando a base não tem o processo.
 */
export interface TribunalLookup {
    movements: TribunalMovement[] | null;
    /** Método HTTP que funcionou (POST/GET), ou NONE se nem consultou. */
    method: string;
    /** Status HTTP da resposta (0 quando não houve consulta). */
    httpStatus: number;
    /** Resposta crua do tribunal, para auditoria. */
    rawResponse: unknown;
    /** Duração da consulta em ms. */
    durationMs: number;
}

export interface TribunalProvider {
    /**
     * Consulta os movimentos de um processo pelo número CNJ.
     * - `movements`: lista (do documento de maior grau) ou `null` quando a
     *   consulta volta vazia (não encontrado) ou o número não tem alias de
     *   tribunal — **não é erro**;
     * - **lança** em falha de rede/HTTP (incl. 401/403 de chave inválida).
     */
    fetchMovements(code: string): Promise<TribunalLookup>;
}

/** Token de DI — o provider concreto é religado no módulo. */
export const TRIBUNAL_PROVIDER = 'TRIBUNAL_PROVIDER';
