import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CreateCompanyDto {
    @ApiProperty({ example: 'Escritório Jurídico Silva & Associados' })
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({
        example: '12.345.678/0001-90',
        description: 'CNPJ formatado (XX.XXX.XXX/XXXX-XX) ou apenas dígitos (14)',
    })
    @IsString()
    @Matches(/^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/, {
        message: 'cnpj deve ser formatado (XX.XXX.XXX/XXXX-XX) ou 14 dígitos',
    })
    cnpj: string;
}
