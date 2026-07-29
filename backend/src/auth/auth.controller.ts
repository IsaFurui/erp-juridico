import {
    Controller,
    Post,
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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth') // Nome que vai definir o grupo de rotas no Swagger UI
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Autenticar usuário e obter JWT' }) // Descrição da rota no Swagger UI
    @ApiResponse({ status: 200, description: 'Login realizado com sucesso' }) // Descrição do status 200 no Swagger UI
    @ApiResponse({ status: 401, description: 'Credenciais inválidas' }) // Descrição do status 401 no Swagger UI
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('register')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Criar novo usuário (apenas ADMIN)' })
    @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 409, description: 'Login já em uso' })
    register(@Body() dto: CreateUserDto) {
        return this.authService.register(dto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
    @ApiResponse({ status: 200, description: 'Dados do token JWT' })
    me(@CurrentUser() user: JwtPayload) {
        return user;
    }
}
