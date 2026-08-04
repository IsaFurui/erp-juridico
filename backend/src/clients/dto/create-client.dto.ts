import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class CreateClientDto {
    @ApiProperty({
        example: 'João da Silva',
        description: 'Nome completo do cliente',
    })
    @IsString()
    @MinLength(2)
    name!: string;

    @ApiProperty({
        example: '123.456.789-09',
        description:
            'CPF (formatado ou apenas dígitos) ou CNPJ (formatado ou apenas dígitos)',
    })
    @IsString()
    @Matches(
        /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/,
        {
            message:
                'cpfCnpj deve ser CPF ou CNPJ válido formatado ou apenas dígitos',
        },
    )
    cpfCnpj!: string;
}
