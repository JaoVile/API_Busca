# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS API that automates daily reports: fetches data from Provider SGA API (vehicle management), formats it, and sends via WhatsApp through Quepasa. Each tenant has isolated, AES-256-GCM encrypted credentials and a customizable message template.

## Commands

```bash
# Dev server (ts-node with nodemon)
npm run dev

# Build & run production
npm run build && npm start

# Run all tests
npm test

# Run a single test file
npx jest tests/unit/encryption.test.ts

# Database
docker compose up -d              # Start PostgreSQL
npx prisma migrate dev --config prisma/prisma.config.ts   # Apply migrations
npx prisma generate --config prisma/prisma.config.ts      # Regenerate client

# Note: .npmrc has legacy-peer-deps=true (required for Prisma 7 adapter)
# Note: Prisma 7 requires --config flag pointing to prisma/prisma.config.ts
```

## Architecture

**Request flow:** Express routes (`src/routes/`) → Controllers (`src/controllers/`) → Services (`src/services/`)

**Key services:**
- `authService` — JWT (7d expiry) + bcryptjs (12 rounds), tenant registration/login
- `credentialsService` — Encrypts/decrypts tenant API tokens (AES-256-GCM via `src/utils/encryption.ts`), stores message template
- `provider/providerOrchestrator` — Two-step Provider auth, then 4 parallel data queries via `Promise.allSettled` (active vehicles, today's sales, cancellations, monthly financials)
- `provider/getMonthlyFinancials` — Fetches boletos via `mes_referente` parameter, extracts daily data by comparing `data_pagamento`/`data_vencimento` with today
- `quepasa/sendMessage` — Sends formatted WhatsApp messages through Quepasa bot API
- `messageFormatter` — Template engine with `{{variable}}` substitution. Uses custom template from DB or `DEFAULT_TEMPLATE`. Exports `formatReportMessage(companyName, report, customTemplate?)`.

**Scheduled jobs:** `src/jobs/scheduler.ts` runs `dailyReportJob` via node-cron at 18:00 BRT. The job iterates all active tenants with credentials, runs the report pipeline (`reportPipeline.ts`) for each with a 2s delay between tenants.

**Report pipeline** (`src/jobs/reportPipeline.ts`): Decrypt credentials → Fetch Provider data → Format message (using tenant's custom template if set) → Send WhatsApp → Log result (SUCCESS/PARTIAL_FAILURE/FAILURE).

**Database:** PostgreSQL via Prisma 7 with `@prisma/adapter-pg`. Three models: `Tenant`, `TenantCredentials` (1:1, includes `messageTemplate`), `ReportLog` (1:N). Schema at `prisma/schema.prisma`. Datasource URL configured in `prisma/prisma.config.ts` (not in schema.prisma — Prisma 7 requirement).

**Auth middleware** (`src/middlewares/authMiddleware.ts`): Extracts Bearer JWT, verifies, injects `tenantId` into request. All `/api/credentials` and `/api/reports` routes are protected.

**Frontend:** Static HTML/CSS/JS in `public/` — login/register page (`index.html`) and dashboard (`dashboard.html`) with dark theme. Dashboard includes a template editor modal with variable insertion, live preview, and restore-to-default functionality. Uses localStorage for token persistence.

## API Endpoints

- `POST /api/auth/register` and `POST /api/auth/login` — Public
- `PUT /api/credentials` — Protected (accepts credentials fields + `messageTemplate` + optional `providerCodigoRegional` / `providerCodigoCooperativa`)
- `GET /api/credentials/status` — Protected (returns status + current `messageTemplate` + `providerCodigoRegional` + `providerCodigoCooperativa`)
- `DELETE /api/credentials` — Protected
- `GET /api/reports/last-status`, `GET /api/reports/history`, `POST /api/reports/trigger` — Protected
- `GET /api/health` — Health check

## Environment Variables

Required: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` (64 hex chars = 32 bytes). See `.env.example`.

## Testing

Tests in `tests/` — unit tests (`encryption`, `dateUtils`, `messageFormatter`) and integration (`pipeline`). Uses ts-jest with `tsconfig.test.json`. Integration tests mock axios and Prisma.

## Provider API Notes

- Base URL: `https://api.exemplo.com/v2`
- Auth: POST `/usuario/autenticar` with Bearer SGA token + usuario/senha body → returns `token_usuario`
- Vehicles: POST `listar/veiculo` with `codigo_situacao` and optional `data_cadastro`/`data_cadastro_final` (format: `yyyy-mm-dd`)
- Cancellations: POST `listar/alteracao-veiculos` with `data_inicial`/`data_final` (format: `dd/mm/yyyy`). Response items have `codigo_veiculo` but NO `codigo_regional` — to filter by region, cross-reference against `listar/veiculo` with cancel `codigo_situacao`.
- Boletos: POST `listar/boleto` with `codigo_situacao` (1=BAIXADO, 2=ABERTO) and `mes_referente` (format: `MM/YYYY`).
- Daily financial data is extracted from monthly query by comparing `data_pagamento` (paid) or `data_vencimento` (open) with today's date.

### Pagination quirks (important)

The two paginated endpoints use **different semantics** for `inicio_paginacao`:

- `listar/veiculo`: `inicio_paginacao` is a **1-indexed row offset**. Valid values: 1, 501, 1001, ... With `quantidade_por_pagina=500`, passing 2 returns records 2..501 (not page 2). Response includes `total_veiculos`, `numero_paginas`, `pagina_corrente`. `inicio_paginacao=0` returns 406.
- `listar/boleto`: `inicio_paginacao` is a **0-indexed page number**. Valid values: 0, 1, 2, ... Page 0 returns rows 1..qp, page 1 returns rows qp+1..2qp, etc. Response has no pagination metadata — stop when `length < quantidade_por_pagina`.

Max `quantidade_por_pagina` is 5000 (returns 406 with `"O LIMITE máximo é de 5000"` if exceeded). We use 500 in production to keep individual requests small and avoid timeouts/token expiry mid-request.

The `token_usuario` expires quickly between long requests — `createProviderClient` accepts SGA token/user/pass and installs an axios interceptor that re-authenticates on 401.

### Regional / cooperativa filters (shared VehicleContext)

Each tenant has optional `providerCodigoRegional` and `providerCodigoCooperativa` credentials. When either is set, `providerOrchestrator` calls `buildVehicleContext` once at the start of each run (`src/services/provider/vehicleContext.ts`) which paginates all active vehicles and collects:
- `allowedAssociados: Set<string>` — codigo_associado of vehicles matching the filter
- `allowedVeiculos: Set<string>` — codigo_veiculo of vehicles matching the filter
- `totalAtivos: number` — count of active vehicles matching the filter (= RF03)
- `todaySalesCount: number` — count of matching vehicles cadastrados hoje (= RF04)

This context is passed to all four fetchers so they can filter without re-paginating. `getActiveVehicles` and `getTodaySales` become O(1) when the context is present.

`getMonthlyFinancials` uses `allowedAssociados` to filter boletos (boletos only have `codigo_associado`, not `codigo_cooperativa`). It also always excludes boletos where `codigo_situacao_associado` is in the cancel list (dynamically fetched via `cancelCodes.ts`). Inadimplentes/negativados are INCLUDED — only CANCELADO and PRE-CANCELAMENTO are excluded.

When no filter is set, counts come from `total_veiculos` directly (no pagination — fast path).

The API-side `codigo_regional` / `codigo_cooperativa` body params are silently ignored by Provider — that's why we filter client-side.

## Message Template Variables

The formatter (`src/services/messageFormatter.ts`) supports these `{{variables}}`:

`empresa`, `data`, `mesAno`, `ativos`, `vendasHoje`, `canceladosHoje`, `recebidoHoje`, `qtdRecebidoHoje`, `abertoHoje`, `qtdAbertoHoje`, `pctRecebidoHoje`, `pctAbertoHoje`, `totalDia`, `pagoMes`, `qtdPagoMes`, `abertoMes`, `qtdAbertoMes`, `pctPagoMes`, `pctAbertoMes`, `totalMes`, `qtdTotalMes`
