import {
    extractDocuments,
    mapMovimentos,
    movementsFromResponse,
    selectHighestGrauDocument,
} from './datajud-response';

function hit(source: unknown) {
    return { _index: 'x', _id: 'y', _source: source };
}

describe('extractDocuments', () => {
    it('pega os _source de hits.hits', () => {
        const json = {
            hits: { hits: [hit({ grau: 'G1' }), hit({ grau: 'G2' })] },
        };
        expect(extractDocuments(json)).toEqual([
            { grau: 'G1' },
            { grau: 'G2' },
        ]);
    });

    it('resiste a formatos inesperados devolvendo lista vazia', () => {
        expect(extractDocuments(null)).toEqual([]);
        expect(extractDocuments({})).toEqual([]);
        expect(extractDocuments({ hits: {} })).toEqual([]);
        expect(extractDocuments({ hits: { hits: 'nope' } })).toEqual([]);
    });
});

describe('selectHighestGrauDocument', () => {
    it('escolhe o de maior grau (G2 > G1)', () => {
        const docs = [
            { grau: 'G1', id: 1 },
            { grau: 'G2', id: 2 },
        ];
        expect(selectHighestGrauDocument(docs)?.id).toBe(2);
    });

    it('independe da ordem de chegada', () => {
        const docs = [
            { grau: 'G2', id: 2 },
            { grau: 'G1', id: 1 },
        ];
        expect(selectHighestGrauDocument(docs)?.id).toBe(2);
    });

    it('grau desconhecido não vence um G2', () => {
        const docs = [
            { grau: 'JE', id: 1 },
            { grau: 'G2', id: 2 },
        ];
        expect(selectHighestGrauDocument(docs)?.id).toBe(2);
    });

    it('lista vazia devolve null', () => {
        expect(selectHighestGrauDocument([])).toBeNull();
    });
});

describe('mapMovimentos', () => {
    it('normaliza código, nome, data e complementos', () => {
        const result = mapMovimentos([
            {
                codigo: 26,
                nome: 'Distribuição',
                dataHora: '2024-03-10T09:00:00.000Z',
                complementosTabelados: [{ codigo: 1 }],
            },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            code: 26,
            name: 'Distribuição',
            complements: [{ codigo: 1 }],
        });
        expect(result[0].occurredAt.toISOString()).toBe(
            '2024-03-10T09:00:00.000Z',
        );
    });

    it('descarta movimento sem código ou sem data válida (não dá pra deduplicar)', () => {
        const result = mapMovimentos([
            { nome: 'sem código', dataHora: '2024-03-10T09:00:00Z' },
            { codigo: 1, nome: 'sem data' },
            { codigo: 2, nome: 'data inválida', dataHora: 'xpto' },
            { codigo: 3, nome: 'ok', dataHora: '2024-03-11T10:00:00Z' },
        ]);
        expect(result.map((m) => m.code)).toEqual([3]);
    });

    it('complementos ausentes viram null', () => {
        const [m] = mapMovimentos([
            { codigo: 5, nome: 'x', dataHora: '2024-01-01T00:00:00Z' },
        ]);
        expect(m.complements).toBeNull();
    });

    it('sem movimentos devolve lista vazia', () => {
        expect(mapMovimentos(undefined)).toEqual([]);
        expect(mapMovimentos([])).toEqual([]);
    });
});

describe('movementsFromResponse', () => {
    it('consulta vazia (sem hits) devolve null = não encontrado', () => {
        expect(movementsFromResponse({ hits: { hits: [] } })).toBeNull();
    });

    it('com um documento de maior grau, devolve só os movimentos dele', () => {
        const json = {
            hits: {
                hits: [
                    hit({
                        grau: 'G1',
                        movimentos: [
                            {
                                codigo: 1,
                                nome: 'g1',
                                dataHora: '2024-01-01T00:00:00Z',
                            },
                        ],
                    }),
                    hit({
                        grau: 'G2',
                        movimentos: [
                            {
                                codigo: 2,
                                nome: 'g2',
                                dataHora: '2024-02-01T00:00:00Z',
                            },
                        ],
                    }),
                ],
            },
        };
        const result = movementsFromResponse(json);
        expect(result?.map((m) => m.code)).toEqual([2]);
    });

    it('documento encontrado mas sem movimentos devolve lista vazia (não null)', () => {
        const json = { hits: { hits: [hit({ grau: 'G1' })] } };
        expect(movementsFromResponse(json)).toEqual([]);
    });
});
