import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProcessTypeDto {
    @ApiProperty({ example: 'Cível', description: 'Nome do tipo de processo' })
    @IsString()
    @MinLength(2)
    name!: string;

    @ApiPropertyOptional({
        default: false,
        description:
            'Sigilo sugerido ao criar um processo deste tipo (valor inicial de confidentiality).',
    })
    @IsOptional()
    @IsBoolean()
    defaultConfidential?: boolean;
}
