import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../auth/enums/user-role.enum';

export class AtualizarUsuarioDto {
    @ApiPropertyOptional({ example: 'João Silva' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}
