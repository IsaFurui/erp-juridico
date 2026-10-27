import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    MinLength,
    IsInt,
    IsPositive,
    IsOptional,
    IsNumber,
    Min,
} from 'class-validator';

export class CreateProcessDto {
    @ApiProperty({
        example: 'Ação Trabalhista - João x Empresa X',
        description: 'Nome/título do processo',
    })
    @IsString()
    @MinLength(2)
    name!: string;

    @ApiProperty({
        example: '0001234-56.2026.8.26.0100',
        description: 'Código único do processo (ex.: número CNJ)',
    })
    @IsString()
    @MinLength(1)
    code!: string;

    @ApiProperty({ example: 1, description: 'ID do cliente' })
    @IsInt()
    @IsPositive()
    clientId!: number;

    @ApiProperty({ example: 1, description: 'ID do tipo de processo' })
    @IsInt()
    @IsPositive()
    typeId!: number;

    @ApiProperty({ example: 1, description: 'ID do status' })
    @IsInt()
    @IsPositive()
    statusId!: number;

    @ApiPropertyOptional({
        example: 2,
        description: 'ID do subtipo (deve pertencer ao tipo informado)',
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    subtypeId?: number;

    @ApiPropertyOptional({
        example: 4,
        description: 'ID do advogado responsável (usuário do escritório)',
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    responsibleId?: number;

    @ApiPropertyOptional({
        example: 5000,
        description: 'Valor fixo (honorários)',
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    fixedAmount?: number;

    @ApiPropertyOptional({ example: 20000, description: 'Valor esperado' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    expectedAmount?: number;

    @ApiPropertyOptional({ example: 25000, description: 'Valor total' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    totalAmount?: number;
}
