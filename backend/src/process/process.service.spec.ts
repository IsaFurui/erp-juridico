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
