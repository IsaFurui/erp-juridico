import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PlatformGuard } from './guards/platform.guard';
import { RequireTenantGuard } from './guards/require-tenant.guard';
import { UsersModule } from '../users/users.module';
import { CompanyModule } from '../company/company.module';
import { PlatformAdminModule } from '../platform-admin/platform-admin.module';

@Module({
    imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: config.getOrThrow('JWT_EXPIRES_IN'),
                },
            }),
        }),
        UsersModule,
        CompanyModule,
        PlatformAdminModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        PlatformGuard,
        RequireTenantGuard,
    ],
    exports: [JwtAuthGuard, RolesGuard, PlatformGuard, RequireTenantGuard],
})
export class AuthModule {}
