import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('DashboardService', () => {
    const processStatus = { findMany: jest.fn() };
    const process = { groupBy: jest.fn(), count: jest.fn(), aggregate: jest.fn() };
    const processStatusHistory = { count: jest.fn(), findMany: jest.fn() };
    const client = { count: jest.fn() };
    const expense = { aggregate: jest.fn(), groupBy: jest.fn() };
    const $transaction = jest.fn();

    const prisma = {
        processStatus,
        process,
        processStatusHistory,
        client,
        expense,
        $transaction,
    } as unknown as PrismaService;

    const service = new DashboardService(prisma);

    const base = [
        [
            { id: 1, description: 'Em andamento', isFinal: false },
            { id: 2, description: 'Arquivado', isFinal: true },
        ],
        [
            { statusId: 1, _count: { _all: 5 } },
            { statusId: 2, _count: { _all: 2 } },
        ],
        5, // openProcesses
        8, // activeClients
        { _sum: { totalAmount: '1000' } }, // inProgress
        [], // recent
        [{ processId: 10 }, { processId: 11 }], // closed this month (distinct)
    ];
    const finance = [
        { _sum: { amount: '300' } },
        [{ category: 'ALUGUEL', _sum: { amount: '300' } }],
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Soma do que entrou nos processos encerrados do mês.
        process.aggregate.mockResolvedValue({ _sum: { totalAmount: '7500' } });
    });

    it('escopa tudo pela empresa e ordena os status pela contagem', async () => {
        $transaction.mockResolvedValueOnce(base).mockResolvedValueOnce(finance);

        const result = await service.get(7, UserRole.ADMIN);

        expect(process.count.mock.calls[0][0].where.companyId).toBe(7);
        expect(client.count.mock.calls[0][0].where.companyId).toBe(7);
        expect(result.processesByStatus[0]).toMatchObject({
            statusId: 1,
            description: 'Em andamento',
            count: 5,
        });
        expect(result.amountInProgress).toBe('1000');
    });

    it('conta e soma os processos encerrados no mês', async () => {
        $transaction.mockResolvedValueOnce(base).mockResolvedValueOnce(finance);

        const result = await service.get(7, UserRole.ADMIN);

        expect(result.closedThisMonth).toBe(2);
        expect(result.earnedThisMonth).toBe('7500');
        // A soma do que entrou é escopada pela empresa e pelos processos encerrados.
        const earnedWhere = process.aggregate.mock.calls.at(-1)?.[0].where;
        expect(earnedWhere.companyId).toBe(7);
        expect(earnedWhere.id).toEqual({ in: [10, 11] });
    });

    it('inclui o financeiro para ADMIN', async () => {
        $transaction.mockResolvedValueOnce(base).mockResolvedValueOnce(finance);

        const result = await service.get(7, UserRole.ADMIN);

        expect(result.finance).not.toBeNull();
        expect(result.finance?.expensesThisMonth).toBe('300');
        expect(expense.aggregate).toHaveBeenCalled();
    });

    it('omite o financeiro para OPERACIONAL (null, sem consultar despesas)', async () => {
        $transaction.mockResolvedValueOnce(base);

        const result = await service.get(7, UserRole.OPERACIONAL);

        expect(result.finance).toBeNull();
        expect(expense.aggregate).not.toHaveBeenCalled();
    });
});
