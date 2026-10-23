import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlatformGuard } from './platform.guard';
import { RequireTenantGuard } from './require-tenant.guard';
import { UserRole } from '../enums/user-role.enum';
import { JwtPayload, TokenScope } from '../interfaces/jwt-payload.interface';

const tenantSession: JwtPayload = {
    scope: TokenScope.TENANT,
    sub: 1,
    login: 'admin.a',
    role: UserRole.ADMIN,
    companyId: 1,
    companyName: 'Escritório A',
};

const platformSession: JwtPayload = {
    scope: TokenScope.PLATFORM,
    sub: 1,
    login: 'root',
};

function contextFor(user: JwtPayload): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
}

describe('PlatformGuard', () => {
    const guard = new PlatformGuard();

    it('deixa passar a sessão da plataforma', () => {
        expect(guard.canActivate(contextFor(platformSession))).toBe(true);
    });

    it('barra um ADMIN de escritório', () => {
        expect(() => guard.canActivate(contextFor(tenantSession))).toThrow(
            ForbiddenException,
        );
    });
});

describe('RequireTenantGuard', () => {
    const guard = new RequireTenantGuard();

    it('deixa passar a sessão de escritório', () => {
        expect(guard.canActivate(contextFor(tenantSession))).toBe(true);
    });

    // A plataforma não tem empresa: em rota de dado de escritório ela não
    // teria o que ler, e escolher uma empresa por conta própria seria pior.
    it('barra a sessão da plataforma', () => {
        expect(() => guard.canActivate(contextFor(platformSession))).toThrow(
            ForbiddenException,
        );
    });
});
