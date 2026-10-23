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
└── empresa/           # Módulo de empresas (em construção)
```

---

## Módulo `prisma/`

`PrismaService` estende `PrismaClient` e implementa `OnModuleInit` para conectar automaticamente.
`PrismaModule` exporta o serviço — todos os outros módulos que precisam do banco importam `PrismaModule`.

> Nunca injete `PrismaService` diretamente em controllers.

---

## Módulo `auth/`

### Fluxo de autenticação

1. `POST /auth/login` (escritório: pede `companyId`) ou `POST /auth/platform/login`
   (root: não pede empresa) → valida com bcrypt → retorna JWT com `scope`
2. O login de escritório recusa empresa inativa
3. Rotas protegidas usam `JwtAuthGuard` (Passport extrai e valida o token)
4. `RolesGuard`, `PlatformGuard` e `RequireTenantGuard` decidem o resto —
   ver "Dois escopos de sessão" abaixo

### Arquivos

| Arquivo                          | Responsabilidade                                      |
|----------------------------------|-------------------------------------------------------|
| `auth.service.ts`                | login + register (hash bcrypt, emite JWT)             |
| `auth.controller.ts`             | `POST /login`, `POST /platform/login`, `POST /register`, `GET /me` |
| `strategies/jwt.strategy.ts`     | Extrai e valida payload do token Bearer               |
| `guards/jwt-auth.guard.ts`       | Protege rotas com JWT (`@UseGuards(JwtAuthGuard)`)    |
| `guards/roles.guard.ts`          | RBAC — verifica papel do usuário                      |
| `decorators/roles.decorator.ts`  | `@Roles(UserRole.ADMIN)` — define roles obrigatórios  |
| `decorators/current-user.decorator.ts` | `@CurrentUser()` — injeta payload JWT no param  |
| `enums/user-role.enum.ts`        | `UserRole.ADMIN / FINANCEIRO / OPERACIONAL` (papéis de escritório) |
| `guards/platform.guard.ts`       | Só sessão da plataforma                               |
| `guards/require-tenant.guard.ts` | Só sessão de escritório                               |
| `interfaces/jwt-payload.interface.ts` | Shape do payload JWT                             |
| `types/authenticated-request.type.ts` | `Request` tipado com `user: JwtPayload`          |
| `dto/login.dto.ts`               | Body de login validado                                |
| `dto/create-user.dto.ts`         | Body de criação de usuário validado                   |

### Variáveis de ambiente obrigatórias

```env
JWT_SECRET=<string-secreta>
JWT_EXPIRES_IN=7d        # Formato ms: 7d, 1h, 30m...
DATABASE_URL=postgresql://...

