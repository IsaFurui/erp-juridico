/**
 * Papéis dentro de um escritório. O dono da plataforma não está aqui de
 * propósito: ele vive na tabela `PlatformAdmin`, não em `User`, e por isso
 * ninguém vira root alterando uma linha do banco. Ver `TokenScope`.
 */
export enum UserRole {
    ADMIN = 'ADMIN',
    FINANCEIRO = 'FINANCEIRO',
    OPERACIONAL = 'OPERACIONAL',
}
