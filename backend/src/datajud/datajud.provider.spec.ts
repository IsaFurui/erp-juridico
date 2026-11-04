import { ConfigService } from '@nestjs/config';
import { request } from 'undici';
import { DatajudProvider } from './datajud.provider';

jest.mock('undici', () => ({ request: jest.fn() }));

const mockedRequest = request as unknown as jest.Mock;

function response(statusCode: number, json: unknown) {
    return { statusCode, body: { json: () => Promise.resolve(json) } };
}

function config(key: string | undefined): ConfigService {
    return { get: () => key } as unknown as ConfigService;
}

const SP_NUMBER = '1016649-39.2025.8.26.0554';

function optionsOf(call: number): {
    method: string;
    headers: Record<string, string>;
} {
    return mockedRequest.mock.calls[call][1] as {
        method: string;
        headers: Record<string, string>;
    };
}

describe('DatajudProvider', () => {
    beforeEach(() => mockedRequest.mockReset());

    it('número sem alias (inválido) nem toca na rede', async () => {
        const provider = new DatajudProvider(config('k'));
        const result = await provider.fetchMovements('123');
        expect(result.movements).toBeNull();
        expect(result.method).toBe('NONE');
        expect(mockedRequest).not.toHaveBeenCalled();
    });

    it('POST bem-sucedido devolve os movimentos (header APIKey, não Basic)', async () => {
        mockedRequest.mockResolvedValue(
            response(200, {
                hits: {
                    hits: [
                        {
                            _source: {
                                grau: 'G1',
                                movimentos: [
                                    {
                                        codigo: 9,
                                        nome: 'Distribuição',
                                        dataHora: '2024-01-01T00:00:00Z',
                                    },
                                ],
                            },
                        },
                    ],
                },
            }),
        );

        const provider = new DatajudProvider(config('minha-chave'));
        const result = await provider.fetchMovements(SP_NUMBER);

        expect(mockedRequest).toHaveBeenCalledTimes(1);
        const [url] = mockedRequest.mock.calls[0] as [string];
        expect(url).toBe(
            'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search',
        );
        expect(optionsOf(0).method).toBe('POST');
        expect(optionsOf(0).headers.authorization).toBe('APIKey minha-chave');
        expect(result.movements?.map((m) => m.code)).toEqual([9]);
        expect(result.method).toBe('POST');
        expect(result.httpStatus).toBe(200);
    });

    it('405 no POST cai para GET com corpo', async () => {
        mockedRequest
            .mockResolvedValueOnce(response(405, null))
            .mockResolvedValueOnce(response(200, { hits: { hits: [] } }));

        const provider = new DatajudProvider(config('k'));
        const result = await provider.fetchMovements(SP_NUMBER);

        expect(mockedRequest).toHaveBeenCalledTimes(2);
        expect(optionsOf(0).method).toBe('POST');
        expect(optionsOf(1).method).toBe('GET');
        expect(result.movements).toBeNull(); // consulta vazia = não encontrado
        expect(result.method).toBe('GET'); // registrou que o fallback venceu
    });

    it('401 estoura com mensagem de chave inválida', async () => {
        mockedRequest.mockResolvedValue(response(401, null));
        const provider = new DatajudProvider(config('k'));
        await expect(provider.fetchMovements(SP_NUMBER)).rejects.toThrow(
            /chave inválida/i,
        );
    });

    it('HTTP 500 estoura (erro de rede/servidor)', async () => {
        mockedRequest.mockResolvedValue(response(500, null));
        const provider = new DatajudProvider(config('k'));
        await expect(provider.fetchMovements(SP_NUMBER)).rejects.toThrow(
            /HTTP 500/,
        );
    });

    it('sem DATAJUD_API_KEY, estoura só na consulta (não no bootstrap)', async () => {
        const provider = new DatajudProvider(config(undefined));
        await expect(provider.fetchMovements(SP_NUMBER)).rejects.toThrow(
            /DATAJUD_API_KEY/,
        );
        expect(mockedRequest).not.toHaveBeenCalled();
    });
});