PLATFORM_ADMIN_LOGIN=root        # usado pelo seed
PLATFORM_ADMIN_PASSWORD=<senha>  # sem ela o seed não cria o root
```

---

## Módulo `users/`

`UsersService` é o único ponto de acesso ao model `usuario` no banco.
Nunca retorna `UsuSenhaHash` nos selects públicos.

| Método                         | Descrição                                        |
|-------------------------------|--------------------------------------------------|
| `findByLogin(empId, login)`   | Busca usuário para autenticação (retorna hash)   |
| `findById(id)`                | Busca por ID                                     |
| `create(input)`               | Cria usuário (recebe hash pré-gerado)            |
| `findAllByEmpresa(empId)`     | Lista usuários da empresa (sem senha)            |

---

## Dois escopos de sessão

O token carrega um `scope`, e ele decide quase tudo:

| Escopo     | Tabela          | Tem empresa? | Pode                                        |
|------------|-----------------|--------------|---------------------------------------------|
| `tenant`   | `User`          | sempre       | dados do próprio escritório                 |
| `platform` | `PlatformAdmin` | nunca        | o módulo `company` e usuários de qualquer empresa |

`JwtPayload` é uma **união discriminada** (`TenantJwtPayload | PlatformJwtPayload`)
de propósito: `sub` é id de tabelas diferentes nos dois casos, e `companyId` só
existe num deles — o TypeScript obriga a estreitar com `isTenant()` / `isPlatform()`
antes de usar qualquer um dos dois.

O administrador da plataforma **nasce só pelo seed** (`PLATFORM_ADMIN_PASSWORD`
no `.env`). Não há rota que crie ou promova ninguém a root: um token roubado não
consegue fabricar um segundo dono, e nenhum registro de `User` vira root.

### Guards

| Guard                | Efeito                                                              |
|----------------------|---------------------------------------------------------------------|
| `JwtAuthGuard`       | exige token válido (e com `scope` conhecido)                        |
| `RolesGuard`         | checa `@Roles(...)`; a sessão `platform` passa em qualquer um        |
| `PlatformGuard`      | só sessão `platform` — use no que atravessa escritórios             |
| `RequireTenantGuard` | só sessão `tenant` — use em toda rota de dado de escritório         |

Nos handlers, `@CurrentTenant()` e `@CurrentPlatform()` entregam o payload já
estreitado (e repetem a checagem, caso o guard tenha sido esquecido).

## RBAC — Papéis dentro do escritório

| Role          | Acesso                                    |
|---------------|-------------------------------------------|
| `ADMIN`       | Usuários e clientes do próprio escritório |
| `FINANCEIRO`  | Módulo financeiro (despesas)              |
| `OPERACIONAL` | Módulo de processos e clientes            |

### Fronteira do tenant — regra que vale para todo módulo novo

O `companyId` **sempre** vem do token (`@CurrentTenant() user: TenantJwtPayload`),
nunca do body nem da URL. Toda consulta de dado de escritório leva `companyId`
no `where`; id de outra empresa responde 404, não 403, para não revelar que o
registro existe. A única exceção é a sessão da plataforma, que por não ter
empresa precisa informar uma explicitamente (`?companyId=`) — e isso é sempre
explícito no código. Cobertura: `src/**/*.spec.ts` e
`test/tenant-isolation.e2e-spec.ts`.

### Como usar em novos controllers

```typescript
// Dado de escritório (o caso comum)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('rota-protegida')
minhaRota(@CurrentTenant() user: TenantJwtPayload) {
    // user.companyId é number, e vai no where de toda consulta
}

// Rota da plataforma (atravessa escritórios)
@UseGuards(JwtAuthGuard, PlatformGuard)
@Get('rota-da-plataforma')
rotaDaPlataforma(@CurrentPlatform() admin: PlatformJwtPayload) { ... }
```

---

## Swagger / OpenAPI

Disponível em `http://localhost:3000/api/docs`.
Rotas protegidas usam `@ApiBearerAuth()` — clicar em "Authorize" no Swagger UI e colar o JWT.

---

## Prisma

### Modelo `usuario`

```prisma
model Usuario {
  UsuId        Int      @id @default(autoincrement())
  UsuNome      String
  UsuLogin     String
  UsuSenhaHash String
  UsuRole      UsuRole  @default(OPERACIONAL)
  EmpId        Int

  empresa Empresa @relation(fields: [EmpId], references: [EmpId])

  @@unique([EmpId, UsuLogin])
  @@map("usuario")
}
```

O login é único **por empresa** (`@@unique([EmpId, UsuLogin])`), permitindo o mesmo login em empresas diferentes.

### Comandos úteis

```bash
npx prisma migrate dev --name <nome>   # Nova migration
npx prisma generate                    # Regenerar client após mudar schema
npx prisma studio                      # GUI do banco
```

O client gerado fica em `generated/prisma/` (não editar).
Importar tipos do client: `import { UsuRole } from '../../generated/prisma/enums'`

---

## Convenções do projeto

- Controllers não acessam Prisma diretamente — sempre via Service
- Sem lógica de negócio em controllers
- DTOs validados com `class-validator` + `ValidationPipe` global (whitelist + transform habilitados)
- Hash de senha sempre gerado no `AuthService`, nunca no `UsersService`
- Importar `JwtPayload` como `import type` em arquivos com decorators (restrição do `emitDecoratorMetadata`)
