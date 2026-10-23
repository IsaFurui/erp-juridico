import {
    createParamDecorator,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import {
    isPlatform,
    PlatformJwtPayload,
} from '../interfaces/jwt-payload.interface';

/** `@CurrentUser()` já estreitado para a sessão da plataforma. */
export const CurrentPlatform = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): PlatformJwtPayload => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        if (!isPlatform(request.user)) {
            throw new ForbiddenException(
                'Rota exclusiva do administrador da plataforma',
            );
        }
        return request.user;
    },
);
