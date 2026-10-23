import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProcessTypeDto {
    @ApiPropertyOptional({
        example: 'Cível',
        description: 'Nome do tipo de processo',
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;
}
