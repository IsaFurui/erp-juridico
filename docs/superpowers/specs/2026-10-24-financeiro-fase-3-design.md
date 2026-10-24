# Fase 3 — Financeiro / Despesas · Design

**Data:** 2026-10-24 · **Branch:** `feat/fase-3-financeiro` · **Autoria:** Claude + Isabelle

## 1. Intenção e o porquê

O ERP já tem auth, clientes e processos ponta a ponta. Falta o financeiro. A tabela
`Expense` existe desde o começo, mas sem módulo — e a role `FINANCEIRO`, embora exista no
enum, não protege nenhuma rota. Esta fase entrega o CRUD de despesas ponta a ponta e põe a
role `FINANCEIRO` para trabalhar.

## 2. Decisões de produto (tomadas com a usuária)

- **Despesa sem vínculo a processo.** É custo do escritório, não do caso. `Expense`
  continua escopada só por `companyId` — nada de `processId`/`clientId`.
- **Categoria = enum fixo de 9 valores:** Aluguel, Contas, Pessoal, Software e assinaturas,
  Impostos e taxas, Marketing, Material de escritório, Custas e diligências, Outros. Valores
  em código no banco (`ExpenseCategory`); rótulo legível no frontend.
- **Só despesas.** Receita/honorários recebidos ficam para uma fase futura.
- **Acesso ADMIN + FINANCEIRO.** As duas roles leem e escrevem; `OPERACIONAL` não vê o
  financeiro; a plataforma (sem empresa) não entra.

## 3. Padrões assumidos

- `date` (`@db.Date`) é a competência da despesa; sem valor no cadastro, assume hoje.
- Lista em **tabela** (lançamentos são tabulares) com Data · Descrição · Categoria · Valor
  · ações. Modal de criar/editar reusando `Modal`/`Input`.
- **Faixa de "total do período"** acima da tabela, respeitando os filtros, vinda de
  `GET /expenses/summary` (total + quebra por categoria).
- Filtros: busca por descrição, categoria e intervalo de datas (`de`/`até`).
- Delete físico (linha simples, sem flag `active`), com confirmação no front.

## 4. Escopo

**Backend:** enum `ExpenseCategory`; campos `category`/`date` em `Expense` + índice
`[companyId, date]`; módulo `expense/` (CRUD escopado, paginação, filtros, `summary`); RBAC
`@Roles(ADMIN, FINANCEIRO)` na classe; testes unit + e2e (isolamento + RBAC).

**Frontend:** tipos + `expensesApi` em `lib/api.ts`; feature `features/finance/`
(`FinanceExpensesPage`, `ExpenseFormModal`, `finance.api.ts`, `expense-category.ts`, css);
rota com guard `FinanceRoute`; item "Financeiro" escondido do menu para `OPERACIONAL`.

## 5. Fora de escopo

Receita / honorários recebidos (tabela nova); vínculo despesa ↔ processo/cliente; status de
pagamento (pago/pendente); anexo de comprovante; relatórios/exportação.
