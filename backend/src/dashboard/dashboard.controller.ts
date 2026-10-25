import { Controller, Get, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../auth/guards/require-tenant.guard';
import type { TenantJwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

// Primeira tela do escritório: todos os papéis entram. O bloco financeiro é
// que fica restrito (o service devolve null fora de ADMIN/FINANCEIRO).
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RequireTenantGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get()
    @ApiOperation({ summary: 'Indicadores do escritório para o dashboard' })
    @ApiResponse({ status: 200, description: 'Indicadores calculados' })
    get(@CurrentTenant() user: TenantJwtPayload) {
        return this.dashboardService.get(user.companyId, user.role);
    }
}
