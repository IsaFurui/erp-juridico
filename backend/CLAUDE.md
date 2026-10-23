# ERP Jurídico — Backend

## Stack

| Tecnologia       | Versão  | Propósito                                 |
|------------------|---------|-------------------------------------------|
| NestJS           | ^11     | Framework principal (modular, decorators) |
| Prisma ORM       | ^7      | Acesso ao banco de dados                  |
| PostgreSQL       | —       | Banco de dados relacional                 |
| JWT / Passport   | —       | Autenticação stateless                    |
| bcrypt           | ^6      | Hash de senhas                            |
| class-validator  | ^0.15   | Validação de DTOs                         |
| @nestjs/swagger  | ^11     | Documentação OpenAPI (Swagger UI)         |
| @nestjs/config   | ^4      | Variáveis de ambiente tipadas             |

---

## Estrutura de Módulos

```
src/
├── prisma/            # Módulo singleton do PrismaClient
├── auth/              # Autenticação completa (JWT + RBAC)
├── users/             # Gestão de usuários
├── company/           # Gestão de empresas (CRUD + desativação)
├── clients/           # Gestão de clientes (CRUD + desativação)
├── process-status/    # CRUD de status de processo
└── process-type/      # CRUD de tipos de processo
```

> Ainda **não implementados** (models já existem no schema): `process/`
> (entidade central `Process` + `ProcessSubtype`) e `expense/` (financeiro).

---

## Módulo `prisma/`

`PrismaService` estende `PrismaClient` e implementa `OnModuleInit` para conectar automaticamente.
Usa o **driver adapter** `@prisma/adapter-pg` (`PrismaPg`), com a `connectionString` lida via
`ConfigService.getOrThrow('DATABASE_URL')`.
`PrismaModule` exporta o serviço — todos os outros módulos que precisam do banco importam `PrismaModule`.

> Nunca injete `PrismaService` diretamente em controllers.

---

## Módulo `auth/`

### Fluxo de autenticação

1. `POST /auth/login` → `AuthService.login()` → valida credenciais com bcrypt → retorna JWT
2. Rotas protegidas usam `JwtAuthGuard` (Passport extrai e valida o token)
3. `RolesGuard` lê os metadados `@Roles()` e verifica `payload.role`

### Arquivos

| Arquivo                          | Responsabilidade                                      |
|----------------------------------|-------------------------------------------------------|
| `auth.service.ts`                | login + register (hash bcrypt, emite JWT)             |
| `auth.controller.ts`             | Endpoints: `POST /login`, `POST /register`, `GET /me` |
| `strategies/jwt.strategy.ts`     | Extrai e valida payload do token Bearer               |
| `guards/jwt-auth.guard.ts`       | Protege rotas com JWT (`@UseGuards(JwtAuthGuard)`)    |
| `guards/roles.guard.ts`          | RBAC — verifica papel do usuário                      |
| `decorators/roles.decorator.ts`  | `@Roles(UserRole.ADMIN)` — define roles obrigatórios  |
| `decorators/current-user.decorator.ts` | `@CurrentUser()` — injeta payload JWT no param  |
| `enums/user-role.enum.ts`        | `UserRole.ADMIN / FINANCEIRO / OPERACIONAL`           |
| `interfaces/jwt-payload.interface.ts` | Shape do payload JWT                             |
| `types/authenticated-request.type.ts` | `Request` tipado com `user: JwtPayload`          |
| `dto/login.dto.ts`               | Body de login validado                                |
| `dto/create-user.dto.ts`         | Body de criação de usuário validado                   |

### Variáveis de ambiente obrigatórias

```env
JWT_SECRET=<string-secreta>
JWT_EXPIRES_IN=7d        # Formato ms: 7d, 1h, 30m...
DATABASE_URL=postgresql://...
```

---

## Módulo `users/`

`UsersService` é o único ponto de acesso ao model `User` no banco.
Nunca retorna `passwordHash` nos selects públicos.

| Método                              | Descrição                                        |
|-------------------------------------|--------------------------------------------------|
| `findByLogin(companyId, login)`     | Busca usuário para autenticação (retorna hash)   |
| `findById(id)`                      | Busca por ID                                     |
| `create(input)`                     | Cria usuário (recebe hash pré-gerado)            |
| `findAllByCompany(companyId)`       | Lista usuários da empresa (sem senha)            |
| `update(id, dto)`                   | Atualiza dados do usuário                         |
| `changePassword(id, dto)`           | Troca a senha do usuário                          |

---

## RBAC — Papéis de Usuário

| Role          | Acesso                                    |
|---------------|-------------------------------------------|
| `ADMIN`       | Tudo: criar usuários, ver todos os dados  |
| `FINANCEIRO`  | Módulo financeiro (despesas)              |
| `OPERACIONAL` | Módulo de processos e clientes            |

### Como usar em novos controllers

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('rota-protegida')
minhaRota(@CurrentUser() user: JwtPayload) { ... }
```

---

## Swagger / OpenAPI

Disponível em `http://localhost:3000/api/docs`.
Rotas protegidas usam `@ApiBearerAuth()` — clicar em "Authorize" no Swagger UI e colar o JWT.

---

## Prisma

> **Nomenclatura em inglês**: desde a migration `changing_table_names`, todos os models,
> campos e tabelas usam nomes em inglês (sem `@@map`). As antigas tabelas em português
> (`usuario`, `empresa`, `cliente`, etc.) foram removidas pela migration
> `drop_legacy_pt_tables`.

### Modelo `User`

```prisma
model User {
  id           Int      @id @default(autoincrement())
  name         String
  login        String
  passwordHash String
  role         UserRole @default(OPERACIONAL)
  companyId    Int

  company Company @relation(fields: [companyId], references: [id], onDelete: Restrict)

  @@unique([companyId, login])
}
```

O login é único **por empresa** (`@@unique([companyId, login])`), permitindo o mesmo login em empresas diferentes.

### Models do schema

`Company`, `User`, `Client`, `Expense`, `ProcessStatus`, `ProcessType`, `ProcessSubtype`, `Process`.
Enum `UserRole` (`ADMIN` / `FINANCEIRO` / `OPERACIONAL`).

### Comandos úteis

```bash
npx prisma migrate dev --name <nome>   # Nova migration
npx prisma generate                    # Regenerar client após mudar schema
npx prisma studio                      # GUI do banco
```

O client gerado fica em `generated/prisma/` (não editar).
Importar tipos do client: `import { UserRole } from '../../generated/prisma/enums'`

---

## Convenções do projeto

- Controllers não acessam Prisma diretamente — sempre via Service
- Sem lógica de negócio em controllers
- DTOs validados com `class-validator` + `ValidationPipe` global (whitelist + transform habilitados)
- Hash de senha sempre gerado no `AuthService`, nunca no `UsersService`
- Importar `JwtPayload` como `import type` em arquivos com decorators (restrição do `emitDecoratorMetadata`)
