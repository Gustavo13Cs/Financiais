# Arquitetura e Back-end — Painel de Finanças Pessoais

> Documento de referência para implementação (humana ou assistida por IA). Complementa o prompt de front-end do Stitch.
> Regra de ouro: **simples de operar, fácil de evoluir, impossível de errar conta.**

---

## 1. Visão geral

App web de controle financeiro pessoal (um usuário), substituindo planilha. Precisa de:

- Lançamentos rápidos e flexíveis (entradas fixas, **extras avulsos**, gastos fixos e variáveis)
- Visões por **semana, mês e ano**
- Gráficos e totais calculados no back-end (uma fonte de verdade)
- Recorrências e parcelamentos sem perder a liberdade de ajustar um mês específico
- Metas/reservas com aportes
- Importar/exportar planilha (CSV/XLSX)

**Escopo fora (por enquanto):** multiusuário, integração bancária (Open Finance), planos/assinatura, multi-moeda.

---

## 2. Decisões de stack

| Camada | Escolha | Motivo |
|---|---|---|
| Front-end | Next.js (App Router) + TypeScript + Tailwind | Já combina com o design gerado no Stitch; deploy simples na Vercel |
| Back-end | NestJS + TypeScript | Estrutura modular opinativa, ótimo para manter organizado |
| Banco | PostgreSQL (Supabase gerenciado) | Relacional, agregações fortes (`GROUP BY`, window functions), backup incluso |
| ORM | Prisma | Tipagem forte, migrations versionadas |
| Validação | Zod (compartilhado) ou class-validator | Contrato único entre front e API |
| Auth | Supabase Auth (JWT) ou JWT próprio com refresh | App é público na internet, então precisa de login mesmo sendo pessoal |
| Testes | Vitest/Jest + Supertest + Testcontainers (ou banco de teste) | Regra financeira precisa de teste |
| Monorepo | pnpm workspaces (+ Turborepo opcional) | Compartilhar tipos e schemas |
| CI/CD | GitHub Actions → Vercel (web) e Railway/Render/Fly (API) | Deploy automático por branch |

> Alternativa mais enxuta: dispensar o NestJS e usar Route Handlers/Server Actions do Next.js direto com Prisma + Supabase. Só vale se a API não for ser consumida por outro cliente. A arquitetura de domínio abaixo vale nos dois casos.

---

## 3. Arquitetura

### 3.1 Estilo

**Monólito modular** com camadas claras. Sem microsserviços: é um app pessoal, complexidade desnecessária só atrapalha.

```
[ Next.js (web) ]  --HTTPS/JSON-->  [ NestJS API ]  --Prisma-->  [ PostgreSQL ]
                                         |
                                  módulos de domínio
```

### 3.2 Camadas dentro de cada módulo

```
Controller  →  Service (regras de negócio)  →  Repository (Prisma)  →  DB
   ↑ DTO/validação                ↑ funções puras de cálculo (testáveis sem banco)
```

- **Controller:** só HTTP (rota, DTO, status code). Zero regra de negócio.
- **Service:** orquestra e aplica regras.
- **Repository:** único lugar que fala com o Prisma.
- **Domínio puro (`domain/`):** funções sem dependência de framework (ex.: gerar ocorrências de recorrência, calcular projeção). É onde mora o teste mais importante.

### 3.3 Estrutura de pastas

```
financas/
├─ apps/
│  ├─ web/                      # Next.js
│  └─ api/
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ app.module.ts
│     │  ├─ common/             # filters, guards, interceptors, pipes, decorators
│     │  ├─ config/             # env validada (zod)
│     │  ├─ prisma/             # PrismaService
│     │  └─ modules/
│     │     ├─ auth/
│     │     ├─ transactions/
│     │     ├─ categories/
│     │     ├─ recurrences/
│     │     ├─ goals/
│     │     ├─ reports/         # dashboard, mensal, anual, projeção
│     │     ├─ settings/
│     │     ├─ import-export/
│     │     └─ health/
│     ├─ prisma/
│     │  ├─ schema.prisma
│     │  ├─ migrations/
│     │  └─ seed.ts
│     └─ test/
├─ packages/
│  └─ shared/                   # schemas zod, tipos, enums, utils de dinheiro/data
├─ docs/
│  ├─ adr/                      # decisões de arquitetura (0001-..., 0002-...)
│  └─ api.md
├─ .github/workflows/
├─ docker-compose.yml           # Postgres local
├─ .env.example
└─ README.md
```

