import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AtualizarEmpresaDto {
    @ApiPropertyOptional({ example: 'Escritório Jurídico Silva & Associados' })
    @IsString()
    @MinLength(2)
    nome: string;
}
