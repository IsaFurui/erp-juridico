# Fase 3 — Financeiro / Despesas · Plano

**Spec:** `../specs/2026-10-24-financeiro-fase-3-design.md` · **Branch:** `feat/fase-3-financeiro`

## Stack
NestJS 11 · Prisma 7 · PostgreSQL 16 · React 19 · Vite 8.

## Global constraints
- `companyId` **sempre** do token (`@CurrentTenant`), nunca do body/URL; id de outra
  empresa → 404.
- Controllers só chamam o service; sem lógica de negócio neles.
- DTOs validados com `class-validator`; dinheiro `Decimal(12,2)` (string no JSON).
- Paginação reusa `common/` (`PaginationQueryDto`, `buildPaginated`, `resolvePagination`).
- Gates: `npm test`, `npm run test:e2e` (backend); `npx tsc -b`, `npm run lint` (frontend).

## Review focus
Isolamento por empresa no `where` de toda query (inclusive no `summary`); RBAC barrando
`OPERACIONAL`; `Decimal` serializado como string; rota `summary` declarada antes de `:id`.

## Tasks

### Task 1 — Schema + migration ✅
- `schema.prisma`: enum `ExpenseCategory` (9); `Expense` ganha `category @default(OUTROS)`,
  `date @default(now()) @db.Date`, `@@index([companyId, date])`.
- `migrate dev --name add_expense_category_and_date`.

### Task 2 — Módulo backend ✅
- `expense/enums/expense-category.enum.ts` (espelha o Prisma).
- DTOs: create/update/list (extends `PaginationQueryDto` + `category`/`from`/`to`).
- `expense.service.ts`: `create`, `listAll` (filtros + paginação), `summary`
  (`aggregate` + `groupBy`), `findById` (`findFirst` id+companyId → 404), `update`, `remove`.
- `expense.controller.ts`: guards de classe `JwtAuthGuard, RequireTenantGuard, RolesGuard` +
  `@Roles(ADMIN, FINANCEIRO)`; rotas POST/GET/GET summary/GET :id/PATCH/DELETE.
- Registrar `ExpenseModule` no `app.module.ts`.

### Task 3 — Testes backend ✅
- `expense.service.spec.ts`: isolamento, paginação, filtros, summary, 404.
- `test/expense.e2e-spec.ts`: isolamento 404, FINANCEIRO acessa, OPERACIONAL 403, CRUD, summary.

### Task 4 — Frontend ✅
- `lib/api.ts`: tipos `Expense`/`ExpenseSummary`/payloads + `expensesApi`.
- `features/finance/`: `finance.api.ts`, `expense-category.ts`, `FinanceExpensesPage(.tsx/.css)`,
  `ExpenseFormModal.tsx`.
- `router.tsx`: `FinanceRoute` (ADMIN/FINANCEIRO) + troca do placeholder.
- `Sidebar.tsx`: esconder "Financeiro" para quem não tem acesso.

### Task 5 — Docs + verificação ✅
- `dossie.html`, `backend/CLAUDE.md`, esta spec/plan.
- Rodar migrate/generate, `npm test`, `test:e2e`, `tsc -b`, `lint`.

## Verificação
Backend: 62 unit + ~37 e2e verdes. Frontend: tsc + lint limpos. Manual: ADMIN e FINANCEIRO
operam o financeiro; OPERACIONAL não vê o menu, `/financeiro` redireciona e `/expenses` dá 403.
