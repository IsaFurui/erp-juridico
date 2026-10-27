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
import { ProcessStatusService } from './process-status.service';
import { CreateProcessStatusDto } from './dto/create-process-status.dto';
import { UpdateProcessStatusDto } from './dto/update-process-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../auth/guards/platform.guard';

@ApiTags('process-status')
@ApiBearerAuth()
// Escrita é ADMIN, leitura é qualquer sessão autenticada — mesmo critério de
// process-type. Antes o guard estava na classe e um OPERACIONAL não conseguia
// nem ler a lista de status, embora possa criar processo (que exige statusId).
@UseGuards(JwtAuthGuard)
@Controller('process-status')
export class ProcessStatusController {
    constructor(private readonly processStatusService: ProcessStatusService) {}

    @Post()
    @UseGuards(PlatformGuard)
    @ApiOperation({
        summary: 'Cadastrar novo status de processo (apenas ADMIN)',
    })
    @ApiResponse({ status: 201, description: 'Status cadastrado com sucesso' })
    @ApiResponse({ status: 409, description: 'Status já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    create(@Body() dto: CreateProcessStatusDto) {
        return this.processStatusService.create(dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Listar todos os status de processo',
    })
    @ApiResponse({ status: 200, description: 'Status listados com sucesso' })
    listAll() {
        return this.processStatusService.listAll();
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Buscar status de processo por ID',
    })
    @ApiResponse({ status: 200, description: 'Status encontrado' })
    @ApiResponse({ status: 404, description: 'Status não encontrado' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.processStatusService.findById(id);
    }

    @Patch(':id')
    @UseGuards(PlatformGuard)
    @ApiOperation({ summary: 'Atualizar status de processo (apenas ADMIN)' })
    @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Status não encontrado' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProcessStatusDto,
    ) {
        return this.processStatusService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(PlatformGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remover status de processo (apenas ADMIN)' })
    @ApiResponse({ status: 204, description: 'Status removido com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Status não encontrado' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.processStatusService.remove(id);
    }
}
