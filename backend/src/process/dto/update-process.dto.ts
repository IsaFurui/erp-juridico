import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    MinLength,
    IsInt,
    IsPositive,
    IsOptional,
    IsNumber,
    Min,
} from 'class-validator';

export class UpdateProcessDto {
    @ApiPropertyOptional({ example: 'Ação Trabalhista - João x Empresa X' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @ApiPropertyOptional({ example: '0001234-56.2026.8.26.0100' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    code?: string;

    @ApiPropertyOptional({ example: 1, description: 'ID do cliente' })
    @IsOptional()
    @IsInt()
    @IsPositive()
    clientId?: number;

    @ApiPropertyOptional({ example: 1, description: 'ID do tipo de processo' })
    @IsOptional()
    @IsInt()
    @IsPositive()
    typeId?: number;

    @ApiPropertyOptional({
        example: 2,
        description:
            'ID do subtipo (deve pertencer ao tipo). Envie null para remover.',
        nullable: true,
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    subtypeId?: number | null;

    @ApiPropertyOptional({ example: 5000 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    fixedAmount?: number;

    @ApiPropertyOptional({ example: 20000 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    expectedAmount?: number;
}
