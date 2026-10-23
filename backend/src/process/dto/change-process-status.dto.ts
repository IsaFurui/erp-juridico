import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class ChangeProcessStatusDto {
    @ApiProperty({ example: 9, description: 'ID do novo status' })
    @IsInt()
    @IsPositive()
    statusId!: number;

    @ApiPropertyOptional({
        example: 22500,
        description:
            'Total final. Só é considerado quando o novo status é de encerramento.',
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    totalAmount?: number;

    @ApiPropertyOptional({
        example: 'Acordo homologado em audiência',
        description: 'Observação livre registrada no histórico.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    note?: string;
}
