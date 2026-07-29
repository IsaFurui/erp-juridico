import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsuRole } from '../../generated/prisma/enums';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';

const SALT_ROUNDS = 12;

const PUBLIC_SELECT = {
    UsuId: true,
    UsuNome: true,
    UsuLogin: true,
    UsuRole: true,
    EmpId: true,
};

interface CreateUserInput {
    nome: string;
    login: string;
    senhaHash: string;
    role?: UsuRole;
    empId: number;
}

@Injectable()
export class UsuariosService {
    constructor(private readonly prisma: PrismaService) {}

    findByLogin(EmpId: number, UsuLogin: string) {
        return this.prisma.usuario.findUnique({
            where: { EmpId_UsuLogin: { EmpId, UsuLogin } },
        });
    }

    findById(UsuId: number) {
        return this.prisma.usuario.findUnique({
            where: { UsuId },
            select: PUBLIC_SELECT,
        });
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
            select: PUBLIC_SELECT,
        });
    }

    findAllByEmpresa(empId: number) {
        return this.prisma.usuario.findMany({
            where: { EmpId: empId },
            select: PUBLIC_SELECT,
        });
    }

    async update(UsuId: number, dto: AtualizarUsuarioDto) {
        const user = await this.prisma.usuario.findUnique({ where: { UsuId } });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        return this.prisma.usuario.update({
            where: { UsuId },
            data: {
                ...(dto.nome && { UsuNome: dto.nome }),
                ...(dto.role && { UsuRole: dto.role }),
            },
            select: PUBLIC_SELECT,
        });
    }

    async changePassword(UsuId: number, dto: AlterarSenhaDto) {
        const user = await this.prisma.usuario.findUnique({ where: { UsuId } });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        const match = await bcrypt.compare(dto.senhaAtual, user.UsuSenhaHash);
        if (!match) throw new UnauthorizedException('Senha atual incorreta');

        const hash = await bcrypt.hash(dto.novaSenha, SALT_ROUNDS);
        await this.prisma.usuario.update({
            where: { UsuId },
            data: { UsuSenhaHash: hash },
        });
    }
}
