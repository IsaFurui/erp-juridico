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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('process-type')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('process-type')
export class ProcessTypeController {
    constructor(private readonly processTypeService: ProcessTypeService) {}

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Cadastrar novo tipo de processo (apenas ADMIN)' })
    @ApiResponse({ status: 201, description: 'Tipo cadastrado com sucesso' })
    @ApiResponse({ status: 409, description: 'Tipo já cadastrado' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
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

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Atualizar tipo de processo (apenas ADMIN)' })
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
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remover tipo de processo (apenas ADMIN)' })
    @ApiResponse({ status: 204, description: 'Tipo removido com sucesso' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Tipo não encontrado' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.processTypeService.remove(id);
    }
}
