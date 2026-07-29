import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AlterarSenhaDto {
    @ApiProperty({ example: 'senhaAtual123' })
    @IsString()
    senhaAtual: string;

    @ApiProperty({ example: 'novaSenha456', minLength: 6 })
    @IsString()
    @MinLength(6)
    novaSenha: string;
}
