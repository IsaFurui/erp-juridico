import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Filtros da listagem de processos. Herda page/pageSize/search da base; o
 * `search` casa por nome ou por código. Os filtros são opcionais e, como toda
 * query string, chegam como texto — daí o `@Type(() => Number)`.
 */
export class ListProcessesQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filtra por status' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    statusId?: number;

    @ApiPropertyOptional({ description: 'Filtra por tipo de processo' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    typeId?: number;

    @ApiPropertyOptional({ description: 'Filtra por cliente' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    clientId?: number;
}
