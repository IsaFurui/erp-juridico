import type { TribunalMovement } from './tribunal-provider';

/**
 * Parsing da resposta do DataJud. Fica isolado aqui, sem rede, para ser
 * testável com um JSON de exemplo. Shape confirmado por sonda real (2026-11):
 * topo `took/timed_out/_shards/hits`, com `hits.hits[]._source.{grau,
 * movimentos}`. Atenção: `grau` traz valores como "JE" (juizado especial),
 * não só "G1"/"G2".
 */

interface DatajudMovimento {
    codigo?: number;
    nome?: string;
    dataHora?: string;
    complementosTabelados?: unknown;
}

interface DatajudSource {
    grau?: string | null;
    movimentos?: DatajudMovimento[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** Extrai os `_source` de `hits.hits[]`; lista vazia quando nada veio. */
export function extractDocuments(json: unknown): DatajudSource[] {
    if (!isRecord(json)) return [];
    const hits = json.hits;
    if (!isRecord(hits)) return [];
    const inner = hits.hits;
    if (!Array.isArray(inner)) return [];

    const docs: DatajudSource[] = [];
    for (const hit of inner) {
        if (!isRecord(hit)) continue;
        const source = hit._source;
        if (isRecord(source)) docs.push(source);
    }
    return docs;
}

// "G1", "G2"... — grau maior = instância mais alta. Quem não casa o padrão
// (ex.: juizado, turma recursal) fica no piso para não "ganhar" de um G2.
function grauRank(grau: string | null | undefined): number {
    if (!grau) return 0;
    const match = /^G(\d+)$/i.exec(grau.trim());
    return match ? Number(match[1]) : 0;
}

/** Escolhe o documento de maior grau; empate fica com o primeiro. */
export function selectHighestGrauDocument<T extends { grau?: string | null }>(
    docs: T[],
): T | null {
    if (docs.length === 0) return null;
    return docs.reduce((best, current) =>
        grauRank(current.grau) > grauRank(best.grau) ? current : best,
    );
}

/**
 * Normaliza os `movimentos` crus. Descarta os que não dão para deduplicar
 * (sem `codigo` ou sem `dataHora` válida), já que a unique do banco é
 * (processId, code, occurredAt).
 */
export function mapMovimentos(
    movimentos: DatajudMovimento[] | undefined,
): TribunalMovement[] {
    if (!Array.isArray(movimentos)) return [];

    const out: TribunalMovement[] = [];
    for (const mov of movimentos) {
        if (mov?.codigo == null || !mov?.dataHora) continue;
        const occurredAt = new Date(mov.dataHora);
        if (Number.isNaN(occurredAt.getTime())) continue;

        out.push({
            code: Number(mov.codigo),
            name: String(mov.nome ?? ''),
            occurredAt,
            complements: mov.complementosTabelados ?? null,
        });
    }
    return out;
}

/** Junta o pipeline: resposta crua → movimentos do doc de maior grau. */
export function movementsFromResponse(
    json: unknown,
): TribunalMovement[] | null {
    const docs = extractDocuments(json);
    const best = selectHighestGrauDocument(docs);
    if (!best) return null; // consulta vazia = não encontrado
    return mapMovimentos(best.movimentos);
}
