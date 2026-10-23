import { UserRole } from '../enums/user-role.enum';

/**
 * Dois tipos de sessão, com poderes diferentes:
 *
 * - `tenant`   — usuário de um escritório (tabela `User`). Sempre tem empresa.
 * - `platform` — dono da plataforma (tabela `PlatformAdmin`). Nunca tem
 *                empresa: administra todas.
 *
 * O `scope` é o discriminante. Como `sub` é o id em tabelas diferentes, ler
 * um id sem olhar o escopo apontaria para o registro errado — por isso o tipo
 * é uma união, e não um objeto com campos opcionais: o TypeScript obriga a
 * estreitar antes de usar `companyId` ou buscar o usuário pelo `sub`.
 */
export const TokenScope = {
    TENANT: 'tenant',
    PLATFORM: 'platform',
} as const;

export type TokenScope = (typeof TokenScope)[keyof typeof TokenScope];

export interface TenantJwtPayload {
    scope: typeof TokenScope.TENANT;
    /** Id em `User`. */
    sub: number;
    login: string;
    role: UserRole;
    companyId: number;
    companyName: string;
}

export interface PlatformJwtPayload {
    scope: typeof TokenScope.PLATFORM;
    /** Id em `PlatformAdmin` — não é um `User`. */
    sub: number;
    login: string;
}

export type JwtPayload = TenantJwtPayload | PlatformJwtPayload;

export function isPlatform(payload: JwtPayload): payload is PlatformJwtPayload {
    return payload.scope === TokenScope.PLATFORM;
}

export function isTenant(payload: JwtPayload): payload is TenantJwtPayload {
    return payload.scope === TokenScope.TENANT;
}
