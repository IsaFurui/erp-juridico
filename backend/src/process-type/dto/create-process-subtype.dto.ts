import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateProcessSubtypeDto {
    @ApiProperty({ example: 'Rito ordinário', description: 'Nome do subtipo' })
    @IsString()
    @MinLength(2)
    name!: string;
}
