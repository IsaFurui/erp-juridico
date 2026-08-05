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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('process-status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('process-status')
export class ProcessStatusController {
    constructor(private readonly processStatusService: ProcessStatusService) {}

    @Post()
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
        summary: 'Listar todos os status de processo (apenas ADMIN)',
    })
    @ApiResponse({ status: 200, description: 'Status listados com sucesso' })
    listAll() {
        return this.processStatusService.listAll();
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Buscar status de processo por ID (apenas ADMIN)',
    })
    @ApiResponse({ status: 200, description: 'Status encontrado' })
    @ApiResponse({ status: 404, description: 'Status não encontrado' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.processStatusService.findById(id);
    }

    @Patch(':id')
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
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remover status de processo (apenas ADMIN)' })
    @ApiResponse({ status: 204, description: 'Status removido com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Status não encontrado' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.processStatusService.remove(id);
    }
}
