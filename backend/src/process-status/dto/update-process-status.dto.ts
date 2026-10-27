import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProcessStatusDto {
    @ApiPropertyOptional({
        example: 'Em andamento',
        description: 'Descrição do status do processo',
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    description?: string;

    @ApiPropertyOptional({
        description: 'Marca os status que encerram o processo',
    })
    @IsOptional()
    @IsBoolean()
    isFinal?: boolean;
}
