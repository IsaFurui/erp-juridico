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
import { UsuariosService } from './usuarios.service';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
    constructor(private readonly usuariosService: UsuariosService) {}

    @Get('me')
    @ApiOperation({ summary: 'Dados do usuário autenticado (rota protegida)' })
    @ApiResponse({ status: 200 })
    findMe(@CurrentUser() user: JwtPayload) {
        return this.usuariosService.findById(user.sub);
    }

    @Get('empresa/:empId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Lista usuários da empresa (apenas ADMIN)' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    findByEmpresa(@Param('empId', ParseIntPipe) empId: number) {
        return this.usuariosService.findAllByEmpresa(empId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Atualizar nome ou role do usuário (apenas ADMIN)' })
    @ApiResponse({ status: 200, description: 'Usuário atualizado' })
    @ApiResponse({ status: 403, description: 'Acesso negado' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarUsuarioDto) {
        return this.usuariosService.update(id, dto);
    }

    @Patch('me/senha')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Trocar a própria senha' })
    @ApiResponse({ status: 204, description: 'Senha alterada com sucesso' })
    @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
    changePassword(@CurrentUser() user: JwtPayload, @Body() dto: AlterarSenhaDto) {
        return this.usuariosService.changePassword(user.sub, dto);
    }
}
