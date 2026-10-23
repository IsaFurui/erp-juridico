# Processos — Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a tela de processos ponta a ponta (lista em cartões + página própria com histórico de status), com os ajustes de backend que ela exige.

**Architecture:** Backend NestJS/Prisma seguindo os padrões já estabelecidos (controller → service → Prisma, DTOs validados, `companyId` sempre do token). O histórico de status é uma tabela nova que ganha uma linha a cada mudança. O que é "encerramento" vira uma flag `isFinal` no catálogo de status, que destrava a edição do `totalAmount`. Frontend React/Vite espelhando o módulo de clientes (lista paginada) mais uma página de detalhe nova.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 16, React 19, Vite 8, class-validator, Swagger.

**Spec:** `docs/superpowers/specs/2026-10-23-processos-fase-2-design.md`

## Global Constraints

- **Fronteira do tenant:** `companyId` **sempre** vem do token (`@CurrentTenant() user: TenantJwtPayload`), nunca do body nem da URL. Toda consulta de dado de escritório leva `companyId` no `where`; registro de outra empresa responde **404**, não 403.
- **Camadas:** controllers não acessam Prisma direto — sempre via service; sem lógica de negócio em controller.
- **DTOs** validados com `class-validator`; o `ValidationPipe` global tem `whitelist` + `forbidNonWhitelisted` + `transform` — todo parâmetro de query/body precisa estar declarado no DTO.
- **Dinheiro** é `Decimal(12,2)`: chega no JSON como **string**; o frontend converte para número ao formatar/calcular, e trata `null` em `fixedAmount`/`expectedAmount`.
- **Prisma:** client gerado em `generated/prisma`; rodar `npx prisma generate` após mexer no schema. Importar `JwtPayload`/tipos de enum com `import type` em arquivos com decorators.
- **Paginação:** reusar `PaginationQueryDto`, `resolvePagination`, `buildPaginated` e o envelope `Paginated<T>` de `common/`. Teto de `pageSize` = 100; default = 20.
- **Backend gate:** `npm test` (jest, não precisa de banco) e `npm run test:e2e` (precisa do Postgres de pé). **Frontend gate:** `npx tsc -b` e `npm run lint` — o frontend não tem test runner, então a verificação das tarefas de front é typecheck + lint limpos.
- **Entrega:** desenvolvimento só na máquina local; commits locais por tarefa numa branch a partir da `main` (ex.: `feat/fase-2-processos`), **nunca** na `main`. Push e PR pela esteira da casa (MCP GarraV8 `github_*`), **nunca** `git push`.

## Review Focus

- **Editar Entrada/Esperado num processo não encerrado tem de recalcular o Total.** Se esquecer, o Total fica velho. → coberto no Task 4.
- **Reabrir um processo encerrado (status final → não-final) tem de voltar o Total a ser derivado.** → coberto no Task 5.
- **Filtros da lista (`statusId`/`typeId`/`clientId`) não podem furar o escopo da empresa** — um id de outra empresa ainda tem de ficar preso ao `companyId` do token. → coberto no Task 2.
- **`Decimal` chega como string e `fixedAmount`/`expectedAmount` podem ser `null`** — o formatador de moeda do front não pode quebrar com string nem com null. → coberto no Task 8.
- **Subtipo que não pertence ao tipo escolhido → 400** deve continuar valendo depois do refactor do service. → coberto no Task 3.

---

### Task 1: Schema — flag `isFinal`, tabela de histórico e seed

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Create: `backend/prisma/migrations/<timestamp>_process_status_history_and_final_flag/` (gerada pelo Prisma)

**Interfaces:**
- Produces: `ProcessStatus.isFinal: boolean` (default `false`); model `ProcessStatusHistory { id, processId, statusId, userId, changedAt, note }` com relações para `Process.statusHistory`, `ProcessStatus.history`, `User.statusChanges`.

- [ ] **Step 1: Adicionar a flag e a tabela ao schema**