Cada módulo: `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/`, `domain/`, `*.spec.ts`.

---

## 4. Modelo de dados

### 4.1 Regras transversais

- **Dinheiro nunca em `float`.** Usar `Decimal(14,2)` no Postgres/Prisma (ou inteiro em centavos). No TypeScript, tratar com `decimal.js`/`Prisma.Decimal` ou centavos como `number` inteiro. Definir **uma** convenção e respeitar em todo o projeto.
- Todas as tabelas de negócio têm `user_id` (mesmo sendo single-user, deixa a porta aberta e força boa prática de isolamento).
- IDs `uuid`. Campos `created_at` e `updated_at`.
- **Soft delete** em lançamentos (`deleted_at`) para suportar "Desfazer" e auditoria.
- Datas: `date` para data do lançamento, `timestamptz` para timestamps. Timezone padrão `America/Maceio`/`America/Sao_Paulo` (definir uma; exibir sempre no fuso do usuário).

### 4.2 Entidades

**User** — `id`, `email`, `name`, (campos de auth conforme provedor)

**Settings** — `user_id (pk)`, `financial_month_start_day` (1–28, default 1), `theme`, `currency` (default `BRL`), `locale` (`pt-BR`)

**Category**
- `id`, `user_id`, `name`, `kind` (`INCOME` | `EXPENSE`), `icon`, `color`
- `monthly_limit` (nullable, decimal), `archived_at` (nullable)
- Unique: `(user_id, kind, name)`

**Transaction** (a tabela central)
- `id`, `user_id`
- `kind`: `INCOME` | `EXPENSE` | `GOAL_CONTRIBUTION`
- `nature`: `FIXED` | `VARIABLE` | `EXTRA` (EXTRA = dinheiro avulso, aparece destacado nos gráficos)
- `description`, `amount` (sempre positivo; o sinal vem de `kind`)
- `date` (data do lançamento), `competence_month` (`YYYY-MM`, calculado a partir do dia de virada do mês financeiro)
- `status`: `PENDING` | `SETTLED` (pago/recebido)
- `category_id` (nullable para aporte de meta), `goal_id` (nullable)
- `recurrence_rule_id` (nullable), `is_override` (bool: ajuste manual de uma ocorrência gerada)
- `installment_group_id` (nullable), `installment_number`, `installment_total`
- `notes`, `deleted_at`, `created_at`, `updated_at`
- Índices: `(user_id, competence_month)`, `(user_id, date)`, `(user_id, category_id, competence_month)`, `(recurrence_rule_id)`

**RecurrenceRule**
- `id`, `user_id`, `kind`, `nature`, `description`, `amount`, `category_id`
- `frequency`: `MONTHLY` | `WEEKLY` | `YEARLY`
- `day_of_month` (ou `weekday` para semanal), `start_date`, `end_date` (nullable), `active`
- `generated_until` (data até a qual já foram materializadas ocorrências)

**Goal**
- `id`, `user_id`, `name`, `target_amount`, `target_date` (nullable), `icon`, `color`, `archived_at`
- Valor guardado = soma dos `GOAL_CONTRIBUTION` ligados à meta (não armazenar saldo duplicado)

### 4.3 Diagrama (resumo)

```
User 1─* Category
User 1─* Transaction *─1 Category
User 1─* RecurrenceRule 1─* Transaction
User 1─* Goal 1─* Transaction (kind=GOAL_CONTRIBUTION)
User 1─1 Settings
```

---

## 5. Regras de negócio críticas

1. **Mês financeiro:** se `financial_month_start_day = 5`, o lançamento do dia 03/10 pertence à competência `2026-09`. A função `getCompetenceMonth(date, startDay)` vive em `packages/shared` e é **coberta por testes** (virada de mês, ano, fevereiro).
2. **Recorrência materializada:** ao criar uma regra, o sistema gera as transações dos próximos N meses (ex.: 12). Um job (cron diário ou ao abrir o mês) completa até `generated_until`. Editar **uma ocorrência** marca `is_override = true` e ela não é sobrescrita se a regra mudar. Editar **a regra** oferece: "só daqui pra frente" ou "todas as não ajustadas".
3. **Parcelamento:** criar compra em X vezes gera X transações com o mesmo `installment_group_id`, uma por mês. Excluir pode ser "só esta" ou "esta e as próximas".
4. **Entrada extra:** `nature = EXTRA` é primeira classe. Toda agregação deve permitir separar renda fixa de extra.
5. **Saldo do mês:** `entradas SETTLED − saídas SETTLED`. Visões complementares: **previsto** (inclui `PENDING`) e **realizado** (só `SETTLED`).
6. **Aporte em meta** sai do saldo disponível, mas não conta como "gasto" nas categorias. Deve aparecer como linha própria.
7. **Projeção de fim de mês:**
   `projeção = saldo realizado + entradas pendentes − saídas pendentes − (média diária de gasto variável × dias restantes)`
   Devolver também os componentes para o front explicar o número.
