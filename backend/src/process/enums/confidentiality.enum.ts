/**
 * Sigilo do processo. Espelha o enum `Confidentiality` do Prisma (mesmo padrão
 * de `UserRole`/`ExpenseCategory`): um enum TS próprio para alimentar o
 * `@IsEnum(...)` dos DTOs e o Swagger sem importar o client gerado nos
 * decorators. `PUBLIC` entra no monitoramento automático do DataJud;
 * `CONFIDENTIAL` (segredo de justiça) fica fora e segue com controle manual.
 */
export enum Confidentiality {
    PUBLIC = 'PUBLIC',
    CONFIDENTIAL = 'CONFIDENTIAL',
}
