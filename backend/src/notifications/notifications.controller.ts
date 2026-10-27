import {
    Controller,
    Get,
    Patch,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../auth/guards/require-tenant.guard';
import type { TenantJwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

// Cada um vê as próprias notificações. A plataforma não tem (RequireTenantGuard).
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RequireTenantGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly service: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: 'Minhas notificações + contador de não-lidas' })
    @ApiResponse({ status: 200 })
    list(@CurrentTenant() user: TenantJwtPayload) {
        return this.service.listForUser(user.sub);
    }

    @Patch('read-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Marcar todas como lidas' })
    @ApiResponse({ status: 204 })
    markAllRead(@CurrentTenant() user: TenantJwtPayload) {
        return this.service.markAllRead(user.sub);
    }

    @Patch(':id/read')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Marcar uma notificação como lida' })
    @ApiResponse({ status: 204 })
    markRead(
        @Param('id', ParseIntPipe) id: number,
        @CurrentTenant() user: TenantJwtPayload,
    ) {
        return this.service.markRead(id, user.sub);
    }
}
