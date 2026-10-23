import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CompanyService } from '../company/company.service';
import { PlatformAdminService } from '../platform-admin/platform-admin.service';
import { UserRole } from './enums/user-role.enum';
import { JwtPayload, TokenScope } from './interfaces/jwt-payload.interface';

const admin = (companyId: number): JwtPayload => ({
    scope: TokenScope.TENANT,
    sub: 1,
    login: 'admin',
    role: UserRole.ADMIN,
    companyId,
    companyName: 'Escritório',
});

const platform: JwtPayload = {
    scope: TokenScope.PLATFORM,
    sub: 1,
    login: 'root',
};

const baseDto = {
    name: 'Novo Usuário',
    login: 'novo.usuario',
    password: 'senha123',
};

// Regressão: o companyId vinha do body, então um ADMIN criava um ADMIN
// dentro de outro escritório só mudando o número no payload.
describe('AuthService.register — empresa vem do token', () => {
    const findByLogin = jest.fn();
    const create = jest.fn();
    const findById = jest.fn();

    const usersService = { findByLogin, create } as unknown as UsersService;
    const companyService = { findById } as unknown as CompanyService;
    const platformAdminService = {} as unknown as PlatformAdminService;
    const jwtService = { sign: jest.fn() } as unknown as JwtService;

    const service = new AuthService(
        usersService,
        companyService,
        platformAdminService,
        jwtService,
    );

    beforeEach(() => {
        findByLogin.mockReset().mockResolvedValue(null);
        create.mockReset().mockResolvedValue({ id: 10 });
        findById.mockReset().mockResolvedValue({ id: 2 });
    });

    it('usa a empresa do token quando o body não manda nenhuma', async () => {
        await service.register({ ...baseDto }, admin(1));

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ companyId: 1 }),
        );
    });

    it('recusa ADMIN criando usuário em outra empresa', async () => {
        await expect(
            service.register({ ...baseDto, companyId: 2 }, admin(1)),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(create).not.toHaveBeenCalled();
    });

    it('aceita a própria empresa repetida no body', async () => {
        await service.register({ ...baseDto, companyId: 1 }, admin(1));

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ companyId: 1 }),
        );
    });

    // A plataforma não tem empresa própria — sem companyId não há onde criar.
    it('exige companyId da plataforma', async () => {
        await expect(
            service.register({ ...baseDto }, platform),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(create).not.toHaveBeenCalled();
    });

    it('a plataforma cria o primeiro ADMIN de um escritório novo', async () => {
        await service.register(
            { ...baseDto, companyId: 2, role: UserRole.ADMIN },
            platform,
        );

        // valida que a empresa existe antes de deixar a FK estourar em 500
        expect(findById).toHaveBeenCalledWith(2);
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ companyId: 2, role: UserRole.ADMIN }),
        );
    });
});

describe('AuthService.login — empresa inativa', () => {
    const PASSWORD = 'senha123';
    let passwordHash: string;

    const findByLogin = jest.fn();
    const usersService = {
        findByLogin,
        create: jest.fn(),
    } as unknown as UsersService;
    const companyService = { findById: jest.fn() } as unknown as CompanyService;
    const platformAdminService = {} as unknown as PlatformAdminService;
    const sign = jest.fn().mockReturnValue('token');
    const jwtService = { sign } as unknown as JwtService;

    const service = new AuthService(
        usersService,
        companyService,
        platformAdminService,
        jwtService,
    );

    // Hash de verdade: com um hash inventado o bcrypt recusaria a senha e o
    // teste passaria pelo motivo errado.
    beforeAll(async () => {
        passwordHash = await bcrypt.hash(PASSWORD, 4);
    });

    beforeEach(() => {
        findByLogin.mockReset();
        sign.mockClear();
    });

    function userOfCompany(active: boolean) {
        return {
            id: 1,
            login: 'joao',
            passwordHash,
            role: UserRole.ADMIN,
            companyId: 1,
            company: { name: 'Escritório', active },
        };
    }

    // Sem isso o botão "inativar empresa" só marcava uma flag: todos os
    // usuários do escritório continuavam entrando normalmente.
    it('recusa login com a senha certa quando a empresa está inativa', async () => {
        findByLogin.mockResolvedValue(userOfCompany(false));

        await expect(
            service.login({ companyId: 1, login: 'joao', password: PASSWORD }),
        ).rejects.toThrow('Empresa inativa');
        expect(sign).not.toHaveBeenCalled();
    });

    it('emite token com a empresa ativa', async () => {
        findByLogin.mockResolvedValue(userOfCompany(true));

        await expect(
            service.login({ companyId: 1, login: 'joao', password: PASSWORD }),
        ).resolves.toEqual({ access_token: 'token' });
        expect(sign).toHaveBeenCalledWith(
            expect.objectContaining({ scope: 'tenant', companyId: 1 }),
        );
    });
});