Em `schema.prisma`:
- `model ProcessStatus`: adicionar `isFinal Boolean @default(false)` e a relação `history ProcessStatusHistory[]`.
- `model Process`: adicionar a relação `statusHistory ProcessStatusHistory[]`.
- `model User`: adicionar a relação `statusChanges ProcessStatusHistory[]`.
- Novo model:

```prisma
model ProcessStatusHistory {
  id        Int      @id @default(autoincrement())
  processId Int
  statusId  Int
  userId    Int
  changedAt DateTime @default(now())
  note      String?

  process Process       @relation(fields: [processId], references: [id], onDelete: Restrict)
  status  ProcessStatus @relation(fields: [statusId], references: [id], onDelete: Restrict)
  user    User          @relation(fields: [userId], references: [id], onDelete: Restrict)
}
```

- [ ] **Step 2: Gerar a migration e o client**

Run: `cd backend && npx prisma migrate dev --name process_status_history_and_final_flag`
Expected: migration criada e aplicada; `generated/prisma` regenerado sem erro.

- [ ] **Step 3: Marcar os 5 status de encerramento no seed**

Em `seed.ts`, declarar o conjunto dos finais e usar no upsert (tanto no `create` quanto no `update`, para ser idempotente em banco já populado):

```ts
const FINAL_STATUSES = new Set([
  'Encerrado com êxito',
  'Encerrado sem êxito',
  'Acordo celebrado',
  'Arquivado',
  'Prescrito',
]);
// no loop de PROCESS_STATUSES:
const isFinal = FINAL_STATUSES.has(description);
await prisma.processStatus.upsert({
  where: { description },
  update: { isFinal },
  create: { description, isFinal },
});
```

- [ ] **Step 4: Rodar o seed e conferir**

Run: `cd backend && npx prisma db seed`
Expected: roda sem erro; exatamente **5** status com `isFinal = true` (conferir via `npx prisma studio` ou um `SELECT count(*) from "ProcessStatus" where "isFinal" = true;`).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/seed.ts backend/prisma/migrations
git commit -m "feat(process): adiciona histórico de status e flag isFinal no catálogo"
```

---

### Task 2: Backend — lista paginada e filtrada (`GET /processes`)

**Files:**
- Create: `backend/src/process/dto/list-processes-query.dto.ts`
- Modify: `backend/src/process/process.service.ts` (`listAll`)
- Modify: `backend/src/process/process.controller.ts` (`listAll`)
- Create/estender: `backend/src/process/process.service.spec.ts`

**Interfaces:**
- Produces: `ListProcessesQueryDto extends PaginationQueryDto { statusId?: number; typeId?: number; clientId?: number }` (herda `page`, `pageSize`, `search`). `ProcessService.listAll(companyId: number, query: ListProcessesQueryDto): Promise<Paginated<ProcessListItem>>`.
- Consumes: `resolvePagination`, `buildPaginated`, `Paginated` de `common/paginated`.

- [ ] **Step 1: Escrever os testes que falham** em `process.service.spec.ts` (espelhar `clients.service.spec.ts`: mock de `PrismaService` com `process.findMany`/`process.count` dentro de `$transaction.mockResolvedValue([[], 0])`):

```ts
it('filtra sempre pela empresa do token', async () => {
  await service.listAll(7, {});
  expect(findManyArgs().where).toMatchObject({ companyId: 7 });
});

it('aplica filtros de status, tipo e cliente sem perder o tenant', async () => {
  await service.listAll(7, { statusId: 2, typeId: 3, clientId: 4 });
  expect(findManyArgs().where).toMatchObject({
    companyId: 7, statusId: 2, typeId: 3, clientId: 4,
  });
});

it('busca por nome ou código', async () => {
  await service.listAll(7, { search: 'souza' });
  expect(findManyArgs().where.OR).toEqual([
    { name: { contains: 'souza', mode: 'insensitive' } },
    { code: { contains: 'souza', mode: 'insensitive' } },
  ]);
});

