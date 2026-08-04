import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateProcessStatusDto {
    @ApiProperty({ example: 'Em andamento', description: 'Descrição do status do processo' })
    @IsString()
    @MinLength(2)
    description!: string;
}
