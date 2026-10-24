import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    MinLength,
} from 'class-validator';
import { ExpenseCategory } from '../enums/expense-category.enum';

export class UpdateExpenseDto {
    @ApiPropertyOptional({ example: 'Aluguel da sala 302' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @ApiPropertyOptional({ example: 3500.0 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    amount?: number;

    @ApiPropertyOptional({ enum: ExpenseCategory })
    @IsOptional()
    @IsEnum(ExpenseCategory)
    category?: ExpenseCategory;

    @ApiPropertyOptional({ example: '2026-10-24' })
    @IsOptional()
    @IsDateString()
    date?: string;
}