8. **Orçamento por categoria:** `percentual = gasto no mês / monthly_limit`. Alertar em ≥ 80% (âmbar) e ≥ 100% (vermelho).
9. **Idempotência:** importação de planilha não pode duplicar lançamentos (hash de `date + amount + description` por usuário ou chave de importação).
10. **Mover lançamento** entre semanas/meses (drag and drop) = `PATCH` da `date`, recalculando `competence_month`.

---

## 6. API REST

Prefixo `/api/v1`. JSON. Datas ISO 8601. Paginação por cursor ou `page/pageSize`. Erros no formato padrão (item 8).

### Auth
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

### Transactions
- `GET /transactions?from=&to=&month=&week=&kind=&nature=&status=&categoryId=&q=&minAmount=&maxAmount=&sort=&page=`
- `POST /transactions` — aceita campos de recorrência/parcelamento opcionais (lançamento rápido)
- `GET /transactions/:id`
- `PATCH /transactions/:id` — parâmetro `scope=this|following|all` quando faz parte de série
- `DELETE /transactions/:id` — soft delete; `scope` idem
- `POST /transactions/:id/restore` — desfazer
- `POST /transactions/bulk` — editar/excluir em lote `{ ids, action, payload }`

### Categories
- `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `POST /categories/:id/archive`

### Recurrences
- `GET /recurrences`, `POST /recurrences`, `PATCH /recurrences/:id`, `DELETE /recurrences/:id`
- `POST /recurrences/generate` — força a geração (também rodada por cron)

### Goals
- `GET /goals` (já com valor guardado e ETA), `POST /goals`, `PATCH /goals/:id`
- `POST /goals/:id/contributions` — cria `GOAL_CONTRIBUTION`

### Reports (tudo calculado no servidor)
- `GET /reports/summary?month=YYYY-MM` — KPIs + variação vs. mês anterior + total de extras
- `GET /reports/by-category?month=YYYY-MM&kind=EXPENSE` — donut e barras de orçamento
- `GET /reports/weekly?month=YYYY-MM` — entradas x saídas por semana
- `GET /reports/balance-evolution?month=YYYY-MM` — saldo acumulado dia a dia + projeção
- `GET /reports/yearly?year=YYYY` — 12 meses: entradas, saídas, saldo, acumulado
- `GET /reports/heatmap?year=YYYY` — categoria × mês
- `GET /reports/compare?month=YYYY-MM&with=YYYY-MM`

### Settings / Import-Export
- `GET /settings`, `PATCH /settings`
- `POST /import` (CSV/XLSX; modo `preview` antes de confirmar), `GET /export?format=csv|xlsx&from=&to=`

### Sistema
- `GET /health` (liveness) e `GET /health/ready` (checa banco)

Documentar com **OpenAPI/Swagger** gerado pelo Nest (`@nestjs/swagger`).

---

## 7. Segurança

- Senhas com Argon2/bcrypt (ou delegar ao Supabase Auth). JWT de vida curta + refresh token rotativo.
- **Toda query filtra por `user_id`** vindo do token, nunca do body/params.
- Validação de entrada em todas as rotas (whitelist: rejeitar campos desconhecidos).
- Rate limiting (`@nestjs/throttler`), Helmet, CORS restrito ao domínio do front.
- Segredos só em variáveis de ambiente; nunca commitar `.env`.
- Se usar Supabase: habilitar **RLS** nas tabelas como segunda camada de proteção.
- Dados financeiros são sensíveis: logs **sem valores nem descrições** de lançamentos.
- Backup automático do banco e teste de restauração pelo menos uma vez.

---

## 8. Padrões de qualidade

- **Formato de erro padrão:**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Valor inválido", "details": [{ "field": "amount", "issue": "deve ser maior que 0" }] } }
  ```
