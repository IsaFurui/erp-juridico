# Fase 2 — Tela de Processos (o núcleo)

**Data:** 2026-10-23
**Autoria:** Isabelle (decisões de produto) + Claude (desenho técnico)
**Branch de trabalho:** a criar a partir da `main` (ex.: `feat/fase-2-processos`)

---

## 1. Intenção e o porquê

O backend de processos já existe e responde na API, mas não tem tela — a rota
`/processos` hoje só mostra "Módulo em construção". Processos é o **núcleo do produto**: é a
lista que mais cresce num escritório de verdade. Esta fase constrói a interface de processos
ponta a ponta e completa o que falta no backend pra sustentar essa interface.

O resultado esperado: um usuário de escritório consegue **cadastrar, listar, filtrar, abrir,
editar e acompanhar** um processo pela interface, incluindo o **histórico de status** ao longo
do tempo.

---

## 2. Decisões de produto (já tomadas pela Isabelle)

1. **Lista em cartões.** A listagem de processos é uma grade de cartões (um por processo),
   cada um com número, nome, cliente, tipo, selo de status e os três valores.
2. **Página própria do processo.** Clicar num cartão leva a uma tela só daquele processo
   (rota `/processos/:id`), com dados, valores e histórico de status — não é uma janelinha.
3. **Regra dos três valores:**
   - `fixedAmount` = **Entrada**: o que o cliente paga no começo (dinheiro em mãos).
   - `expectedAmount` = **Êxito esperado**: o que a advocacia espera ganhar no fim (expectativa).
   - `totalAmount` = **Total**: enquanto o processo corre, é calculado e travado
     (`Entrada + Esperado`). Quando o status vira **Concluído**, o advogado pode **editar o
     Total à mão** pra registrar o que realmente entrou (pode diferir da soma).
4. **Visibilidade:** todos os usuários do escritório veem todos os processos do escritório.
   Não existe "advogado responsável" nem filtro por dono. (O isolamento continua sendo só por
   empresa, como já é hoje.)

---

## 3. Padrões de produto assumidos (decisão de Claude; corrigir se divergir)

- **Editar dados** do processo (nome, cliente, tipo, subtipo, valores de entrada/esperado) é
  feito numa **janelinha (modal)** aberta de dentro da página do processo, reusando o padrão
  dos formulários que já existem (`ClientFormModal`).
- **Mudar status** é uma **janelinha curta** que pede o novo status; quando o status escolhido
  é **Concluído**, a mesma janelinha pede o **Total final** ali.
- **Não existe "apagar" processo na interface.** "Encerrar/arquivar" é feito mudando o status
  para **Arquivado** (status que já existe no catálogo). Isso evita perda acidental e usa o que
  já está lá. (O endpoint `DELETE /processes/:id` continua existindo no backend, mas a UI não o
  expõe.)

---

## 4. Escopo — o que entra

### Frontend
- **`ProcessesPage`** (`/processos`): grade de cartões, com
  - busca por nome ou número (com debounce, como em clientes);
  - filtros por **status**, **tipo** e **cliente**;
  - paginação e contador de processos;
  - cada cartão mostra número, nome, cliente, tipo, selo de status e os três valores.
- **`ProcessDetailPage`** (`/processos/:id`):
  - cabeçalho com número, nome e selo de status, e ações "Editar dados" e "Mudar status";
  - painel **Dados** (cliente, tipo, subtipo, aberto em);
  - painel **Valores** (Entrada, Êxito esperado, Total — com a marca de "ajustado" quando for
    o caso e nota explicando);
  - painel **Histórico de status** (linha do tempo: data, status, quem mudou, observação).
- **`ProcessFormModal`**: criar e editar dados do processo, com o combo dependente
  **tipo → subtipo** (endpoint `GET /process-type/:id/subtypes` já existe) e valores em BRL
  (lembrar que `Decimal` chega como string no JSON).
- **`ProcessStatusModal`**: trocar o status; pede o Total final quando o alvo é "Concluído".
- Camada de API (`processes.api.ts`) e tipos em `lib/api.ts`.

