import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 1, description: 'ID da empresa' })
    @IsInt()
    @IsPositive()
    empId: number;

    @ApiProperty({ example: 'joao.silva' })
    @IsString()
    login: string;

    @ApiProperty({ example: 'senha123', minLength: 6 })
    @IsString()
    @MinLength(6)
    senha: string;
}
