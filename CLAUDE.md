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
- `PUT /api/credentials` — Protected (accepts credentials fields + `messageTemplate`)
- `GET /api/credentials/status` — Protected (returns status + current `messageTemplate`)
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
- Cancellations: POST `listar/alteracao-veiculos` with `data_inicial`/`data_final` (format: `dd/mm/yyyy`)
- Boletos: POST `listar/boleto` with `codigo_situacao` (1=BAIXADO, 2=ABERTO) and `mes_referente` (format: `MM/YYYY`). Paginates at 5000 items.
- Daily financial data is extracted from monthly query by comparing `data_pagamento` (paid) or `data_vencimento` (open) with today's date

## Message Template Variables

The formatter (`src/services/messageFormatter.ts`) supports these `{{variables}}`:

`empresa`, `data`, `mesAno`, `ativos`, `vendasHoje`, `canceladosHoje`, `recebidoHoje`, `qtdRecebidoHoje`, `abertoHoje`, `qtdAbertoHoje`, `pctRecebidoHoje`, `pctAbertoHoje`, `totalDia`, `pagoMes`, `qtdPagoMes`, `abertoMes`, `qtdAbertoMes`, `pctPagoMes`, `pctAbertoMes`, `totalMes`, `qtdTotalMes`
