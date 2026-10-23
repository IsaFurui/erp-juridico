import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, TokenScope } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
        });
    }

    validate(payload: JwtPayload): JwtPayload {
        if (!payload.sub) throw new UnauthorizedException();

        // Token sem escopo é anterior à separação entre plataforma e
        // escritório — recusar força um login novo em vez de deixar um
        // payload ambíguo circular pelos guards.
        if (
            payload.scope !== TokenScope.TENANT &&
            payload.scope !== TokenScope.PLATFORM
        ) {
            throw new UnauthorizedException('Sessão inválida, entre de novo');
        }

        if (
            payload.scope === TokenScope.TENANT &&
            typeof payload.companyId !== 'number'
        ) {
            throw new UnauthorizedException('Sessão inválida, entre de novo');
        }

        return payload;
    }
}
