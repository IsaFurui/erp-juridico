import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Decorator customizado para pegar o usuário autenticado do request
// Aqui se cria um decorator chamado CurrentUser
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        return request.user;
    },
);
