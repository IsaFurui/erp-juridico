import {
    createParamDecorator,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import {
    isTenant,
    TenantJwtPayload,
} from '../interfaces/jwt-payload.interface';

/**
 * Como `@CurrentUser()`, mas já estreitado para a sessão de escritório — é o
 * que dá o `companyId` tipado como `number` no handler. Use junto com
 * `RequireTenantGuard`; a checagem aqui é a segunda tranca, para o caso de
 * alguém esquecer o guard.
 */
export const CurrentTenant = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): TenantJwtPayload => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        if (!isTenant(request.user)) {
            throw new ForbiddenException(
                'Esta rota é de dados de um escritório; entre com um usuário da empresa',
            );
        }
        return request.user;
    },
);
