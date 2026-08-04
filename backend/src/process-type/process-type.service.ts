import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessTypeDto } from './dto/create-process-type.dto';
import { UpdateProcessTypeDto } from './dto/update-process-type.dto';

@Injectable()
export class ProcessTypeService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateProcessTypeDto) {
        const existing = await this.prisma.processType.findUnique({
            where: { name: dto.name },
        });
        if (existing) throw new ConflictException('Tipo já cadastrado');

        return this.prisma.processType.create({
            data: { name: dto.name },
        });
    }

    listAll() {
        return this.prisma.processType.findMany();
    }

    async findById(id: number) {
        const type = await this.prisma.processType.findUnique({ where: { id } });
        if (!type) throw new NotFoundException('Tipo não encontrado');
        return type;
    }

    async update(id: number, dto: UpdateProcessTypeDto) {
        await this.findById(id);

        return this.prisma.processType.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
            },
        });
    }

    async remove(id: number) {
        await this.findById(id);
        return this.prisma.processType.delete({ where: { id } });
    }
}
