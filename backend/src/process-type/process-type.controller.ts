import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
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
import { ProcessTypeService } from './process-type.service';
import { CreateProcessTypeDto } from './dto/create-process-type.dto';
import { UpdateProcessTypeDto } from './dto/update-process-type.dto';
import { CreateProcessSubtypeDto } from './dto/create-process-subtype.dto';
import { UpdateProcessSubtypeDto } from './dto/update-process-subtype.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../auth/guards/platform.guard';

// Catálogo global, compartilhado por todos os escritórios: a LEITURA é aberta
// (o formulário de processo precisa dela), mas a ESCRITA é exclusiva do root
// (PlatformGuard) — um ADMIN de escritório não edita catálogo de todo mundo.
@ApiTags('process-type')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('process-type')
export class ProcessTypeController {
    constructor(private readonly processTypeService: ProcessTypeService) {}

    @Post()
    @UseGuards(PlatformGuard)
    @ApiOperation({ summary: 'Cadastrar tipo de processo (apenas plataforma)' })
    @ApiResponse({ status: 201, description: 'Tipo cadastrado com sucesso' })
    @ApiResponse({ status: 409, description: 'Tipo já cadastrado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    create(@Body() dto: CreateProcessTypeDto) {
        return this.processTypeService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os tipos de processo' })
    @ApiResponse({ status: 200, description: 'Tipos listados com sucesso' })
    listAll() {
        return this.processTypeService.listAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar tipo de processo por ID' })
    @ApiResponse({ status: 200, description: 'Tipo encontrado' })
    @ApiResponse({ status: 404, description: 'Tipo não encontrado' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.processTypeService.findById(id);
    }

    @Get(':id/subtypes')
    @ApiOperation({ summary: 'Listar subtipos de um tipo de processo' })
    @ApiResponse({ status: 200, description: 'Subtipos listados com sucesso' })
    @ApiResponse({ status: 404, description: 'Tipo não encontrado' })
    listSubtypes(@Param('id', ParseIntPipe) id: number) {
        return this.processTypeService.listSubtypes(id);
    }

    @Post(':id/subtypes')
    @UseGuards(PlatformGuard)
    @ApiOperation({ summary: 'Criar subtipo (apenas plataforma)' })
    @ApiResponse({ status: 201, description: 'Subtipo criado com sucesso' })
    @ApiResponse({ status: 404, description: 'Tipo não encontrado' })
    @ApiResponse({ status: 409, description: 'Subtipo já existe neste tipo' })
    createSubtype(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateProcessSubtypeDto,
    ) {
        return this.processTypeService.createSubtype(id, dto);
    }

    @Patch(':id/subtypes/:subtypeId')
    @UseGuards(PlatformGuard)
    @ApiOperation({ summary: 'Atualizar subtipo (apenas plataforma)' })
    @ApiResponse({ status: 200, description: 'Subtipo atualizado com sucesso' })
    @ApiResponse({ status: 404, description: 'Tipo ou subtipo não encontrado' })
    updateSubtype(
        @Param('id', ParseIntPipe) id: number,
        @Param('subtypeId', ParseIntPipe) subtypeId: number,
        @Body() dto: UpdateProcessSubtypeDto,
    ) {
        return this.processTypeService.updateSubtype(id, subtypeId, dto);
    }

    @Delete(':id/subtypes/:subtypeId')
    @UseGuards(PlatformGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remover subtipo (apenas plataforma)' })
    @ApiResponse({ status: 204, description: 'Subtipo removido com sucesso' })
    @ApiResponse({ status: 404, description: 'Tipo ou subtipo não encontrado' })
    removeSubtype(
        @Param('id', ParseIntPipe) id: number,
        @Param('subtypeId', ParseIntPipe) subtypeId: number,
    ) {
        return this.processTypeService.removeSubtype(id, subtypeId);
    }

    @Patch(':id')
    @UseGuards(PlatformGuard)
    @ApiOperation({ summary: 'Atualizar tipo de processo (apenas plataforma)' })
    @ApiResponse({ status: 200, description: 'Tipo atualizado com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Tipo não encontrado' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProcessTypeDto,
    ) {
        return this.processTypeService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(PlatformGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remover tipo de processo (apenas plataforma)' })
    @ApiResponse({ status: 204, description: 'Tipo removido com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Tipo não encontrado' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.processTypeService.remove(id);
    }
}
