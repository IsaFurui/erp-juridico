import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
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
import { ProcessService } from './process.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ChangeProcessStatusDto } from './dto/change-process-status.dto';
import { ListProcessesQueryDto } from './dto/list-processes-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { TenantJwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequireTenantGuard } from '../auth/guards/require-tenant.guard';

@ApiTags('processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RequireTenantGuard)
@Controller('processes')
export class ProcessController {
    constructor(private readonly processService: ProcessService) {}

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OPERACIONAL)
    @ApiOperation({ summary: 'Cadastrar novo processo' })
    @ApiResponse({
        status: 201,
        description: 'Processo cadastrado com sucesso',
    })
    @ApiResponse({ status: 409, description: 'Código já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(
        @Body() dto: CreateProcessDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.processService.create(dto, user.companyId, user.sub);
    }

    @Get()
    @ApiOperation({ summary: 'Listar processos da empresa (paginado)' })
    @ApiResponse({ status: 200, description: 'Processos listados com sucesso' })
    listAll(
        @CurrentTenant() user: TenantJwtPayload,
        @Query() query: ListProcessesQueryDto,
    ) {
        return this.processService.listAll(user.companyId, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar processo por ID' })
    @ApiResponse({ status: 200, description: 'Processo encontrado' })
    @ApiResponse({ status: 404, description: 'Processo não encontrado' })
    findById(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.processService.findById(id, user.companyId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OPERACIONAL)
    @ApiOperation({ summary: 'Atualizar processo' })
    @ApiResponse({
        status: 200,
        description: 'Processo atualizado com sucesso',
    })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Processo não encontrado' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProcessDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.processService.update(id, dto, user.companyId);
    }

    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.OPERACIONAL)
    @ApiOperation({ summary: 'Mudar o status do processo' })
    @ApiResponse({ status: 200, description: 'Status alterado com sucesso' })
    @ApiResponse({ status: 404, description: 'Processo não encontrado' })
    @ApiResponse({ status: 400, description: 'Status inválido' })
    changeStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ChangeProcessStatusDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.processService.changeStatus(
            id,
            dto,
            user.companyId,
            user.sub,
        );
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir processo (apenas ADMIN)' })
    @ApiResponse({ status: 204, description: 'Processo excluído com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Processo não encontrado' })
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.processService.remove(id, user.companyId);
    }
}
