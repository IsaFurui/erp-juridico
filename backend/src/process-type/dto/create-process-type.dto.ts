import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateProcessTypeDto {
    @ApiProperty({ example: 'Cível', description: 'Nome do tipo de processo' })
    @IsString()
    @MinLength(2)
    name!: string;
}
