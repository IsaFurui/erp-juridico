import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProcessStatusDto {
    @ApiProperty({
        example: 'Em andamento',
        description: 'Descrição do status do processo',
    })
    @IsString()
    @MinLength(2)
    description!: string;

    @ApiPropertyOptional({
        default: false,
        description: 'Marca os status que encerram o processo',
    })
    @IsOptional()
    @IsBoolean()
    isFinal?: boolean;
}
