# ERP Jurídico

ERP **multi-empresa** (SaaS) para escritórios de advocacia: cada escritório gerencia seus
clientes, processos e finanças de forma isolada, e um administrador de plataforma (root)
cuida dos escritórios e dos catálogos compartilhados.

> **Monorepo:** `backend/` (API NestJS + Prisma) e `frontend/` (SPA React + Vite).

---

## Funcionalidades

- **Autenticação em dois escopos** — sessão de *escritório* (`tenant`) e de *plataforma*
  (`root`), com RBAC por papel (`ADMIN` / `FINANCEIRO` / `OPERACIONAL`) e isolamento total
  entre empresas (o `companyId` vem sempre do token).
- **Clientes** — CRUD com busca, paginação e inativação.
- **Processos** — CRUD, histórico de status, regra de valores (Total derivado até o
  encerramento), combo tipo → subtipo e **advogado responsável**.
- **Financeiro** — despesas por categoria, filtro por período e total do período
  (restrito a `ADMIN` / `FINANCEIRO`).
- **Dashboard** — KPIs, donut de processos por status e atividade recente, agregados no
  backend.
- **Catálogos** (plataforma) — gestão de status, tipos e subtipos de processo; são globais
  e só o root escreve.
- **Conta e UX** — cada usuário edita o próprio nome e foto; tema claro/escuro; busca
  global de processos e clientes no topo; notificações por evento de processo.

A visão detalhada do estado do projeto está em **[`docs/dossie.html`](docs/dossie.html)**
(abra no navegador) e as convenções do backend em **[`backend/CLAUDE.md`](backend/CLAUDE.md)**.

---

## Stack

| Camada    | Tecnologias                                              |
|-----------|---------------------------------------------------------|
| Backend   | NestJS 11 · Prisma 7 · PostgreSQL 16 · JWT/Passport · class-validator · Swagger |
| Frontend  | React 19 · Vite · React Router · TypeScript (sem lib de UI — CSS próprio) |
| Testes    | Jest (unitários) · Supertest (e2e)                      |

---

## Estrutura

```
.
├── backend/     # API NestJS + Prisma (ver backend/CLAUDE.md)
├── frontend/    # SPA React + Vite
├── docs/        # dossiê do projeto (dossie.html)
└── docker-compose.yml   # Postgres (serviço `postgres`)
```

---

## Como rodar

Pré-requisitos: **Node 20+**, **Docker** (para o Postgres).

### 1. Banco

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # preencha JWT_SECRET e PLATFORM_ADMIN_PASSWORD
npm install
npx prisma generate           # gera o client em generated/ (fora do git)
npx prisma migrate deploy     # aplica as migrations
npx prisma db seed            # catálogos + administrador da plataforma (root)
npm run start:dev             # http://localhost:3000  ·  Swagger em /api/docs
```

> Sem `PLATFORM_ADMIN_PASSWORD` no `.env`, o seed não cria o root — e sem root não há
> como entrar. Rodar o seed de novo com uma senha nova redefine a senha do root (é o
> caminho de recuperação).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxy de /api → 3000)
```

### 4. Primeiro acesso

1. Entre pela aba **Plataforma** (não pede empresa), com `PLATFORM_ADMIN_LOGIN` /
   `PLATFORM_ADMIN_PASSWORD`.
2. Em **Empresas**, cadastre um escritório e, na linha dele, crie o primeiro **ADMIN**.
3. Saia e entre pela aba **Escritório**, usando o **ID da empresa** + o login do ADMIN.

---

## Testes

```bash
# backend
cd backend
npm test             # unitários (não precisam de banco)
npm run test:e2e     # e2e (precisam do Postgres de pé e migrado; rodam em série)

# frontend
cd frontend
npx tsc -b           # typecheck
npm run lint
```

---

## Status

Os domínios de produto estão ponta a ponta. Pendências conhecidas para produção (ver o
dossiê): habilitar CORS por env, completar o `docker-compose` (env de JWT no backend +
serviço do frontend), rate-limit nos logins e um `ExceptionFilter` para erros de FK do
Prisma virarem 409 em vez de 500.
