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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('company')
@Controller('company')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) {}

    @Post()
    @ApiOperation({ summary: 'Cadastrar nova empresa' })
    @ApiResponse({ status: 201, description: 'Empresa cadastrada com sucesso' })
    @ApiResponse({ status: 409, description: 'CNPJ já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreateCompanyDto) {
        return this.companyService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as empresas' })
    @ApiResponse({ status: 200, description: 'Empresas listadas com sucesso' })
    listAll() {
        return this.companyService.listAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar empresa por ID' })
    @ApiResponse({ status: 200, description: 'Empresa encontrada' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.companyService.findById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar nome da empresa' })
    @ApiResponse({ status: 200, description: 'Empresa atualizada com sucesso' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto) {
        return this.companyService.update(id, dto);
    }

    @Patch(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Inativar empresa' })
    @ApiResponse({ status: 204, description: 'Empresa inativada com sucesso' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.companyService.deactivate(id);
    }
}
