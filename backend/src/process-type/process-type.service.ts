import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessTypeDto } from './dto/create-process-type.dto';
import { UpdateProcessTypeDto } from './dto/update-process-type.dto';
import { CreateProcessSubtypeDto } from './dto/create-process-subtype.dto';
import { UpdateProcessSubtypeDto } from './dto/update-process-subtype.dto';

@Injectable()
export class ProcessTypeService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateProcessTypeDto) {
        const existing = await this.prisma.processType.findUnique({
            where: { name: dto.name },
        });
        if (existing) throw new ConflictException('Tipo já cadastrado');

        return this.prisma.processType.create({
            data: {
                name: dto.name,
                ...(dto.defaultConfidential !== undefined && {
                    defaultConfidential: dto.defaultConfidential,
                }),
            },
        });
    }

    listAll() {
        return this.prisma.processType.findMany();
    }

    async findById(id: number) {
        const type = await this.prisma.processType.findUnique({
            where: { id },
        });
        if (!type) throw new NotFoundException('Tipo não encontrado');
        return type;
    }

    async listSubtypes(typeId: number) {
        await this.findById(typeId);
        return this.prisma.processSubtype.findMany({
            where: { processTypeId: typeId },
            orderBy: { name: 'asc' },
        });
    }

    async update(id: number, dto: UpdateProcessTypeDto) {
        await this.findById(id);

        return this.prisma.processType.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.defaultConfidential !== undefined && {
                    defaultConfidential: dto.defaultConfidential,
                }),
            },
        });
    }

    async remove(id: number) {
        await this.findById(id);
        return this.prisma.processType.delete({ where: { id } });
    }

    // ---------- subtipos ----------

    async createSubtype(typeId: number, dto: CreateProcessSubtypeDto) {
        await this.findById(typeId);

        const existing = await this.prisma.processSubtype.findUnique({
            where: {
                processTypeId_name: { processTypeId: typeId, name: dto.name },
            },
        });
        if (existing) {
            throw new ConflictException('Subtipo já cadastrado neste tipo');
        }

        return this.prisma.processSubtype.create({
            data: { processTypeId: typeId, name: dto.name },
        });
    }

    async updateSubtype(
        typeId: number,
        subtypeId: number,
        dto: UpdateProcessSubtypeDto,
    ) {
        await this.ensureSubtypeOfType(typeId, subtypeId);

        return this.prisma.processSubtype.update({
            where: { id: subtypeId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
            },
        });
    }

    async removeSubtype(typeId: number, subtypeId: number) {
        await this.ensureSubtypeOfType(typeId, subtypeId);
        return this.prisma.processSubtype.delete({ where: { id: subtypeId } });
    }

    private async ensureSubtypeOfType(typeId: number, subtypeId: number) {
        await this.findById(typeId);
        const subtype = await this.prisma.processSubtype.findUnique({
            where: { id: subtypeId },
        });
        // 404 também quando o subtipo existe mas é de outro tipo.
        if (!subtype || subtype.processTypeId !== typeId) {
            throw new NotFoundException('Subtipo não encontrado');
        }
        return subtype;
    }
}
