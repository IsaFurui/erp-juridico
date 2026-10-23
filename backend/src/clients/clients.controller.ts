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
    ApiQuery,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) {}

    @Post()
    @ApiOperation({ summary: 'Cadastrar novo cliente' })
    @ApiResponse({ status: 201, description: 'Cliente cadastrado com sucesso' })
    @ApiResponse({ status: 409, description: 'CPF/CNPJ já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
        return this.clientsService.create(dto, user.companyId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar clientes' })
    @ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'Inclui clientes inativos (apenas ADMIN)',
    })
    @ApiResponse({ status: 200, description: 'Clientes listados com sucesso' })
    listAll(@Query('includeInactive') includeInactive?: string) {
        return this.clientsService.listAll(includeInactive === 'true');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar cliente por ID' })
    @ApiResponse({ status: 200, description: 'Cliente encontrado' })
    @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
    findById(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: JwtPayload,
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
        @CurrentUser() user: JwtPayload,
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
        @CurrentUser() user: JwtPayload,
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
        @CurrentUser() user: JwtPayload,
    ) {
        return this.clientsService.activate(id, user.companyId);
    }
}