it('devolve o envelope paginado', async () => {
  $transaction.mockResolvedValue([[{ id: 1 }], 42]);
  const r = await service.listAll(7, { pageSize: 20 });
  expect(r).toEqual({ items: [{ id: 1 }], total: 42, page: 1, pageSize: 20, pages: 3 });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm test -- process.service`
Expected: FAIL (assinatura antiga de `listAll`).

- [ ] **Step 3: Criar o DTO e implementar `listAll`**

`ListProcessesQueryDto`: estende `PaginationQueryDto`; `statusId`/`typeId`/`clientId` opcionais com `@IsOptional() @Type(() => Number) @IsInt() @IsPositive()` e `@ApiPropertyOptional`.

Em `process.service.ts`, trocar o `listAll(companyId)` pela versão paginada: `buildListWhere(companyId, query)` monta `{ companyId, ...(statusId), ...(typeId), ...(clientId) }` e, quando há `search.trim()`, adiciona `OR: [{ name: contains insensitive }, { code: contains insensitive }]`; usar `$transaction([findMany({ where, select: PUBLIC_SELECT, orderBy: { createdAt: 'desc' }, skip, take }), count({ where })])` e `buildPaginated`. Adicionar `isFinal: true` ao `status.select` do `PUBLIC_SELECT`.

- [ ] **Step 4: Ligar o controller**

Em `process.controller.ts`, `listAll` recebe `@Query() query: ListProcessesQueryDto` e chama `this.processService.listAll(user.companyId, query)`. Atualizar o `@ApiOperation` para "listar processos da empresa (paginado)".

- [ ] **Step 5: Rodar os testes**

Run: `cd backend && npm test -- process.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/process
git commit -m "feat(process): lista paginada com filtros de status, tipo, cliente e busca"
```

---

### Task 3: Backend — criar processo grava histórico + regra do Total

**Files:**
- Modify: `backend/src/process/process.service.ts` (`create`, helper de total, `PUBLIC_SELECT`/`DETAIL_SELECT`)
- Modify: `backend/src/process/process.controller.ts` (`create` passa `user.sub`)
- Modify: `backend/src/process/process.service.spec.ts`

**Interfaces:**
- Produces: `ProcessService.create(dto: CreateProcessDto, companyId: number, userId: number)`; `private computeTotal(fixed, expected): number` = `Number(fixed ?? 0) + Number(expected ?? 0)`; `private async isFinalStatus(statusId): Promise<boolean>`.
- Consumes: `isFinal` do Task 1.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('deriva o Total quando o status não é de encerramento', async () => {
  // status.findUnique → { isFinal: false }
  await service.create(dtoComFixed3000Expected25000, 7, 1);
  expect(txCreateProcessArgs().data.totalAmount).toBe(28000);
});

it('aceita o Total informado quando o status é de encerramento', async () => {
  // status.findUnique → { isFinal: true }; dto.totalAmount = 22500
  await service.create({ ...dto, totalAmount: 22500 }, 7, 1);
  expect(txCreateProcessArgs().data.totalAmount).toBe(22500);
});

it('grava a primeira linha do histórico ao criar', async () => {
  await service.create(dto, 7, 1);
  expect(txCreateHistoryArgs().data).toMatchObject({
    statusId: dto.statusId, userId: 1, note: 'Processo criado',
  });
});
```

(O `create` passa a usar a forma de callback do `$transaction`, porque o histórico precisa do `id` do processo recém-criado. No teste: `$transaction.mockImplementation(cb => cb(txMock))`, com `txMock.process.create` e `txMock.processStatusHistory.create`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm test -- process.service`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Em `create(dto, companyId, userId)`: manter os `ensure*` atuais; resolver `isFinal` do `statusId`; `totalAmount = isFinal && dto.totalAmount != null ? dto.totalAmount : computeTotal(dto.fixedAmount, dto.expectedAmount)`. Rodar dentro de `this.prisma.$transaction(async (tx) => { const p = await tx.process.create({ data: {…, totalAmount}, select: DETAIL_SELECT }); await tx.processStatusHistory.create({ data: { processId: p.id, statusId: dto.statusId, userId, note: 'Processo criado' } }); return p; })`. Definir `DETAIL_SELECT` = `PUBLIC_SELECT` + `statusHistory` (ordenado por `changedAt desc`, com `status { id, description, isFinal }` e `user { id, name }`). `create` e `findById` retornam `DETAIL_SELECT`.

- [ ] **Step 4: Ligar o controller**

`create(@Body() dto, @CurrentTenant() user)` → `this.processService.create(dto, user.companyId, user.sub)`.

- [ ] **Step 5: Rodar os testes**

Run: `cd backend && npm test -- process.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/process
git commit -m "feat(process): grava histórico na criação e aplica a regra do Total"
```

---

### Task 4: Backend — editar dados recalcula o Total (sem mexer no status)

**Files:**
- Modify: `backend/src/process/dto/update-process.dto.ts` (remover `statusId` e `totalAmount`)
- Modify: `backend/src/process/process.service.ts` (`update`)
- Modify: `backend/src/process/process.service.spec.ts`

**Interfaces:**
- Produces: `UpdateProcessDto` passa a conter só `name?`, `code?`, `clientId?`, `typeId?`, `subtypeId?`, `fixedAmount?`, `expectedAmount?`. `ProcessService.update(id, dto, companyId)` revalida FKs e recalcula o Total conforme o status atual.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('recalcula o Total ao editar Entrada/Esperado num processo não encerrado', async () => {
  // findById atual → status.isFinal: false, fixed 3000, expected 25000
  await service.update(1, { expectedAmount: 30000 }, 7);
  expect(updateArgs().data.totalAmount).toBe(33000); // 3000 + 30000
});

it('não mexe no Total quando o processo já está encerrado', async () => {
  // findById atual → status.isFinal: true, totalAmount ajustado
  await service.update(1, { fixedAmount: 1 }, 7);
  expect(updateArgs().data.totalAmount).toBeUndefined();
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `cd backend && npm test -- process.service` / Expected: FAIL.

- [ ] **Step 3: Implementar**

Remover `statusId` e `totalAmount` do `UpdateProcessDto`. Em `update`: carregar o processo atual (incluindo `status.isFinal`, `fixedAmount`, `expectedAmount`); revalidar FKs que mudaram (como hoje); se o status atual **não** é final, `data.totalAmount = computeTotal(dto.fixedAmount ?? current.fixedAmount, dto.expectedAmount ?? current.expectedAmount)`; se é final, **não** setar `totalAmount`. Retornar `DETAIL_SELECT`.

- [ ] **Step 4: Rodar os testes** — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/process
git commit -m "feat(process): edição de dados recalcula o Total e não altera status"
```

---

### Task 5: Backend — mudar status (`PATCH /processes/:id/status`) + histórico + detalhe

**Files:**
- Create: `backend/src/process/dto/change-process-status.dto.ts`
- Modify: `backend/src/process/process.service.ts` (`changeStatus`, `findById` com histórico)
- Modify: `backend/src/process/process.controller.ts` (nova rota)
- Modify: `backend/src/process/process.service.spec.ts`

**Interfaces:**
- Produces: `ChangeProcessStatusDto { statusId: number; totalAmount?: number; note?: string }`. `ProcessService.changeStatus(id, dto, companyId, userId): Promise<ProcessDetail>`. `GET /processes/:id` retorna `statusHistory`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('ao encerrar, aceita o Total final e registra o histórico', async () => {
  // process atual fixed 4000 expected 18000; novo status isFinal: true
  await service.changeStatus(1, { statusId: 9, totalAmount: 22500 }, 7, 1);
  expect(txUpdateArgs().data).toMatchObject({ statusId: 9, totalAmount: 22500 });
  expect(txHistoryArgs().data).toMatchObject({ processId: 1, statusId: 9, userId: 1 });
});

it('ao reabrir (status não-final), volta o Total a ser derivado', async () => {
  // process atual fixed 4000 expected 18000, estava encerrado; novo status isFinal: false
  await service.changeStatus(1, { statusId: 1 }, 7, 1);
  expect(txUpdateArgs().data).toMatchObject({ statusId: 1, totalAmount: 22000 });
});

it('processo de outra empresa responde 404', async () => {
  // findFirst → null
  await expect(service.changeStatus(1, { statusId: 1 }, 7, 1))
    .rejects.toThrow('Processo não encontrado');
});
```

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.

- [ ] **Step 3: Implementar**

`ChangeProcessStatusDto`: `statusId` (`@IsInt @IsPositive`), `totalAmount?` (`@IsOptional @IsNumber({maxDecimalPlaces:2}) @Min(0)`), `note?` (`@IsOptional @IsString @MaxLength(255)`).

`changeStatus(id, dto, companyId, userId)`: `findById`-guard por empresa (404 se de outra); resolver `isFinal` do novo status; `total = isFinal ? (dto.totalAmount ?? computeTotal(current.fixed, current.expected)) : computeTotal(current.fixed, current.expected)`; montar `note` (se `isFinal` e `dto.totalAmount != null`, `note = dto.note ?? 'Total ajustado para ' + totalFmt`; senão `dto.note ?? null`); `$transaction(async tx => { await tx.process.update({ where:{id}, data:{ statusId: dto.statusId, totalAmount } }); await tx.processStatusHistory.create({ data:{ processId:id, statusId:dto.statusId, userId, note } }); })`; retornar `this.findById(id, companyId)`.

`findById`: trocar o `select` para `DETAIL_SELECT` (com `statusHistory`).

Controller: nova rota

```ts
@Patch(':id/status')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERACIONAL)
changeStatus(@Param('id', ParseIntPipe) id, @Body() dto: ChangeProcessStatusDto, @CurrentTenant() user) {
  return this.processService.changeStatus(id, dto, user.companyId, user.sub);
}
```

- [ ] **Step 4: Rodar os testes** — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/process
git commit -m "feat(process): mudança de status com histórico e Total de encerramento"
```

---

### Task 6: Backend — e2e de isolamento e histórico

**Files:**
- Modify: `backend/test/tenant-isolation.e2e-spec.ts` (ou novo `backend/test/process.e2e-spec.ts`, espelhando o harness existente)

**Interfaces:**
- Consumes: as rotas dos Tasks 2–5.

- [ ] **Step 1: Escrever os casos e2e** (precisa do Postgres de pé): criar duas empresas; cada uma cria cliente e processo; verificar que `GET /processes` de uma não traz o processo da outra; `GET /processes/:id` de outra empresa → 404; `PATCH /processes/:id/status` para um status `isFinal` com `totalAmount` persiste o valor e adiciona linha ao `statusHistory`; `PATCH /processes/:id/status` para status não-final re-deriva o Total.

- [ ] **Step 2: Rodar** — Run: `cd backend && npm run test:e2e` / Expected: PASS (todos, inclusive os antigos).

- [ ] **Step 3: Commit**

```bash
git add backend/test
git commit -m "test(process): e2e de isolamento por empresa e histórico de status"
```

---

### Task 7: Frontend — camada de API e tipos de processos

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/features/processes/processes.api.ts`

**Interfaces:**
- Produces (em `lib/api.ts`): tipos `ProcessStatus { id; description; isFinal }`, `ProcessType { id; name }`, `ProcessSubtype { id; name; processTypeId }`, `ProcessRef = { id; name }`, `ProcessListItem { id; name; code; fixedAmount: string|null; expectedAmount: string|null; totalAmount: string; client: ProcessRef; type: ProcessRef; subtype: ProcessRef|null; status: { id; description; isFinal }; createdAt; updatedAt }`, `ProcessStatusHistoryItem { id; changedAt; note: string|null; status: { id; description; isFinal }; user: { id; name } }`, `ProcessDetail = ProcessListItem & { statusHistory: ProcessStatusHistoryItem[] }`, `ListProcessesParams { page?; pageSize?; search?; statusId?; typeId?; clientId? }`, `CreateProcessPayload`, `UpdateProcessPayload`, `ChangeProcessStatusPayload { statusId: number; totalAmount?: number; note?: string }`; e os objetos `processesApi`, `processStatusApi.listAll()`, `processTypeApi.listAll()` / `.listSubtypes(id)`.
- Consumes: `request`, `toQuery`, `Paginated`.

- [ ] **Step 1: Declarar os tipos e os clientes de API** espelhando `clientsApi` (`listAll` com `toQuery`, `create`, `update`, e `changeStatus: (id, payload) => request('/processes/'+id+'/status', { method:'PATCH', body: JSON.stringify(payload) })`; `getById: (id) => request('/processes/'+id)`). `processStatusApi.listAll(): Promise<ProcessStatus[]>` → `GET /process-status`; `processTypeApi.listAll(): Promise<ProcessType[]>` → `GET /process-type`; `processTypeApi.listSubtypes(id): Promise<ProcessSubtype[]>` → `GET /process-type/:id/subtypes`.

- [ ] **Step 2: Wrapper de feature** `processes.api.ts` espelhando `clients.api.ts` (funções `listProcesses`, `getProcess`, `createProcess`, `updateProcess`, `changeProcessStatus`, `listProcessStatuses`, `listProcessTypes`, `listSubtypes`).

- [ ] **Step 3: Verificar** — Run: `cd frontend && npx tsc -b` / Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/features/processes/processes.api.ts
git commit -m "feat(process): camada de API e tipos de processos no frontend"
```

---

### Task 8: Frontend — helper de moeda e `ProcessesPage` (cartões) + rotas

**Files:**
- Create: `frontend/src/lib/money.ts`
- Create: `frontend/src/features/processes/ProcessesPage.tsx`, `ProcessesPage.css`
- Create: `frontend/src/features/processes/status-variant.ts`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/lib/constants.ts`

**Interfaces:**
- Produces: `formatBRL(value: string | number | null): string` (trata `null` → "—"; converte string de `Decimal`); `statusVariant(description: string): 'success'|'warning'|'info'|'neutral'` (mapa dos 13 status → variante de `Badge`); `processDetailPath(id: number): string`.
- Consumes: `processes.api.ts`, `Badge`, `Icon`, `Button`.

- [ ] **Step 1: `money.ts`** — `formatBRL` usando `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`; `null`/`''` → `'—'`; aceita string (`Number(value)`).

- [ ] **Step 2: `status-variant.ts`** — mapa: encerrados com êxito/acordo → `success`; encerrado sem êxito/prescrito → `error`→usar `neutral` ou `warning` (escolha do implementador, consistente); aguardando/suspenso/sobrestado → `warning`; em andamento/em recurso → `info`; arquivado → `neutral`. Default `neutral`.

- [ ] **Step 3: `ProcessesPage`** espelhando `ClientsPage` (busca com debounce 350ms, `reloadKey`, `page`, estados loading/error/empty, contador). Em vez de `<table>`, uma grade de cartões (`.proc-grid`): cada cartão mostra `code`, `name`, `client.name · type.name`, `Badge` de status (`statusVariant`) e os três valores (`formatBRL`), e navega para `processDetailPath(p.id)` ao clicar. Toolbar com busca + três `<select>` (status, tipo, cliente) carregados de `listProcessStatuses`/`listProcessTypes`/`listClients`. Botão "Novo processo" abre o `ProcessFormModal` (Task 9). Paginação igual à de clientes.

- [ ] **Step 4: Rotas** — em `constants.ts` adicionar `processDetailPath`; em `router.tsx` trocar o `ComingSoon` de `processes` por `<ProcessesPage/>` e adicionar `<Route path="/processos/:id" element={<TenantRoute><ProcessDetailPage/></TenantRoute>} />` (o componente chega no Task 10 — por ora importar e deixar a rota pronta pode quebrar o build, então adicionar esta rota junto no Task 10).

- [ ] **Step 5: Verificar** — Run: `cd frontend && npx tsc -b && npm run lint` / Expected: sem erros. Subir o app e confirmar que a lista de processos carrega em cartões, filtra e pagina.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(process): tela de processos em cartões com busca, filtros e paginação"
```

---

### Task 9: Frontend — `ProcessFormModal` (criar/editar dados)

**Files:**
- Create: `frontend/src/features/processes/ProcessFormModal.tsx`, `ProcessFormModal.css`

**Interfaces:**
- Produces: `ProcessFormModal({ opened, initial: ProcessDetail | null, onClose, onSaved })`.
- Consumes: `Modal`, `Input`, `Button`, `createProcess`/`updateProcess`, `listProcessTypes`/`listSubtypes`/`listClients`.

- [ ] **Step 1: Campos** — `name`, `code`, `client` (select), `type` (select), `subtype` (select dependente: recarrega via `listSubtypes(typeId)` quando o tipo muda; limpa a seleção se o subtipo não pertencer mais), `fixedAmount` e `expectedAmount` (inputs em BRL, convertidos para número no submit). **Sem** campo de status e **sem** campo de Total (o Total é derivado; status muda pela outra janelinha). Na edição, `code` e os campos vêm de `initial`.

- [ ] **Step 2: Submit** — validar nome (≥2), código (≥1), cliente/tipo obrigatórios; `createProcess`/`updateProcess`; `onSaved` + `onClose`; tratar erro no padrão `ui-alert ui-alert--error`.

- [ ] **Step 3: Verificar** — Run: `cd frontend && npx tsc -b && npm run lint` / Expected: sem erros. No app: criar e editar um processo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/processes
git commit -m "feat(process): formulário de criar e editar processo com combo tipo→subtipo"
```

---

### Task 10: Frontend — `ProcessDetailPage` + `ProcessStatusModal`

**Files:**
- Create: `frontend/src/features/processes/ProcessDetailPage.tsx`, `ProcessDetailPage.css`
- Create: `frontend/src/features/processes/ProcessStatusModal.tsx`
- Modify: `frontend/src/app/router.tsx` (rota `/processos/:id`)

**Interfaces:**
- Produces: `ProcessDetailPage` (lê `:id` de `useParams`, carrega `getProcess`); `ProcessStatusModal({ opened, process, statuses, onClose, onSaved })`.
- Consumes: `getProcess`, `changeProcessStatus`, `listProcessStatuses`, `formatBRL`, `statusVariant`, `Badge`, `Button`.

- [ ] **Step 1: `ProcessDetailPage`** — cabeçalho com `code`, `name`, `Badge` de status e ações "Voltar", "Editar dados" (abre `ProcessFormModal` com `initial`), "Mudar status" (abre `ProcessStatusModal`). Painel **Dados** (cliente, tipo, subtipo, aberto em — `toLocaleDateString('pt-BR')`). Painel **Valores** (Entrada, Esperado, Total via `formatBRL`; mostrar o marcador "ajustado" quando `status.isFinal` e `Number(totalAmount) !== Number(fixedAmount||0)+Number(expectedAmount||0)`). Painel **Histórico de status** (linha do tempo a partir de `statusHistory`: data, `status.description`, `user.name`, `note`). Estados loading/error; recarregar após cada escrita.

- [ ] **Step 2: `ProcessStatusModal`** — `<select>` com os status (`listProcessStatuses`); quando o status escolhido tem `isFinal === true`, exibir o campo **Total final** (BRL, pré-preenchido com o Total atual); submit chama `changeProcessStatus(process.id, { statusId, totalAmount? })`; `onSaved`.

- [ ] **Step 3: Rota** — adicionar em `router.tsx` a rota `/processos/:id` dentro de `TenantRoute`, importando `ProcessDetailPage`.

- [ ] **Step 4: Verificar** — Run: `cd frontend && npx tsc -b && npm run lint` / Expected: sem erros. No app: abrir um processo, mudar status para um de encerramento (aparece o Total final), e ver a linha nova no histórico.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(process): página do processo com valores e histórico de status"
```

---

## Notas de verificação final (antes do PR)

- `cd backend && npm test && npm run test:e2e` — tudo verde (e2e com Postgres de pé).
- `cd frontend && npx tsc -b && npm run lint` — sem erros.
- Smoke test manual pelo fluxo da seção 00 do dossiê: entrar como escritório, criar processo, filtrar, abrir, editar, mudar status para encerramento e ajustar o Total, conferir o histórico.
- Abrir o PR para a `main` pela esteira da casa (MCP `github_*`) e notificar no Discord `#validacao-projetos`.
