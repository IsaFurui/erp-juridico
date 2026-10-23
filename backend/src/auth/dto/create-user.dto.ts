import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsPositive,
    IsString,
    MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
    @ApiProperty({ example: 'João Silva' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'joao.silva' })
    @IsString()
    login: string;

    @ApiProperty({ example: 'senha123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({
        enum: UserRole,
        default: UserRole.OPERACIONAL,
        description:
            'SUPER_ADMIN não é aceito aqui: esse papel só nasce no seed de bootstrap.',
    })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole = UserRole.OPERACIONAL;

    /**
     * Só o SUPER_ADMIN pode informar a empresa — é assim que ele cria o
     * primeiro ADMIN de um escritório novo. Para qualquer outro papel o valor
     * é ignorado em favor do companyId do token; mandar uma empresa diferente
     * da própria devolve 403.
     */
    @ApiPropertyOptional({
        example: 1,
        description:
            'ID da empresa. Apenas SUPER_ADMIN pode criar usuário em outra empresa; os demais criam sempre na própria.',
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    companyId?: number;
}
