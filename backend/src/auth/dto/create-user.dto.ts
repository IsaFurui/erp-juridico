import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
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

    @ApiPropertyOptional({ enum: UserRole, default: UserRole.OPERACIONAL })
    @IsEnum(UserRole)
    role?: UserRole = UserRole.OPERACIONAL;

    @ApiProperty({ example: 1, description: 'ID da empresa' })
    @IsInt()
    @IsPositive()
    companyId: number;
}
