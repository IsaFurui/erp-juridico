import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const PUBLIC_SELECT = {
    id: true,
    name: true,
    cpfCnpj: true,
    createdAt: true,
    active: true,
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

    listAll(includeInactive = false) {
        return this.prisma.client.findMany({
            where: includeInactive ? undefined : { active: true },
            select: PUBLIC_SELECT,
        });
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
        if (dto.cpfCnpj !== undefined) data.cpfCnpj = dto.cpfCnpj.replace(/\D/g, '');

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
