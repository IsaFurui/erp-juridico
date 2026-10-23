import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from '../users/dto/change-password.dto';

const SALT_ROUNDS = 12;

const PUBLIC_SELECT = {
    id: true,
    name: true,
    login: true,
    active: true,
};

/**
 * Dono da plataforma. Não há `create` aqui de propósito: esse registro nasce
 * pelo seed de bootstrap, que exige acesso ao banco. Pela API não se cria nem
 * se promove ninguém a root.
 */
@Injectable()
export class PlatformAdminService {
    constructor(private readonly prisma: PrismaService) {}

    findByLogin(login: string) {
        return this.prisma.platformAdmin.findUnique({ where: { login } });
    }

    findById(id: number) {
        return this.prisma.platformAdmin.findUnique({
            where: { id },
            select: PUBLIC_SELECT,
        });
    }

    async changePassword(id: number, dto: ChangePasswordDto) {
        const admin = await this.prisma.platformAdmin.findUnique({
            where: { id },
        });
        if (!admin) throw new NotFoundException('Administrador não encontrado');

        const match = await bcrypt.compare(
            dto.currentPassword,
            admin.passwordHash,
        );
        if (!match) throw new UnauthorizedException('Senha atual incorreta');

        await this.prisma.platformAdmin.update({
            where: { id },
            data: {
                passwordHash: await bcrypt.hash(dto.newPassword, SALT_ROUNDS),
            },
        });
    }
}
