import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    Query,
    ParseIntPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireTenantGuard } from '../auth/guards/require-tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type {
    JwtPayload,
    TenantJwtPayload,
} from '../auth/interfaces/jwt-payload.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // Só faz sentido para quem é usuário de escritório: o `sub` da sessão da
    // plataforma é id de outra tabela e apontaria para o usuário errado.
    @Get('me')
    @UseGuards(RequireTenantGuard)
    @ApiOperation({ summary: 'Dados do usuário autenticado' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 403, description: 'Sessão da plataforma' })
    findMe(@CurrentTenant() user: TenantJwtPayload) {
        return this.usersService.findById(user.sub);
    }

    // Lista enxuta dos colegas do escritório (id/nome/papel) — para o picker de
    // advogado responsável. Qualquer usuário do tenant pode ler.
    @Get('colleagues')
    @UseGuards(RequireTenantGuard)
    @ApiOperation({ summary: 'Colegas do escritório (para seletores)' })
    @ApiResponse({ status: 200 })
    listColleagues(@CurrentTenant() user: TenantJwtPayload) {
        return this.usersService.listColleagues(user.companyId);
    }

    // A empresa vem do token, nunca da URL: antes essa rota era
    // GET /users/company/:companyId e bastava trocar o número para ler os
    // usuários de outro escritório. A plataforma, que não tem empresa, é a
    // única que informa companyId — é assim que ela administra um escritório.
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiQuery({
        name: 'companyId',
        required: false,
        type: Number,
        description:
            'Apenas para a sessão da plataforma, que não tem empresa própria. Um ADMIN que informar outra empresa recebe 403.',
    })
    @ApiOperation({ summary: 'Lista usuários de uma empresa (apenas ADMIN)' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 400, description: 'companyId não informado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    listByCompany(
        @CurrentUser() actor: JwtPayload,
        @Query('companyId', new ParseIntPipe({ optional: true }))
        companyId?: number,
    ) {
        return this.usersService.listByCompany(actor, companyId);
    }

    // Antes de ':id' e de 'me/password' — rota literal precede a parametrizada.
    @Patch('me')
    @UseGuards(RequireTenantGuard)
    @ApiOperation({ summary: 'Editar o próprio perfil (nome e foto)' })
    @ApiResponse({ status: 200, description: 'Perfil atualizado' })
    @ApiResponse({ status: 403, description: 'Sessão da plataforma' })
    updateProfile(
        @CurrentTenant() user: TenantJwtPayload,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(user.sub, dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Atualizar nome ou role do usuário (apenas ADMIN)',
    })
    @ApiResponse({ status: 200, description: 'Usuário atualizado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.usersService.update(id, dto, actor);
    }

    @Patch('me/password')
    @UseGuards(RequireTenantGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Trocar a própria senha' })
    @ApiResponse({ status: 204, description: 'Senha alterada com sucesso' })
    @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
    @ApiResponse({
        status: 403,
        description:
            'Sessão da plataforma — use PATCH /auth/platform/me/password',
    })
    changePassword(
        @CurrentTenant() user: TenantJwtPayload,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(user.sub, dto);
    }
}