- **Exception filter global** no Nest mapeando erros de domínio para HTTP.
- **Config validada no boot** (zod): app não sobe com env faltando.
- **Logs estruturados** (pino) com `requestId`.
- **Migrations** sempre via Prisma Migrate; nunca alterar o banco na mão.
- **Seed** com categorias padrão e dados de exemplo para desenvolvimento.
- Lint (ESLint) + Prettier + `tsc --noEmit` + Husky/lint-staged no pre-commit.
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`…) e PRs pequenos.
- **ADRs** curtos em `docs/adr/` para cada decisão relevante (ex.: "dinheiro em decimal", "recorrência materializada").

---

## 9. Estratégia de testes

| Tipo | O que cobrir | Prioridade |
|---|---|---|
| Unitário (domínio puro) | `getCompetenceMonth`, geração de recorrência, parcelamento, projeção, cálculo de orçamento | **Alta** |
| Integração (API + banco real) | CRUD de lançamentos, escopo `this/following/all`, relatórios com dados conhecidos | **Alta** |
| Contrato | Schemas zod compartilhados batem com as respostas da API | Média |
| E2E (Playwright, depois) | Fluxo de lançamento rápido → aparece no dashboard | Média |

Meta: cobertura alta nas regras de negócio, não caça a percentual global.

---

## 10. Performance

- Agregações feitas no Postgres (`SUM ... GROUP BY`), não em memória.
- Índices do item 4.2. Verificar planos com `EXPLAIN` nos relatórios anuais.
- Cache leve (in-memory ou Redis só se precisar) para `reports/yearly`, invalidado ao gravar lançamento do ano.
- Escala esperada: milhares de lançamentos por ano. Não otimizar além disso antes da hora.

---

## 11. Ambientes, deploy e observabilidade

- **Ambientes:** `local` (docker-compose com Postgres), `staging` (opcional), `production`.
- **Variáveis de ambiente (`.env.example`):**
  ```
  DATABASE_URL=
  DIRECT_URL=
  JWT_SECRET=
  JWT_REFRESH_SECRET=
  CORS_ORIGIN=
  APP_TIMEZONE=America/Sao_Paulo
  NODE_ENV=
  ```
- **CI (GitHub Actions):** install → lint → typecheck → testes → build. Merge bloqueado se falhar.
- **CD:** web na Vercel, API em Railway/Render/Fly, migrations rodando no deploy (`prisma migrate deploy`).
- **Observabilidade:** endpoint `/health`, logs estruturados, Sentry (ou similar) para erros, uptime monitor gratuito.

---

## 12. Roadmap de implementação

**Fase 0 — Fundação**
Monorepo, lint/format/CI, Nest + Prisma + Postgres local, config validada, `/health`, auth básica.

**Fase 1 — Núcleo**
Categorias, Transações (CRUD + filtros + soft delete), Settings (mês financeiro), `getCompetenceMonth` com testes.

**Fase 2 — Visões e gráficos**
Módulo `reports`: summary, by-category, weekly, balance-evolution, yearly, heatmap. Conectar ao front do Stitch.

**Fase 3 — Flexibilidade**
Recorrências (materialização + override), parcelamento, escopo `this/following/all`, mover lançamento entre períodos.

**Fase 4 — Metas e inteligência**
Goals + aportes, orçamento por categoria com alertas, projeção de fim de mês, comparativos.

**Fase 5 — Dados e polimento**
Import/export CSV/XLSX com preview, backups, Swagger completo, E2E, hardening de segurança.

---

## 13. Definition of Done (por funcionalidade)

- [ ] Regra de negócio implementada em função de domínio pura, com testes
- [ ] Endpoint com DTO validado, filtro por `user_id` e resposta tipada
- [ ] Migration versionada, índices avaliados
- [ ] Documentado no Swagger e, se relevante, em ADR
- [ ] Lint, typecheck e testes passando no CI
- [ ] Sem valores monetários em `float` e sem dados sensíveis em log

---

## 14. Instruções para o agente de IA que for implementar

1. Siga a estrutura de pastas e as camadas deste documento; **não misture regra de negócio em controller**.
2. Comece pela Fase 0 e só avance quando os critérios da Definition of Done estiverem cumpridos.
3. Escreva os testes de domínio **antes** da implementação nas regras da seção 5.
4. Em qualquer dúvida de decisão (ex.: centavos vs. decimal), registre um ADR curto em vez de decidir em silêncio.
5. Não introduza dependências novas sem justificar em uma linha no PR.
