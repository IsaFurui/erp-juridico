import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../generated/prisma/enums';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SALT_ROUNDS = 12;

const PUBLIC_SELECT = {
    id: true,
    name: true,
    login: true,
    role: true,
    companyId: true,
};

interface CreateUserInput {
    name: string;
    login: string;
    passwordHash: string;
    role?: UserRole;
    companyId: number;
}

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findByLogin(companyId: number, login: string) {
        const teste = await bcrypt.hash('senha123', SALT_ROUNDS);
        console.log('Hash de teste:', teste);

        return this.prisma.user.findUnique({
            where: { companyId_login: { companyId, login } },
        });
    }

    findById(id: number) {
        return this.prisma.user.findUnique({
            where: { id },
            select: PUBLIC_SELECT,
        });
    }

    create(input: CreateUserInput) {
        return this.prisma.user.create({
            data: {
                name: input.name,
                login: input.login,
                passwordHash: input.passwordHash,
                role: input.role ?? UserRole.OPERACIONAL,
                companyId: input.companyId,
            },
            select: PUBLIC_SELECT,
        });
    }

    findAllByCompany(companyId: number) {
        return this.prisma.user.findMany({
            where: { companyId },
            select: PUBLIC_SELECT,
        });
    }

    async update(id: number, dto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        return this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.role && { role: dto.role }),
            },
            select: PUBLIC_SELECT,
        });
    }

    async changePassword(id: number, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        const match = await bcrypt.compare(
            dto.currentPassword,
            user.passwordHash,
        );
        if (!match) throw new UnauthorizedException('Senha atual incorreta');

        const hash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash: hash },
        });
    }
}
