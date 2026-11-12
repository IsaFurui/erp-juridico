import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ExpenseCategory } from '../enums/expense-category.enum';

export class ListExpensesQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        enum: ExpenseCategory,
        description: 'Filtra por categoria',
    })
    @IsOptional()
    @IsEnum(ExpenseCategory)
    category?: ExpenseCategory;

    @ApiPropertyOptional({
        example: '2026-10-01',
        description: 'Início do intervalo de datas (inclusivo)',
    })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({
        example: '2026-10-31',
        description: 'Fim do intervalo de datas (inclusivo)',
    })
    @IsOptional()
    @IsDateString()
    to?: string;
}
