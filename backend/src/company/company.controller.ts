import {
    Controller,
    Post,
    Body,
    Get,
    Patch,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../auth/guards/platform.guard';

// Módulo da plataforma, não do escritório: todas as rotas atravessam o tenant
// (listam e editam qualquer empresa), então são exclusivas de quem entrou
// como administrador da plataforma. Um ADMIN de escritório recebe 403 aqui,
// inclusive no POST — o root nasce pelo seed (`prisma db seed`).
@ApiTags('company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) {}

    @Post()
    @ApiOperation({ summary: 'Cadastrar nova empresa (apenas plataforma)' })
    @ApiResponse({ status: 201, description: 'Empresa cadastrada com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 409, description: 'CNPJ já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreateCompanyDto) {
        return this.companyService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as empresas (apenas plataforma)' })
    @ApiResponse({ status: 200, description: 'Empresas listadas com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    listAll() {
        return this.companyService.listAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar empresa por ID (apenas plataforma)' })
    @ApiResponse({ status: 200, description: 'Empresa encontrada' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.companyService.findById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar nome da empresa (apenas plataforma)' })
    @ApiResponse({ status: 200, description: 'Empresa atualizada com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCompanyDto,
    ) {
        return this.companyService.update(id, dto);
    }

    @Patch(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Inativar empresa (apenas plataforma)' })
    @ApiResponse({ status: 204, description: 'Empresa inativada com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autenticado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.companyService.deactivate(id);
    }
}
