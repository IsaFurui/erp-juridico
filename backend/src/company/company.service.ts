import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

const PUBLIC_SELECT = {
    id: true,
    name: true,
    cnpj: true,
    active: true,
    createdAt: true,
};

@Injectable()
export class CompanyService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateCompanyDto) {
        const cnpj = dto.cnpj.replace(/\D/g, '');

        const existing = await this.prisma.company.findUnique({
            where: { cnpj },
        });
        if (existing) throw new ConflictException('CNPJ já cadastrado');

        return this.prisma.company.create({
            data: { name: dto.name, cnpj },
            select: PUBLIC_SELECT,
        });
    }

    listAll() {
        return this.prisma.company.findMany({ select: PUBLIC_SELECT });
    }

    async findById(id: number) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            select: PUBLIC_SELECT,
        });
        if (!company) throw new NotFoundException('Empresa não encontrada');
        return company;
    }

    async update(id: number, dto: UpdateCompanyDto) {
        await this.findById(id);
        return this.prisma.company.update({
            where: { id },
            data: { name: dto.name },
            select: PUBLIC_SELECT,
        });
    }

    async deactivate(id: number) {
        await this.findById(id);
        await this.prisma.company.update({
            where: { id },
            data: { active: false },
        });
    }
}
