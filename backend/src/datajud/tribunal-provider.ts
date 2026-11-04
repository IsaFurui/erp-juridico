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

export interface TribunalProvider {
    /**
     * Consulta os movimentos de um processo pelo número CNJ.
     * - lista de movimentos (do documento de maior grau) quando encontra;
     * - `null` quando a consulta volta vazia (não encontrado na base pública)
     *   ou o número não tem alias de tribunal — **não é erro**;
     * - **lança** em falha de rede/HTTP (incl. 401/403 de chave inválida).
     */
    fetchMovements(code: string): Promise<TribunalMovement[] | null>;
}

/** Token de DI — o provider concreto é religado no módulo. */
export const TRIBUNAL_PROVIDER = 'TRIBUNAL_PROVIDER';
