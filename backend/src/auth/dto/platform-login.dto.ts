import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Login do dono da plataforma: sem empresa, porque ele não pertence a
 * nenhuma. O login do escritório é o `LoginDto`.
 */
export class PlatformLoginDto {
    @ApiProperty({ example: 'root' })
    @IsString()
    login: string;

    @ApiProperty({ example: 'senha123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;
}
