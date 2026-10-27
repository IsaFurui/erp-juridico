import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProcessSubtypeDto {
    @ApiPropertyOptional({ example: 'Rito sumário' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;
}
