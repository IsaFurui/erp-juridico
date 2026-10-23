import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Base das listagens paginadas. Query string chega sempre como texto, por isso
 * o `@Type(() => Number)` — sem ele o `@IsInt` reprovaria "2".
 *
 * Estenda esta classe quando a rota tiver filtros próprios (ver
 * `ListClientsQueryDto`): o `forbidNonWhitelisted` do ValidationPipe global
 * recusa qualquer parâmetro que não esteja declarado.
 */
export class PaginationQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        default: DEFAULT_PAGE_SIZE,
        minimum: 1,
        maximum: MAX_PAGE_SIZE,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    pageSize?: number;

    @ApiPropertyOptional({ description: 'Busca textual' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
}
