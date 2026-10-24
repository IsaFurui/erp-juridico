import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateExpenseDto {
    @ApiProperty({
        example: 'Aluguel da sala 302',
        description: 'Descrição da despesa',
    })
    @IsString()
    @MinLength(2)
    name!: string;

    @ApiProperty({ example: 3500.0, description: 'Valor em reais (>= 0)' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    amount!: number;

    @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.ALUGUEL })
    @IsEnum(ExpenseCategory)
    category!: ExpenseCategory;

    @ApiPropertyOptional({
        example: '2026-10-24',
        description: 'Data da despesa (ISO). Sem valor, assume hoje.',
    })
    @IsOptional()
    @IsDateString()
    date?: string;
}
