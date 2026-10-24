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
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { TenantJwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { RequireTenantGuard } from '../auth/guards/require-tenant.guard';

// Dado de escritório e exclusivo do financeiro: só ADMIN e FINANCEIRO entram.
// RequireTenantGuard já barra a plataforma (sem empresa); OPERACIONAL leva 403
// no RolesGuard. Guards e @Roles ficam na classe porque valem para toda rota.
@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.FINANCEIRO)
@Controller('expenses')
export class ExpenseController {
    constructor(private readonly expenseService: ExpenseService) {}

    @Post()
    @ApiOperation({ summary: 'Lançar nova despesa' })
    @ApiResponse({ status: 201, description: 'Despesa lançada com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    create(
        @Body() dto: CreateExpenseDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.expenseService.create(dto, user.companyId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar despesas da empresa (paginado)' })
    @ApiResponse({ status: 200, description: 'Despesas listadas com sucesso' })
    listAll(
        @CurrentTenant() user: TenantJwtPayload,
        @Query() query: ListExpensesQueryDto,
    ) {
        return this.expenseService.listAll(user.companyId, query);
    }

    // Declarada antes de ':id' para não ser capturada como um id.
    @Get('summary')
    @ApiOperation({
        summary: 'Total do período e quebra por categoria (mesmos filtros)',
    })
    @ApiResponse({ status: 200, description: 'Resumo calculado com sucesso' })
    summary(
        @CurrentTenant() user: TenantJwtPayload,
        @Query() query: ListExpensesQueryDto,
    ) {
        return this.expenseService.summary(user.companyId, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar despesa por ID' })
    @ApiResponse({ status: 200, description: 'Despesa encontrada' })
    @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
    findById(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.expenseService.findById(id, user.companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar despesa' })
    @ApiResponse({ status: 200, description: 'Despesa atualizada com sucesso' })
    @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateExpenseDto,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.expenseService.update(id, dto, user.companyId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir despesa' })
    @ApiResponse({ status: 204, description: 'Despesa excluída com sucesso' })
    @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
    remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.expenseService.remove(id, user.companyId);
    }
}
