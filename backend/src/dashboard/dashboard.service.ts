import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../auth/enums/user-role.enum';

/** Início do mês corrente e do mês seguinte (hora local do servidor). */
function monthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, next };
}

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async get(companyId: number, role: UserRole) {
        const { start, next } = monthRange();

        const [
            statuses,
            byStatus,
            openProcesses,
            activeClients,
            inProgress,
            recent,
            closed,
        ] = await this.prisma.$transaction([
            this.prisma.processStatus.findMany({
                select: { id: true, description: true, isFinal: true },
            }),
            this.prisma.process.groupBy({
                by: ['statusId'],
                where: { companyId },
                _count: { _all: true },
                orderBy: { statusId: 'asc' },
            }),
            this.prisma.process.count({
                where: { companyId, status: { isFinal: false } },
            }),
            this.prisma.client.count({ where: { companyId, active: true } }),
            this.prisma.process.aggregate({
                where: { companyId, status: { isFinal: false } },
                _sum: { totalAmount: true },
            }),
            this.prisma.processStatusHistory.findMany({
                where: { process: { companyId } },
                orderBy: { changedAt: 'desc' },
                take: 6,
                select: {
                    id: true,
                    changedAt: true,
                    note: true,
                    status: { select: { description: true, isFinal: true } },
                    process: { select: { id: true, name: true, code: true } },
                    user: { select: { name: true } },
                },
            }),
            // Processos distintos que foram encerrados neste mês (uma mudança
            // para status final), para somar o que entrou.
            this.prisma.processStatusHistory.findMany({
                where: {
                    process: { companyId },
                    status: { isFinal: true },
                    changedAt: { gte: start, lt: next },
                },
                select: { processId: true },
                distinct: ['processId'],
            }),
        ]);

        const closedIds = closed.map((h) => h.processId);
        // O Total de um processo encerrado é o valor que realmente entrou.
        const earned = await this.prisma.process.aggregate({
            where: { companyId, id: { in: closedIds } },
            _sum: { totalAmount: true },
        });

        // Junta a descrição/flag do catálogo com a contagem (só status com
        // processos aparecem), do maior para o menor.
        const statusById = new Map(statuses.map((s) => [s.id, s]));
        const processesByStatus = byStatus
            .map((g) => {
                const s = statusById.get(g.statusId);
                const count =
                    typeof g._count === 'object' ? (g._count._all ?? 0) : 0;
                return {
                    statusId: g.statusId,
                    description: s?.description ?? '—',
                    isFinal: s?.isFinal ?? false,
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);

        return {
            processesByStatus,
            openProcesses,
            closedThisMonth: closedIds.length,
            earnedThisMonth: earned._sum.totalAmount?.toString() ?? '0',
            activeClients,
            amountInProgress: inProgress._sum.totalAmount?.toString() ?? '0',
            recentActivity: recent,
            // O financeiro só vai para quem pode vê-lo; OPERACIONAL recebe null
            // e a tela esconde o card.
            finance: this.canSeeFinance(role)
                ? await this.financeBlock(companyId, start, next)
                : null,
        };
    }

    private canSeeFinance(role: UserRole): boolean {
        return role === UserRole.ADMIN || role === UserRole.FINANCEIRO;
    }

    private async financeBlock(companyId: number, start: Date, next: Date) {
        const where = { companyId, date: { gte: start, lt: next } };
        const [agg, grouped] = await this.prisma.$transaction([
            this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
            this.prisma.expense.groupBy({
                by: ['category'],
                where,
                _sum: { amount: true },
                orderBy: { category: 'asc' },
            }),
        ]);

        return {
            expensesThisMonth: agg._sum.amount?.toString() ?? '0',
            byCategory: grouped.map((g) => ({
                category: g.category,
                totalAmount: g._sum?.amount?.toString() ?? '0',
            })),
        };
    }
}
