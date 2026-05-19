import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsuRole } from '../../generated/prisma/enums';

interface CreateUserInput {
  nome: string;
  login: string;
  senhaHash: string;
  role?: UsuRole;
  empId: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByLogin(empId: number, login: string) {
    return this.prisma.usuario.findUnique({
      where: { EmpId_UsuLogin: { EmpId: empId, UsuLogin: login } },
    });
  }

  findById(id: number) {
    return this.prisma.usuario.findUnique({ where: { UsuId: id } });
  }

  create(input: CreateUserInput) {
    return this.prisma.usuario.create({
      data: {
        UsuNome: input.nome,
        UsuLogin: input.login,
        UsuSenhaHash: input.senhaHash,
        UsuRole: input.role ?? UsuRole.OPERACIONAL,
        EmpId: input.empId,
      },
      select: {
        UsuId: true,
        UsuNome: true,
        UsuLogin: true,
        UsuRole: true,
        EmpId: true,
      },
    });
  }

  findAllByEmpresa(empId: number) {
    return this.prisma.usuario.findMany({
      where: { EmpId: empId },
      select: {
        UsuId: true,
        UsuNome: true,
        UsuLogin: true,
        UsuRole: true,
        EmpId: true,
      },
    });
  }
}
