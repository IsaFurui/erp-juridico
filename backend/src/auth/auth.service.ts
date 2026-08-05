import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from './enums/user-role.enum';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {}

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

        const payload: JwtPayload = {
            sub: user.id,
            login: user.login,
            role: user.role as UserRole,
            companyId: user.companyId,
            companyName: user.company.name,
        };

        return { access_token: this.jwtService.sign(payload) };
    }

    async register(dto: CreateUserDto) {
        const existing = await this.usersService.findByLogin(
            dto.companyId,
            dto.login,
        );
        if (existing)
            throw new ConflictException('Login já em uso nesta empresa');

        const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        return this.usersService.create({ ...dto, passwordHash: hash });
    }
}
