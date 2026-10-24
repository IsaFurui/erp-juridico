import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import type { Prisma } from '../../generated/prisma/client';
import {
    buildPaginated,
    resolvePagination,
    type Paginated,
} from '../common/paginated';

const PUBLIC_SELECT = {
    id: true,
    name: true,
    amount: true,
    category: true,
    date: true,
    createdAt: true,
};

@Injectable()
export class ExpenseService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateExpenseDto, companyId: number) {
        return this.prisma.expense.create({
            data: {
                name: dto.name,
                amount: dto.amount,
                category: dto.category,
                // Sem data, a despesa é lançada com a data de hoje.
                ...(dto.date !== undefined && { date: new Date(dto.date) }),
                companyId,
            },
            select: PUBLIC_SELECT,
        });
    }

    async listAll(
        companyId: number,
        query: ListExpensesQueryDto,
    ): Promise<Paginated<unknown>> {
        const where = this.buildListWhere(companyId, query);
        const { page, pageSize, skip, take } = resolvePagination(
            query.page,
            query.pageSize,
        );

        const [items, total] = await this.prisma.$transaction([
            this.prisma.expense.findMany({
                where,
                select: PUBLIC_SELECT,
                orderBy: [{ date: 'desc' }, { id: 'desc' }],
                skip,
                take,
            }),
            this.prisma.expense.count({ where }),
        ]);

        return buildPaginated(items, total, page, pageSize);
    }

    /**
     * Totais do período/filtro corrente — a faixa de "total do período" e a
     * quebra por categoria. Usa o MESMO `where` da listagem, sem paginar.
     */
    async summary(companyId: number, query: ListExpensesQueryDto) {
        const where = this.buildListWhere(companyId, query);

        const [agg, grouped] = await this.prisma.$transaction([
            this.prisma.expense.aggregate({
                where,
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.expense.groupBy({
                by: ['category'],
                where,
                _sum: { amount: true },
                _count: true,
                orderBy: { category: 'asc' },
            }),
        ]);

        return {
            // Decimal vira string no JSON; mantemos o mesmo tipo do `amount`.
            totalAmount: agg._sum.amount?.toString() ?? '0',
            count: agg._count,
            byCategory: grouped.map((g) => ({
                category: g.category,
                totalAmount: g._sum?.amount?.toString() ?? '0',
                count: g._count,
            })),
        };
    }

    private buildListWhere(
        companyId: number,
        query: ListExpensesQueryDto,
    ): Prisma.ExpenseWhereInput {
        const where: Prisma.ExpenseWhereInput = {
            companyId,
            ...(query.category !== undefined && { category: query.category }),
        };

        // Intervalo de datas (ambos inclusivos). `date` é @db.Date, então a
        // meia-noite UTC da data informada já cobre o dia inteiro.
        if (query.from !== undefined || query.to !== undefined) {
            where.date = {
                ...(query.from !== undefined && { gte: new Date(query.from) }),
                ...(query.to !== undefined && { lte: new Date(query.to) }),
            };
        }

        const term = query.search?.trim();
        if (term) {
            where.name = { contains: term, mode: 'insensitive' };
        }

        return where;
    }

    async findById(id: number, companyId: number) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, companyId },
            select: PUBLIC_SELECT,
        });
        if (!expense) throw new NotFoundException('Despesa não encontrada');
        return expense;
    }

    async update(id: number, dto: UpdateExpenseDto, companyId: number) {
        await this.findById(id, companyId);

        const data: Prisma.ExpenseUncheckedUpdateInput = {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.amount !== undefined && { amount: dto.amount }),
            ...(dto.category !== undefined && { category: dto.category }),
            ...(dto.date !== undefined && { date: new Date(dto.date) }),
        };

        return this.prisma.expense.update({
            where: { id },
            data,
            select: PUBLIC_SELECT,
        });
    }

    async remove(id: number, companyId: number) {
        await this.findById(id, companyId);
        await this.prisma.expense.delete({ where: { id } });
    }
}
