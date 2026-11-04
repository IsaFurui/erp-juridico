import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProcessTypeDto {
    @ApiPropertyOptional({
        example: 'Cível',
        description: 'Nome do tipo de processo',
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @ApiPropertyOptional({
        description:
            'Sigilo sugerido ao criar um processo deste tipo (valor inicial de confidentiality).',
    })
    @IsOptional()
    @IsBoolean()
    defaultConfidential?: boolean;
}
