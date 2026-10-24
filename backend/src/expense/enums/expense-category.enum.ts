/**
 * Categorias de despesa do escritório. Espelha o enum `ExpenseCategory` do
 * Prisma (mesmo padrão de `UserRole`): um enum TS próprio para alimentar o
 * `@IsEnum(...)` dos DTOs e o Swagger sem importar o client gerado nos
 * decorators. O rótulo legível de cada valor vive no frontend
 * (`features/finance/expense-category.ts`).
 */
export enum ExpenseCategory {
    ALUGUEL = 'ALUGUEL',
    CONTAS = 'CONTAS',
    PESSOAL = 'PESSOAL',
    SOFTWARE = 'SOFTWARE',
    IMPOSTOS = 'IMPOSTOS',
    MARKETING = 'MARKETING',
    MATERIAL = 'MATERIAL',
    CUSTAS = 'CUSTAS',
    OUTROS = 'OUTROS',
}
