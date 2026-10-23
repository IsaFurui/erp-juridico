import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { isPlatform } from '../interfaces/jwt-payload.interface';

/**
 * Só sessões da plataforma. Use em rotas que atravessam escritórios —
 * o módulo `company` inteiro, por exemplo.
 */
@Injectable()
export class PlatformGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        if (!isPlatform(user)) {
            throw new ForbiddenException(
                'Rota exclusiva do administrador da plataforma',
            );
        }
        return true;
    }
}
