import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateCompanyDto {
    @ApiPropertyOptional({ example: 'Escritório Jurídico Silva & Associados' })
    @IsString()
    @MinLength(2)
    name: string;
}
