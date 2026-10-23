import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CompanyService } from '../company/company.service';
import { PlatformAdminService } from '../platform-admin/platform-admin.service';
import { LoginDto } from './dto/login.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import {
    JwtPayload,
    TenantJwtPayload,
    PlatformJwtPayload,
    TokenScope,
    isPlatform,
} from './interfaces/jwt-payload.interface';
import { UserRole } from './enums/user-role.enum';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly companyService: CompanyService,
        private readonly platformAdminService: PlatformAdminService,
        private readonly jwtService: JwtService,
    ) {}

    /** Login de usuário de escritório: a empresa faz parte da identidade. */
    async login(dto: LoginDto): Promise<{ access_token: string }> {
        const user = await this.usersService.findByLogin(
            dto.companyId,
            dto.login,
        );

        if (!user) throw new UnauthorizedException('Credenciais inválidas');

        const passwordMatch = await bcrypt.compare(
            dto.password,
            user.passwordHash,
        );
        if (!passwordMatch)
            throw new UnauthorizedException('Credenciais inválidas');

        // Empresa inativa não entra: sem isso o botão "inativar empresa" só
        // marcava uma flag e todo mundo continuava logando.
        if (!user.company.active) {
            throw new UnauthorizedException('Empresa inativa');
        }

        const payload: TenantJwtPayload = {
            scope: TokenScope.TENANT,
            sub: user.id,
            login: user.login,
            role: user.role as UserRole,
            companyId: user.companyId,
            companyName: user.company.name,
        };

        return { access_token: this.jwtService.sign(payload) };
    }

    /** Login do dono da plataforma: não pede empresa porque não tem. */
    async loginPlatform(
        dto: PlatformLoginDto,
    ): Promise<{ access_token: string }> {
        const admin = await this.platformAdminService.findByLogin(dto.login);

        if (!admin) throw new UnauthorizedException('Credenciais inválidas');

        const passwordMatch = await bcrypt.compare(
            dto.password,
            admin.passwordHash,
        );
        if (!passwordMatch)
            throw new UnauthorizedException('Credenciais inválidas');

        if (!admin.active) throw new UnauthorizedException('Acesso suspenso');

        const payload: PlatformJwtPayload = {
            scope: TokenScope.PLATFORM,
            sub: admin.id,
            login: admin.login,
        };

        return { access_token: this.jwtService.sign(payload) };
    }

    /**
     * A empresa do novo usuário vem do token de quem chama — nunca do body.
     * A exceção é o dono da plataforma, que não tem empresa e por isso
     * precisa dizer em qual escritório está criando.
     */
    async register(dto: CreateUserDto, actor: JwtPayload) {
        const companyId = await this.resolveTargetCompany(dto, actor);

        const existing = await this.usersService.findByLogin(
            companyId,
            dto.login,
        );
        if (existing)
            throw new ConflictException('Login já em uso nesta empresa');

        const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        return this.usersService.create({
            name: dto.name,
            login: dto.login,
            role: dto.role,
            companyId,
            passwordHash: hash,
        });
    }

    private async resolveTargetCompany(
        dto: CreateUserDto,
        actor: JwtPayload,
    ): Promise<number> {
        if (isPlatform(actor)) {
            if (dto.companyId === undefined) {
                throw new BadRequestException(
                    'Informe companyId: o administrador da plataforma não tem empresa própria',
                );
            }
            // findById devolve 404 se a empresa não existe — melhor que
            // deixar a FK do Postgres estourar como 500.
            await this.companyService.findById(dto.companyId);
            return dto.companyId;
        }

        if (dto.companyId !== undefined && dto.companyId !== actor.companyId) {
            throw new ForbiddenException(
                'Não é possível criar usuário em outra empresa',
            );
        }
        return actor.companyId;
    }
}
