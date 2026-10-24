import { NotFoundException } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseCategory } from './enums/expense-category.enum';

/**
 * Mesma classe de furo coberta em clients: a listagem e o resumo precisam
 * filtrar SEMPRE pela empresa do token, senão vazam despesas de outro
 * escritório.
 */
describe('ExpenseService — escopo de tenant', () => {
    const findMany = jest.fn();
    const count = jest.fn();
    const aggregate = jest.fn();
    const groupBy = jest.fn();
    const findFirst = jest.fn();
    const create = jest.fn();
    const update = jest.fn();
    const $transaction = jest.fn();

    const prisma = {
        expense: { findMany, count, aggregate, groupBy, findFirst, create, update },
        $transaction,
    } as unknown as PrismaService;

    const service = new ExpenseService(prisma);

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
        aggregate.mockReset().mockReturnValue('aggregate');
        groupBy.mockReset().mockReturnValue('groupBy');
        findFirst.mockReset();
        create.mockReset();
        update.mockReset();
        // listAll e summary rodam os dois lados dentro de um $transaction.
        $transaction.mockReset().mockResolvedValue([[], 0]);
    });

    describe('listAll', () => {
        it('filtra pela empresa do token', async () => {
            await service.listAll(7, {});

            expect(findManyArgs().where).toEqual({ companyId: 7 });
        });

        it('aplica os defaults de paginação (page 1, pageSize 20)', async () => {
            await service.listAll(7, {});

            const args = findManyArgs();
            expect(args.skip).toBe(0);
            expect(args.take).toBe(20);
        });

        it('filtra por categoria e por intervalo de datas', async () => {
            await service.listAll(7, {
                category: ExpenseCategory.ALUGUEL,
                from: '2026-10-01',
                to: '2026-10-31',
            });

            const where = findManyArgs().where as {
                companyId: number;
                category: string;
                date: { gte: Date; lte: Date };
            };
            expect(where.companyId).toBe(7);
            expect(where.category).toBe(ExpenseCategory.ALUGUEL);
            expect(where.date.gte).toEqual(new Date('2026-10-01'));
            expect(where.date.lte).toEqual(new Date('2026-10-31'));
        });

        it('busca pelo nome quando há termo', async () => {
            await service.listAll(7, { search: 'aluguel' });

            const where = findManyArgs().where as {
                name: { contains: string; mode: string };
            };
            expect(where.name).toEqual({
                contains: 'aluguel',
                mode: 'insensitive',
            });
        });
    });

    describe('summary', () => {
        it('agrega com o mesmo where (empresa + filtros) e devolve total como string', async () => {
            $transaction.mockResolvedValueOnce([
                { _sum: { amount: '1500' }, _count: 3 },
                [{ category: ExpenseCategory.ALUGUEL, _sum: { amount: '1500' }, _count: 3 }],
            ]);

            const result = await service.summary(7, {
                category: ExpenseCategory.ALUGUEL,
            });

            const aggWhere = aggregate.mock.calls[0][0].where as {
                companyId: number;
                category: string;
            };
            expect(aggWhere.companyId).toBe(7);
            expect(aggWhere.category).toBe(ExpenseCategory.ALUGUEL);
            expect(result.totalAmount).toBe('1500');
            expect(result.count).toBe(3);
            expect(result.byCategory).toHaveLength(1);
        });

        it('sem lançamentos, total vira "0"', async () => {
            $transaction.mockResolvedValueOnce([
                { _sum: { amount: null }, _count: 0 },
                [],
            ]);

            const result = await service.summary(7, {});
            expect(result.totalAmount).toBe('0');
            expect(result.count).toBe(0);
            expect(result.byCategory).toEqual([]);
        });
    });

    describe('findById', () => {
        it('usa findFirst com id + companyId e 404 quando não acha', async () => {
            findFirst.mockResolvedValue(null);

            await expect(service.findById(5, 7)).rejects.toBeInstanceOf(
                NotFoundException,
            );
            expect(findFirst.mock.calls[0][0].where).toEqual({
                id: 5,
                companyId: 7,
            });
        });
    });

    describe('create', () => {
        it('grava com a empresa do token', async () => {
            create.mockResolvedValue({ id: 1 });

            await service.create(
                { name: 'Aluguel', amount: 3500, category: ExpenseCategory.ALUGUEL },
                7,
            );

            expect(create.mock.calls[0][0].data).toMatchObject({
                name: 'Aluguel',
                amount: 3500,
                category: ExpenseCategory.ALUGUEL,
                companyId: 7,
            });
        });
    });
});
