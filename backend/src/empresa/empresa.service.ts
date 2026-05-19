import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmpresaDto) {
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
}
