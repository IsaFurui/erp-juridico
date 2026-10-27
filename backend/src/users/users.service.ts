import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole as PrismaUserRole } from '../../generated/prisma/enums';
import { UserRole } from '../auth/enums/user-role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
    isPlatform,
    type JwtPayload,
} from '../auth/interfaces/jwt-payload.interface';

const SALT_ROUNDS = 12;

const PUBLIC_SELECT = {
    id: true,
    name: true,
    login: true,
    role: true,
    avatarUrl: true,
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

    findByLogin(companyId: number, login: string) {
        return this.prisma.user.findUnique({
            where: { companyId_login: { companyId, login } },
            // active entra porque o login recusa empresa inativa
            include: { company: { select: { name: true, active: true } } },
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
                role: input.role ?? PrismaUserRole.OPERACIONAL,
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

    /** Lista enxuta (id/nome/papel) dos colegas do escritório — para pickers
     * como o de advogado responsável. Acessível a qualquer usuário do tenant. */
    listColleagues(companyId: number) {
        return this.prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * A empresa alvo sai do token de quem chama. A sessão da plataforma não
     * tem empresa, então é a única que precisa — e pode — informar uma.
     */
    listByCompany(actor: JwtPayload, requestedCompanyId?: number) {
        return this.findAllByCompany(
            this.resolveCompanyId(actor, requestedCompanyId),
        );
    }

    async update(id: number, dto: UpdateUserDto, actor: JwtPayload) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        // 404 e não 403: para um ADMIN de outro escritório, esse usuário
        // simplesmente não existe — responder 403 confirmaria que existe.
        if (!isPlatform(actor) && user.companyId !== actor.companyId) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.role && { role: dto.role }),
            },
            select: PUBLIC_SELECT,
        });
    }

    /** O próprio usuário edita nome e foto. O id vem do token, não do body. */
    async updateProfile(id: number, dto: UpdateProfileDto) {
        return this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.avatarUrl !== undefined && {
                    // String vazia remove a foto.
                    avatarUrl: dto.avatarUrl === '' ? null : dto.avatarUrl,
                }),
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

    private resolveCompanyId(
        actor: JwtPayload,
        requestedCompanyId?: number,
    ): number {
        if (isPlatform(actor)) {
            if (requestedCompanyId === undefined) {
                throw new BadRequestException(
                    'Informe companyId: o administrador da plataforma não tem empresa própria',
                );
            }
            return requestedCompanyId;
        }

        if (
            requestedCompanyId !== undefined &&
            requestedCompanyId !== actor.companyId
        ) {
            throw new ForbiddenException(
                'Não é possível ler usuários de outra empresa',
            );
        }
        return actor.companyId;
    }
}
