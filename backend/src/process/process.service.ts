import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ChangeProcessStatusDto } from './dto/change-process-status.dto';
import { ListProcessesQueryDto } from './dto/list-processes-query.dto';
import type { Prisma } from '../../generated/prisma/client';
import { Confidentiality } from './enums/confidentiality.enum';
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
    confidentiality: true,
    createdAt: true,
    updatedAt: true,
    client: { select: { id: true, name: true } },
    type: { select: { id: true, name: true } },
    subtype: { select: { id: true, name: true } },
    responsible: { select: { id: true, name: true } },
    status: { select: { id: true, description: true, isFinal: true } },
};

// Detalhe inclui o histórico de status (do mais recente para o mais antigo),
// com quem mudou e a observação.
const DETAIL_SELECT = {
    ...PUBLIC_SELECT,
    statusHistory: {
        select: {
            id: true,
            changedAt: true,
            note: true,
            status: { select: { id: true, description: true, isFinal: true } },
            user: { select: { id: true, name: true } },
        },
        orderBy: { changedAt: 'desc' as const },
    },
};

@Injectable()
export class ProcessService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async create(dto: CreateProcessDto, companyId: number, userId: number) {
        await this.ensureClient(dto.clientId, companyId);
        const type = await this.ensureType(dto.typeId);
        const status = await this.ensureStatus(dto.statusId);
        if (dto.subtypeId != null) {
            await this.ensureSubtype(dto.subtypeId, dto.typeId);
        }
        if (dto.responsibleId != null) {
            await this.ensureResponsible(dto.responsibleId, companyId);
        }
        await this.ensureCodeAvailable(dto.code);

        // O Total só é manual quando o processo nasce já encerrado; senão é
        // derivado de Entrada + Esperado.
        const totalAmount =
            status.isFinal && dto.totalAmount != null
                ? dto.totalAmount
                : this.computeTotal(dto.fixedAmount, dto.expectedAmount);

        // Sigilo é estado do processo: o tipo só dá o valor inicial. Quando a
        // API não envia confidentiality, herda o defaultConfidential do tipo.
        const confidentiality =
            dto.confidentiality ??
            (type.defaultConfidential
                ? Confidentiality.CONFIDENTIAL
                : Confidentiality.PUBLIC);

        // Transação: o processo e a primeira linha do histórico nascem juntos.
        const process = await this.prisma.$transaction(async (tx) => {
            const process = await tx.process.create({
                data: {
                    name: dto.name,
                    code: dto.code,
                    companyId,
                    clientId: dto.clientId,
                    typeId: dto.typeId,
                    statusId: dto.statusId,
                    subtypeId: dto.subtypeId ?? null,
                    responsibleId: dto.responsibleId ?? null,
                    fixedAmount: dto.fixedAmount ?? null,
                    expectedAmount: dto.expectedAmount ?? null,
                    totalAmount,
                    confidentiality,
                },
                select: PUBLIC_SELECT,
            });

            await tx.processStatusHistory.create({
                data: {
                    processId: process.id,
                    statusId: dto.statusId,
                    userId,
                    note: 'Processo criado',
                },
            });

            return process;
        });

        await this.notifications.notifyCompany({
            companyId,
            actorId: userId,
            type: 'PROCESS_CREATED',
            message: `Novo processo: ${process.name}`,
            processId: process.id,
        });

