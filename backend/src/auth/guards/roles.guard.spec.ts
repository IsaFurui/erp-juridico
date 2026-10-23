import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';
import { JwtPayload, TokenScope } from '../interfaces/jwt-payload.interface';

const tenant = (role: UserRole): JwtPayload => ({
    scope: TokenScope.TENANT,
    sub: 1,
    login: 'usuario',
    role,
    companyId: 1,
    companyName: 'Escritório',
});

const platform: JwtPayload = {
    scope: TokenScope.PLATFORM,
    sub: 1,
    login: 'root',
};

function contextFor(user: JwtPayload): ExecutionContext {
    return {
        getHandler: () => () => undefined,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
}

function guardRequiring(roles: UserRole[] | undefined): RolesGuard {
    const reflector = {
        getAllAndOverride: () => roles,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
    it('libera rota sem @Roles', () => {
        expect(
            guardRequiring(undefined).canActivate(
                contextFor(tenant(UserRole.OPERACIONAL)),
            ),
        ).toBe(true);
    });

    it('libera o papel exigido', () => {
        expect(
            guardRequiring([UserRole.ADMIN]).canActivate(
                contextFor(tenant(UserRole.ADMIN)),
            ),
        ).toBe(true);
    });

    it('barra papel não listado', () => {
        expect(
            guardRequiring([UserRole.ADMIN]).canActivate(
                contextFor(tenant(UserRole.OPERACIONAL)),
            ),
        ).toBe(false);
    });

    // Os papéis descrevem cargos dentro de um escritório; o dono da
    // plataforma está acima deles. Passar aqui não dá acesso a dado de
    // escritório — isso é o RequireTenantGuard que decide.
    it('a sessão da plataforma passa em qualquer @Roles', () => {
        expect(
            guardRequiring([UserRole.FINANCEIRO]).canActivate(
                contextFor(platform),
            ),
        ).toBe(true);
    });
});
