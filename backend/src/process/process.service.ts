import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ListProcessesQueryDto } from './dto/list-processes-query.dto';
import type { Prisma } from '../../generated/prisma/client';
import {
    buildPaginated,
    resolvePagination,
    type Paginated,
} from '../common/paginated';

const PUBLIC_SELECT = {
    id: true,
    name: true,
    code: true,
    fixedAmount: true,
    expectedAmount: true,
    totalAmount: true,
    createdAt: true,
    updatedAt: true,
    client: { select: { id: true, name: true } },
    type: { select: { id: true, name: true } },
    subtype: { select: { id: true, name: true } },
    status: { select: { id: true, description: true, isFinal: true } },
};

@Injectable()
export class ProcessService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateProcessDto, companyId: number) {
        await this.ensureClient(dto.clientId, companyId);
        await this.ensureType(dto.typeId);
        await this.ensureStatus(dto.statusId);
        if (dto.subtypeId != null) {
            await this.ensureSubtype(dto.subtypeId, dto.typeId);
        }
        await this.ensureCodeAvailable(dto.code);

        return this.prisma.process.create({
            data: {
                name: dto.name,
                code: dto.code,
                companyId,
                clientId: dto.clientId,
                typeId: dto.typeId,
                statusId: dto.statusId,
                subtypeId: dto.subtypeId ?? null,
                fixedAmount: dto.fixedAmount ?? null,
                expectedAmount: dto.expectedAmount ?? null,
                totalAmount: dto.totalAmount ?? 0,
            },
            select: PUBLIC_SELECT,
        });
    }

    async listAll(
        companyId: number,
        query: ListProcessesQueryDto,
    ): Promise<Paginated<unknown>> {
        const where = this.buildListWhere(companyId, query);
        const { page, pageSize, skip, take } = resolvePagination(
            query.page,
            query.pageSize,
        );

        const [items, total] = await this.prisma.$transaction([
            this.prisma.process.findMany({
                where,
                select: PUBLIC_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.process.count({ where }),
        ]);

        return buildPaginated(items, total, page, pageSize);
    }

    private buildListWhere(
        companyId: number,
        query: ListProcessesQueryDto,
    ): Prisma.ProcessWhereInput {
        const where: Prisma.ProcessWhereInput = {
            companyId,
            ...(query.statusId !== undefined && { statusId: query.statusId }),
            ...(query.typeId !== undefined && { typeId: query.typeId }),
            ...(query.clientId !== undefined && { clientId: query.clientId }),
        };

        const term = query.search?.trim();
        if (!term) return where;

        // Busca pelo nome/título ou pelo número (code) do processo.
        where.OR = [
            { name: { contains: term, mode: 'insensitive' } },
            { code: { contains: term, mode: 'insensitive' } },
        ];

        return where;
    }

    async findById(id: number, companyId: number) {
        const process = await this.prisma.process.findFirst({
            where: { id, companyId },
            select: PUBLIC_SELECT,
        });
        if (!process) throw new NotFoundException('Processo não encontrado');
        return process;
    }

    async update(id: number, dto: UpdateProcessDto, companyId: number) {
        const current = await this.findById(id, companyId);

        if (dto.clientId !== undefined) {
            await this.ensureClient(dto.clientId, companyId);
        }
        if (dto.typeId !== undefined) {
            await this.ensureType(dto.typeId);
        }
        if (dto.statusId !== undefined) {
            await this.ensureStatus(dto.statusId);
        }
        if (dto.subtypeId != null) {
            const effectiveTypeId = dto.typeId ?? current.type.id;
            await this.ensureSubtype(dto.subtypeId, effectiveTypeId);
        }
        if (dto.code !== undefined && dto.code !== current.code) {
            await this.ensureCodeAvailable(dto.code);
        }

        return this.prisma.process.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.code !== undefined && { code: dto.code }),
                ...(dto.clientId !== undefined && { clientId: dto.clientId }),
                ...(dto.typeId !== undefined && { typeId: dto.typeId }),
                ...(dto.statusId !== undefined && { statusId: dto.statusId }),
                ...(dto.subtypeId !== undefined && {
                    subtypeId: dto.subtypeId,
                }),
                ...(dto.fixedAmount !== undefined && {
                    fixedAmount: dto.fixedAmount,
                }),
                ...(dto.expectedAmount !== undefined && {
                    expectedAmount: dto.expectedAmount,
                }),
                ...(dto.totalAmount !== undefined && {
                    totalAmount: dto.totalAmount,
                }),
            },
            select: PUBLIC_SELECT,
        });
    }

    async remove(id: number, companyId: number) {
        await this.findById(id, companyId);
        await this.prisma.process.delete({ where: { id } });
    }

    private async ensureCodeAvailable(code: string) {
        const existing = await this.prisma.process.findUnique({
            where: { code },
        });
        if (existing) {
            throw new ConflictException('Código de processo já cadastrado');
        }
    }

    private async ensureClient(clientId: number, companyId: number) {
        const client = await this.prisma.client.findFirst({
            where: { id: clientId, companyId },
        });
        if (!client) throw new BadRequestException('Cliente inválido');
    }

    private async ensureType(typeId: number) {
        const type = await this.prisma.processType.findUnique({
            where: { id: typeId },
        });
        if (!type) throw new BadRequestException('Tipo de processo inválido');
    }

    private async ensureStatus(statusId: number) {
        const status = await this.prisma.processStatus.findUnique({
            where: { id: statusId },
        });
        if (!status) throw new BadRequestException('Status inválido');
    }

    private async ensureSubtype(subtypeId: number, typeId: number) {
        const subtype = await this.prisma.processSubtype.findUnique({
            where: { id: subtypeId },
        });
        if (!subtype) throw new BadRequestException('Subtipo inválido');
        if (subtype.processTypeId !== typeId) {
            throw new BadRequestException(
                'Subtipo não pertence ao tipo selecionado',
            );
        }
    }
}
