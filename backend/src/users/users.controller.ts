import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
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
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    @ApiOperation({ summary: 'Dados do usuário autenticado' })
    @ApiResponse({ status: 200 })
    findMe(@CurrentUser() user: JwtPayload) {
        return this.usersService.findById(user.sub);
    }

    @Get('company/:companyId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Lista usuários da empresa (apenas ADMIN)' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    findByCompany(@Param('companyId', ParseIntPipe) companyId: number) {
        return this.usersService.findAllByCompany(companyId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Atualizar nome ou role do usuário (apenas ADMIN)' })
    @ApiResponse({ status: 200, description: 'Usuário atualizado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.update(id, dto);
    }

    @Patch('me/password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Trocar a própria senha' })
    @ApiResponse({ status: 204, description: 'Senha alterada com sucesso' })
    @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
    changePassword(
        @CurrentUser() user: JwtPayload,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(user.sub, dto);
    }
}
