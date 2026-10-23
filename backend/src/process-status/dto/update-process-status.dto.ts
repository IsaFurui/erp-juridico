import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProcessStatusDto {
    @ApiPropertyOptional({
        example: 'Em andamento',
        description: 'Descrição do status do processo',
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    description?: string;
}
