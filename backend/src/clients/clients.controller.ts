import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
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
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { TenantJwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequireTenantGuard } from '../auth/guards/require-tenant.guard';

// Dado de escritório: a sessão da plataforma não tem empresa e leva 403 aqui.
@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RequireTenantGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) {}

    @Post()
    @ApiOperation({ summary: 'Cadastrar novo cliente' })
    @ApiResponse({ status: 201, description: 'Cliente cadastrado com sucesso' })
    @ApiResponse({ status: 409, description: 'CPF/CNPJ já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(
        @Body() dto: CreateClientDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.clientsService.create(dto, user.companyId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar clientes da empresa (paginado)' })
    @ApiResponse({ status: 200, description: 'Clientes listados com sucesso' })
    @ApiResponse({
        status: 403,
        description: 'includeInactive sem ser ADMIN',
    })
    listAll(
        @CurrentTenant() user: TenantJwtPayload,
        @Query() query: ListClientsQueryDto,
    ) {
        return this.clientsService.listAll(user, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar cliente por ID' })
    @ApiResponse({ status: 200, description: 'Cliente encontrado' })
    @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
    findById(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.clientsService.findById(id, user.companyId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Atualizar cliente (apenas ADMIN)' })
    @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateClientDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.clientsService.update(id, dto, user.companyId);
    }

    @Patch(':id/deactivate')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Inativar cliente (apenas ADMIN)' })
    @ApiResponse({ status: 204, description: 'Cliente inativado com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
    deactivate(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.clientsService.deactivate(id, user.companyId);
    }

    @Patch(':id/activate')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Reativar cliente (apenas ADMIN)' })
    @ApiResponse({ status: 200, description: 'Cliente reativado com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
    activate(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.clientsService.activate(id, user.companyId);
    }
}
