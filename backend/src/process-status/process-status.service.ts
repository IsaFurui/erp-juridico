import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessStatusDto } from './dto/create-process-status.dto';
import { UpdateProcessStatusDto } from './dto/update-process-status.dto';

@Injectable()
export class ProcessStatusService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateProcessStatusDto) {
        const existing = await this.prisma.processStatus.findUnique({
            where: { description: dto.description },
        });

        if (existing) throw new ConflictException('Status já cadastrado');

        return this.prisma.processStatus.create({
            data: { description: dto.description },
        });
    }

    listAll() {
        return this.prisma.processStatus.findMany();
    }

    async findById(id: number) {
        const status = await this.prisma.processStatus.findUnique({
            where: { id },
        });
        if (!status) throw new NotFoundException('Status não encontrado');
        return status;
    }

    async update(id: number, dto: UpdateProcessStatusDto) {
        await this.findById(id);

        return this.prisma.processStatus.update({
            where: { id },
            data: {
                ...(dto.description !== undefined && {
                    description: dto.description,
                }),
            },
        });
    }

    async remove(id: number) {
        await this.findById(id);
        return this.prisma.processStatus.delete({ where: { id } });
    }
}
