import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListClientsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Inclui clientes inativos. Apenas ADMIN.',
        default: false,
    })
    @IsOptional()
    // Query string é texto: sem isso, "false" viraria true no Boolean().
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    includeInactive?: boolean;
}
