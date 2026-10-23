import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { isPlatform } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) return true;

        const { user } = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        // O dono da plataforma passa em qualquer @Roles — os papéis descrevem
        // cargos dentro de um escritório, e ele está acima disso. Passar no
        // guard não dá acesso a dado de escritório nenhum: as rotas com dado
        // de tenant exigem um companyId explícito (ver RequireTenantGuard).
        if (isPlatform(user)) return true;

        return requiredRoles.includes(user.role);
    }
}
