import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Edição do PRÓPRIO perfil (PATCH /users/me). Diferente de UpdateUserDto (que
// é do ADMIN e mexe em role): aqui o usuário só muda nome e foto.
export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'Isabelle Furui' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @ApiPropertyOptional({
        example: 'data:image/jpeg;base64,/9j/4AAQ...',
        description: 'Foto de perfil como data URL (base64). Vazio remove.',
    })
    @IsOptional()
    @IsString()
    // ~500KB de data URL; a imagem é reduzida no navegador antes de enviar.
    @MaxLength(700000)
    avatarUrl?: string;
}
