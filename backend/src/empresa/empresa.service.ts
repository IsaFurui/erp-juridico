import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';

@Injectable()
export class EmpresaService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CriarEmpresaDto) {
        const cnpj = dto.cnpj.replace(/\D/g, '');

        const existing = await this.prisma.empresa.findUnique({
            where: { EmpCnpj: cnpj },
        });

        if (existing) throw new ConflictException('CNPJ já cadastrado');

        return this.prisma.empresa.create({
            data: {
                EmpNome: dto.nome,
                EmpCnpj: cnpj,
            },
            select: {
                EmpId: true,
                EmpNome: true,
                EmpCnpj: true,
                EmpStatus: true,
                EmpDataCadastro: true,
            },
        });
    }

    listAll() {
        return this.prisma.empresa.findMany();
    }

    async findById(EmpId: number) {
        const empresa = await this.prisma.empresa.findUnique({
            where: { EmpId },
        });
        if (!empresa) throw new NotFoundException('Empresa não encontrada');
        return empresa;
    }

    async updateNome(id: number, dto: AtualizarEmpresaDto) {
        await this.findById(id);
        return this.prisma.empresa.update({
            where: { EmpId: id },
            data: { EmpNome: dto.nome },
            select: {
                EmpId: true,
                EmpNome: true,
                EmpCnpj: true,
                EmpStatus: true,
                EmpDataCadastro: true,
            },
        });
    }
}
