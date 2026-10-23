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

describe('ProcessService — edição recalcula o Total conforme o status', () => {
    const findFirst = jest.fn();
    const update = jest.fn();
    const clientFindFirst = jest.fn();
    const typeFindUnique = jest.fn();
    const subtypeFindUnique = jest.fn();
    const processFindUnique = jest.fn();

    const prisma = {
        process: { findFirst, update, findUnique: processFindUnique },
        client: { findFirst: clientFindFirst },
        processType: { findUnique: typeFindUnique },
        processSubtype: { findUnique: subtypeFindUnique },
    } as unknown as PrismaService;

    const service = new ProcessService(prisma);

    beforeEach(() => {
        update.mockReset().mockResolvedValue({});
        clientFindFirst.mockReset().mockResolvedValue({ id: 1 });
        typeFindUnique.mockReset().mockResolvedValue({ id: 1 });
        subtypeFindUnique.mockReset();
        processFindUnique.mockReset().mockResolvedValue(null);
    });

    it('recalcula o Total ao editar Esperado num processo não encerrado', async () => {
        findFirst.mockResolvedValue({
            id: 1,
            code: 'C-1',
            type: { id: 1 },
            fixedAmount: 3000,
            expectedAmount: 25000,
            status: { id: 1, isFinal: false },
        });
        await service.update(1, { expectedAmount: 30000 }, 7);
        expect(update.mock.calls[0][0].data.totalAmount).toBe(33000);
    });

    it('não mexe no Total quando o processo já está encerrado', async () => {
        findFirst.mockResolvedValue({
            id: 1,
            code: 'C-1',
            type: { id: 1 },
            fixedAmount: 4000,
            expectedAmount: 18000,
            status: { id: 9, isFinal: true },
        });
        await service.update(1, { fixedAmount: 1 }, 7);
        expect(update.mock.calls[0][0].data.totalAmount).toBeUndefined();
    });
});

describe('ProcessService — mudança de status grava histórico e Total de encerramento', () => {
    const findFirst = jest.fn();
    const statusFindUnique = jest.fn();
    const txProcessUpdate = jest.fn();
    const txHistoryCreate = jest.fn();
    const $transaction = jest.fn();

    const prisma = {
        process: { findFirst, update: jest.fn() },
        processStatus: { findUnique: statusFindUnique },
        $transaction,
    } as unknown as PrismaService;

    const service = new ProcessService(prisma);

    beforeEach(() => {
        findFirst
            .mockReset()
            .mockResolvedValue({ id: 1, fixedAmount: 4000, expectedAmount: 18000 });
        statusFindUnique.mockReset().mockResolvedValue({ id: 9, isFinal: true });
        txProcessUpdate.mockReset().mockResolvedValue({});
        txHistoryCreate.mockReset().mockResolvedValue({});
        $transaction.mockReset().mockImplementation((cb: (tx: unknown) => unknown) =>
            cb({
                process: { update: txProcessUpdate },
                processStatusHistory: { create: txHistoryCreate },
            }),
        );
    });

    it('ao encerrar, aceita o Total final e registra o histórico', async () => {
        await service.changeStatus(1, { statusId: 9, totalAmount: 22500 }, 7, 1);
        expect(txProcessUpdate.mock.calls[0][0].data).toMatchObject({
            statusId: 9,
            totalAmount: 22500,
        });
        expect(txHistoryCreate.mock.calls[0][0].data).toMatchObject({
            processId: 1,
            statusId: 9,
            userId: 1,
        });
    });

    it('ao reabrir (status não-final), volta o Total a ser derivado', async () => {
        statusFindUnique.mockResolvedValue({ id: 1, isFinal: false });
        await service.changeStatus(1, { statusId: 1 }, 7, 1);
        expect(txProcessUpdate.mock.calls[0][0].data).toMatchObject({
            statusId: 1,
            totalAmount: 22000,
        });
    });

    it('processo de outra empresa responde 404', async () => {
        findFirst.mockResolvedValue(null);
        await expect(
            service.changeStatus(1, { statusId: 1 }, 7, 1),
        ).rejects.toThrow('Processo não encontrado');
    });
});
