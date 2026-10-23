import { ProcessService } from './process.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProcessService — listagem paginada e escopo de tenant', () => {
    const findMany = jest.fn();
    const count = jest.fn();
    const $transaction = jest.fn();

    const prisma = {
        process: { findMany, count },
        $transaction,
    } as unknown as PrismaService;

    const service = new ProcessService(prisma);

    /** O que foi passado para o findMany dentro do $transaction. */
    function findManyArgs() {
        return findMany.mock.calls[0][0] as {
            where: Record<string, unknown>;
            skip: number;
            take: number;
            orderBy: unknown;
        };
    }

    beforeEach(() => {
        findMany.mockReset().mockReturnValue('findMany');
        count.mockReset().mockReturnValue('count');
        $transaction.mockReset().mockResolvedValue([[], 0]);
    });

    it('filtra sempre pela empresa do token', async () => {
        await service.listAll(7, {});
        expect(findManyArgs().where).toMatchObject({ companyId: 7 });
    });

    it('aplica filtros de status, tipo e cliente sem perder o tenant', async () => {
        await service.listAll(7, { statusId: 2, typeId: 3, clientId: 4 });
        expect(findManyArgs().where).toMatchObject({
            companyId: 7,
            statusId: 2,
            typeId: 3,
            clientId: 4,
        });
    });

    it('busca por nome ou código', async () => {
        await service.listAll(7, { search: 'souza' });
        expect(findManyArgs().where.OR).toEqual([
            { name: { contains: 'souza', mode: 'insensitive' } },
            { code: { contains: 'souza', mode: 'insensitive' } },
        ]);
    });

    it('termo em branco não vira filtro', async () => {
        await service.listAll(7, { search: '   ' });
        expect(findManyArgs().where.OR).toBeUndefined();
    });

    it('aplica os defaults de paginação', async () => {
        await service.listAll(7, {});
        expect(findManyArgs().skip).toBe(0);
        expect(findManyArgs().take).toBe(20);
    });

    it('calcula o skip a partir da página', async () => {
        await service.listAll(7, { page: 3, pageSize: 15 });
        expect(findManyArgs().skip).toBe(30);
        expect(findManyArgs().take).toBe(15);
    });

    it('devolve o envelope paginado', async () => {
        $transaction.mockResolvedValue([[{ id: 1 }], 42]);
        const result = await service.listAll(7, { pageSize: 20 });
        expect(result).toEqual({
            items: [{ id: 1 }],
            total: 42,
            page: 1,
            pageSize: 20,
            pages: 3,
        });
    });
});

describe('ProcessService — criação grava histórico e aplica a regra do Total', () => {
    const clientFindFirst = jest.fn();
    const typeFindUnique = jest.fn();
    const statusFindUnique = jest.fn();
    const subtypeFindUnique = jest.fn();
    const processFindUnique = jest.fn();
    const txProcessCreate = jest.fn();
    const txHistoryCreate = jest.fn();
    const $transaction = jest.fn();

    const prisma = {
        client: { findFirst: clientFindFirst },
        processType: { findUnique: typeFindUnique },
        processStatus: { findUnique: statusFindUnique },
        processSubtype: { findUnique: subtypeFindUnique },
        process: { findUnique: processFindUnique },
        $transaction,
    } as unknown as PrismaService;

    const service = new ProcessService(prisma);

    const baseDto = {
        name: 'Processo X',
        code: 'C-1',
        clientId: 1,
        typeId: 1,
        statusId: 1,
        fixedAmount: 3000,
        expectedAmount: 25000,
    } as Parameters<typeof service.create>[0];

    beforeEach(() => {
        clientFindFirst.mockReset().mockResolvedValue({ id: 1 });
        typeFindUnique.mockReset().mockResolvedValue({ id: 1 });
        statusFindUnique.mockReset().mockResolvedValue({ id: 1, isFinal: false });
        subtypeFindUnique.mockReset();
        processFindUnique.mockReset().mockResolvedValue(null); // código livre
        txProcessCreate.mockReset().mockResolvedValue({ id: 99 });
        txHistoryCreate.mockReset().mockResolvedValue({});
        $transaction.mockReset().mockImplementation((cb: (tx: unknown) => unknown) =>
            cb({
                process: { create: txProcessCreate },
                processStatusHistory: { create: txHistoryCreate },
            }),
        );
    });

    it('deriva o Total quando o status não é de encerramento', async () => {
        await service.create(baseDto, 7, 1);
        expect(txProcessCreate.mock.calls[0][0].data.totalAmount).toBe(28000);
    });

    it('aceita o Total informado quando o status é de encerramento', async () => {
        statusFindUnique.mockResolvedValue({ id: 1, isFinal: true });
        await service.create({ ...baseDto, totalAmount: 22500 }, 7, 1);
        expect(txProcessCreate.mock.calls[0][0].data.totalAmount).toBe(22500);
    });

    it('grava a primeira linha do histórico ao criar', async () => {
        await service.create(baseDto, 7, 1);
        expect(txHistoryCreate.mock.calls[0][0].data).toMatchObject({
            processId: 99,
            statusId: 1,
            userId: 1,
            note: 'Processo criado',
        });
    });
});