### Backend
- **`GET /processes` paginado e com filtros**, reusando `PaginationQueryDto` e o envelope
  `Paginated` de `common/`. Filtros: `statusId`, `typeId`, `clientId`, `search` (nome ou
  código). Sempre escopado pela empresa do token.
- **Nova tabela `ProcessStatusHistory`** + migration. Colunas mínimas: `id`, `processId` (FK),
  `statusId` (FK), `userId` (FK — quem mudou), `changedAt`, `note` (texto opcional, ex.:
  "total ajustado para R$ ..."). `onDelete: Restrict`, no padrão das outras FKs.
- **Registro do histórico:**
  - ao **criar** um processo, grava a primeira linha do histórico com o status inicial;
  - a cada **mudança de status**, grava uma linha nova (nunca sobrescreve).
- **`PATCH /processes/:id/status`** (ADMIN · OPERACIONAL): muda o status, grava o histórico e,
  quando o status alvo é **Concluído**, aceita e persiste o `totalAmount` final.
- **Leitura do histórico:** incluído no `GET /processes/:id` (ou endpoint
  `GET /processes/:id/status-history`) — definir no plano.
- **Regra de valores no service:** enquanto o status **não** é Concluído, `totalAmount` é
  derivado (`fixedAmount + expectedAmount`) na escrita; a edição manual do `totalAmount` só é
  aceita na transição para Concluído.
- **Testes** (unitários + e2e) cobrindo: paginação/filtros escopados por empresa, regra do
  total (travado vs. editável na conclusão), e gravação do histórico.

---

## 5. Fora de escopo (não-metas desta fase)

- Advogado responsável / visibilidade por advogado (decidido: todos veem tudo).
- Módulo Financeiro / Despesas (Fase 3).
- Dashboard / KPIs (Fase 4).
- CRUD de subtipos pelos escritórios (continua só leitura).
- Decisão "catálogo global vs. por escritório" — mantém-se global e a leitura como está hoje;
  essa decisão fica para depois e não bloqueia a tela.
- Número de processo único global vs. por empresa (bug conhecido do dossiê) — não se mexe aqui.
- CORS, docker-compose completo, produção (Fase 5).

---

## 6. Decisões resolvidas durante o levantamento do código

- **O que é "encerramento" (destrava o Total).** Não existe um status "Concluído"; o catálogo
  tem 13 status. A Isabelle confirmou que **5 deles são de fim de processo** e destravam o
  Total: **Encerrado com êxito, Encerrado sem êxito, Acordo celebrado, Arquivado, Prescrito**.
  Os outros 8 mantêm o Total travado e calculado.
- **Como o sistema sabe disso:** em vez de chumbar nomes/ids no código, a tabela de status
  ganha uma marca `isFinal` (booleano). Os 5 de encerramento ficam `isFinal = true` no seed.
  Assim o front e o back decidem "está encerrado?" lendo o dado, e um status novo criado por
  um ADMIN pode ser marcado no futuro sem mexer no código.
- **"Arquivar" em vez de apagar** é mudar o status para **Arquivado** (que também é `isFinal`).

### Pontos menores que ficam para o plano/implementação

- **`totalAmount` ao reabrir** um processo encerrado (ex.: de "Arquivado" volta para "Em
  recurso"): o Total volta a ser derivado (`Entrada + Esperado`), porque deixou de estar
  encerrado. O valor ajustado anterior não é preservado (registro fica no histórico).
- Formato e máscara de moeda (BRL) na entrada dos campos de valor.

---

## 7. Como o trabalho é entregue

- Desenvolvimento **somente na máquina da operadora** (nada de deploy em servidor).
- Toda alteração vai em **branch a partir da `main`**, nunca direto na `main`.
- Ao concluir, abre-se **PR** para a `main`; a produção é disparada pelo merge humano (esteira
  vibe). Notificação pelo Discord quando o PR estiver pronto.
- Backend e frontend com seus checks passando (testes do backend, `tsc`/lint do frontend).
