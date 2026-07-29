import {
    Controller,
    Post,
    Body,
    Get,
    Patch,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';
import { CriarEmpresaDto } from './dto/criar-empresa.dto';

@ApiTags('empresa')
@Controller('empresa')
export class EmpresaController {
    constructor(private readonly empresaService: EmpresaService) {}

    @Post()
    @ApiOperation({ summary: 'Cadastrar nova empresa' })
    @ApiResponse({
        status: 201,
        description: 'Empresa cadastrada com sucesso',
    })
    @ApiResponse({ status: 409, description: 'CNPJ já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CriarEmpresaDto) {
        return this.empresaService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as empresas' })
    @ApiResponse({
        status: 200,
        description: 'Empresas listadas com sucesso',
    })
    listAll() {
        return this.empresaService.listAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar empresa por ID' })
    @ApiResponse({ status: 200, description: 'Empresa encontrada' })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.empresaService.findById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar nome da empresa' })
    @ApiResponse({
        status: 200,
        description: 'Empresa atualizada com sucesso',
    })
    @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AtualizarEmpresaDto,
    ) {
        return this.empresaService.updateNome(id, dto);
    }
}
