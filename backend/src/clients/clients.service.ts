import {
    Injectable,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UserRole } from '../auth/enums/user-role.enum';
import type { TenantJwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { Prisma } from '../../generated/prisma/client';
import {
    buildPaginated,
    resolvePagination,
    type Paginated,
} from '../common/paginated';

const PUBLIC_SELECT = {
    id: true,
    name: true,
    cpfCnpj: true,
    createdAt: true,
    active: true,
};

type ClientListItem = {
    id: number;
    name: string;
    cpfCnpj: string;
    createdAt: Date;
    active: boolean;
};

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateClientDto, companyId: number) {
        const cpfCnpj = dto.cpfCnpj.replace(/\D/g, '');

        const existing = await this.prisma.client.findFirst({
            where: { cpfCnpj, companyId },
        });
        if (existing) throw new ConflictException('CPF/CNPJ já cadastrado');

        return this.prisma.client.create({
            data: { name: dto.name, cpfCnpj, companyId },
            select: PUBLIC_SELECT,
        });
    }

    /**
     * A empresa sai do token de quem chama — sem ela a listagem devolveria a
     * carteira de clientes de todos os escritórios.
     */
    async listAll(
        actor: TenantJwtPayload,
        query: ListClientsQueryDto,
    ): Promise<Paginated<ClientListItem>> {
        if (query.includeInactive && actor.role !== UserRole.ADMIN) {
            throw new ForbiddenException(
                'Apenas ADMIN pode listar clientes inativos',
            );
        }

        const where = this.buildListWhere(actor.companyId, query);
        const { page, pageSize, skip, take } = resolvePagination(
            query.page,
            query.pageSize,
        );

        const [items, total] = await this.prisma.$transaction([
            this.prisma.client.findMany({
                where,
                select: PUBLIC_SELECT,
                orderBy: { name: 'asc' },
                skip,
                take,
            }),
            this.prisma.client.count({ where }),
        ]);

        return buildPaginated(items, total, page, pageSize);
    }

    private buildListWhere(
        companyId: number,
        query: ListClientsQueryDto,
    ): Prisma.ClientWhereInput {
        const where: Prisma.ClientWhereInput = {
            companyId,
            ...(query.includeInactive ? {} : { active: true }),
        };

        const term = query.search?.trim();
        if (!term) return where;

        // Busca por nome ou por documento. O CPF/CNPJ é guardado só com
        // dígitos, então "12.345" precisa virar "12345" para casar.
        const digits = term.replace(/\D/g, '');
        where.OR = [
            { name: { contains: term, mode: 'insensitive' } },
            ...(digits ? [{ cpfCnpj: { contains: digits } }] : []),
        ];

        return where;
    }

    async findById(id: number, companyId: number) {
        const client = await this.prisma.client.findUnique({
            where: { id, companyId },
            select: PUBLIC_SELECT,
        });
        if (!client) throw new NotFoundException('Cliente não encontrado');
        return client;
    }

    async update(id: number, dto: UpdateClientDto, companyId: number) {
        await this.findById(id, companyId);

        const data: { name?: string; cpfCnpj?: string } = {};
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.cpfCnpj !== undefined)
            data.cpfCnpj = dto.cpfCnpj.replace(/\D/g, '');

        return this.prisma.client.update({
            where: { id },
            data,
            select: PUBLIC_SELECT,
        });
    }

    async deactivate(id: number, companyId: number) {
        await this.findById(id, companyId);
        await this.prisma.client.update({
            where: { id },
            data: { active: false },
        });
    }

    async activate(id: number, companyId: number) {
        await this.findById(id, companyId);
        return this.prisma.client.update({
            where: { id },
            data: { active: true },
            select: PUBLIC_SELECT,
        });
    }
}
