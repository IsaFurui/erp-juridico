import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { isTenant } from '../interfaces/jwt-payload.interface';

/**
 * Só sessões de escritório. O token da plataforma não tem empresa, então em
 * rotas de dado de tenant ele não teria o que ler — recusar explicitamente é
 * melhor que escolher uma empresa por conta própria.
 */
@Injectable()
export class RequireTenantGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        if (!isTenant(user)) {
            throw new ForbiddenException(
                'Esta rota é de dados de um escritório; entre com um usuário da empresa',
            );
        }
        return true;
    }
}