        return process;
    }

    /** Total previsto quando o processo está em andamento. */
    private computeTotal(
        fixed?: number | null,
        expected?: number | null,
    ): number {
        return Number(fixed ?? 0) + Number(expected ?? 0);
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
            select: DETAIL_SELECT,
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
        if (dto.subtypeId != null) {
            const effectiveTypeId = dto.typeId ?? current.type.id;
            await this.ensureSubtype(dto.subtypeId, effectiveTypeId);
        }
        if (dto.responsibleId != null) {
            await this.ensureResponsible(dto.responsibleId, companyId);
        }
        if (dto.code !== undefined && dto.code !== current.code) {
            await this.ensureCodeAvailable(dto.code);
        }

        const data: Prisma.ProcessUncheckedUpdateInput = {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.code !== undefined && { code: dto.code }),
            ...(dto.clientId !== undefined && { clientId: dto.clientId }),
            ...(dto.typeId !== undefined && { typeId: dto.typeId }),
            ...(dto.subtypeId !== undefined && { subtypeId: dto.subtypeId }),
            ...(dto.responsibleId !== undefined && {
                responsibleId: dto.responsibleId,
            }),
            ...(dto.fixedAmount !== undefined && {
                fixedAmount: dto.fixedAmount,
            }),
            ...(dto.expectedAmount !== undefined && {
                expectedAmount: dto.expectedAmount,
            }),
            ...(dto.confidentiality !== undefined && {
                confidentiality: dto.confidentiality,
            }),
        };

        // O status só muda pela rota dedicada. Aqui, enquanto o processo não
        // estiver encerrado, o Total acompanha Entrada + Esperado; num processo
        // já encerrado o Total ajustado é preservado.
        if (!current.status.isFinal) {
            const newFixed =
                dto.fixedAmount ?? Number(current.fixedAmount ?? 0);
            const newExpected =
                dto.expectedAmount ?? Number(current.expectedAmount ?? 0);
            data.totalAmount = this.computeTotal(newFixed, newExpected);
        }

        return this.prisma.process.update({
            where: { id },
            data,
            select: PUBLIC_SELECT,
        });
    }

    async changeStatus(
        id: number,
        dto: ChangeProcessStatusDto,
        companyId: number,
        userId: number,
    ) {
        const current = await this.findById(id, companyId);
        const status = await this.ensureStatus(dto.statusId);

        const derived = this.computeTotal(
            Number(current.fixedAmount ?? 0),
            Number(current.expectedAmount ?? 0),
        );
        // Encerrou: o advogado pode fixar o Total que realmente entrou. Em
        // qualquer outro status o Total volta a ser o previsto.
        const totalAmount =
            status.isFinal && dto.totalAmount != null
                ? dto.totalAmount
                : derived;

        // Só é "ajuste" quando o encerramento muda de fato o Total previsto —
        // comparado em centavos para não tropeçar em ponto flutuante. Encerrar
        // mantendo o valor derivado não deve poluir o histórico com "ajustado".
        const isAdjusted =
            status.isFinal &&
            dto.totalAmount != null &&
            Math.round(dto.totalAmount * 100) !== Math.round(derived * 100);

        const note =
            dto.note ??
            (isAdjusted
                ? `Total ajustado para ${this.formatBRL(totalAmount)}`
                : null);

        await this.prisma.$transaction(async (tx) => {
            await tx.process.update({
                where: { id },
                data: { statusId: dto.statusId, totalAmount },
            });
            await tx.processStatusHistory.create({
                data: { processId: id, statusId: dto.statusId, userId, note },
            });
        });

        await this.notifications.notifyCompany({
            companyId,
            actorId: userId,
            type: 'STATUS_CHANGED',
            message: `${current.name} → ${status.description}`,
            processId: id,
        });

        return this.findById(id, companyId);
    }

    private formatBRL(value: number): string {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
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

    private async ensureResponsible(userId: number, companyId: number) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });
        if (!user) throw new BadRequestException('Responsável inválido');
    }

    private async ensureType(typeId: number) {
        const type = await this.prisma.processType.findUnique({
            where: { id: typeId },
        });
        if (!type) throw new BadRequestException('Tipo de processo inválido');
        return type;
    }

    private async ensureStatus(statusId: number) {
        const status = await this.prisma.processStatus.findUnique({
            where: { id: statusId },
        });
        if (!status) throw new BadRequestException('Status inválido');
        return status;
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
