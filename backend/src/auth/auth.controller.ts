import {
    Controller,
    Post,
    Patch,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { PlatformAdminService } from '../platform-admin/platform-admin.service';
import { LoginDto } from './dto/login.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PlatformGuard } from './guards/platform.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentPlatform } from './decorators/current-platform.decorator';
import { UserRole } from './enums/user-role.enum';
import type {
    JwtPayload,
    PlatformJwtPayload,
} from './interfaces/jwt-payload.interface';

@ApiTags('auth') // Nome que vai definir o grupo de rotas no Swagger UI
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly platformAdminService: PlatformAdminService,
    ) {}

    // Rotas públicas: um teto apertado por IP freia força bruta de senha.
    @Throttle({ default: { limit: 8, ttl: 60000 } })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Autenticar usuário de um escritório' })
    @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
    @ApiResponse({
        status: 401,
        description: 'Credenciais inválidas ou empresa inativa',
    })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Throttle({ default: { limit: 8, ttl: 60000 } })
    @Post('platform/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Autenticar o administrador da plataforma (não pede empresa)',
    })
    @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
    @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
    loginPlatform(@Body() dto: PlatformLoginDto) {
        return this.authService.loginPlatform(dto);
    }

    @Post('register')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary:
            'Criar usuário (ADMIN cria na própria empresa; a plataforma informa companyId)',
    })
    @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
    @ApiResponse({ status: 400, description: 'companyId não informado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 409, description: 'Login já em uso' })
    register(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtPayload) {
        return this.authService.register(dto, actor);
    }

    @Patch('platform/me/password')
    @UseGuards(JwtAuthGuard, PlatformGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Trocar a senha do administrador da plataforma' })
    @ApiResponse({ status: 204, description: 'Senha alterada com sucesso' })
    @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    changePlatformPassword(
        @CurrentPlatform() actor: PlatformJwtPayload,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.platformAdminService.changePassword(actor.sub, dto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Retorna dados da sessão autenticada' })
    @ApiResponse({ status: 200, description: 'Dados do token JWT' })
    me(@CurrentUser() user: JwtPayload) {
        return user;
    }
}
