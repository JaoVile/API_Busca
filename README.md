# Checklist — API_Busca (48 Etapas)

> Marcar com [x] conforme cada etapa for concluída.

---

## FASE 0 — Setup do Projeto

- [x] **Etapa 1** — Criar repositório e estrutura de pastas `86c1c16`
- [x] **Etapa 2** — Inicializar Node.js + dependências base `67cd569`
- [x] **Etapa 3** — Configurar TypeScript `da3138f`
- [x] **Etapa 4** — Express mínimo (health check) `924a69d`
- [x] **Etapa 5** — .env.example e .gitignore `1933bd8`
- [x] **Etapa 6** — Docker Compose (PostgreSQL) `6b11042`

**Push 1 realizado** — FASE 0 + banco migrado

---

## FASE 1 — Banco de Dados e Utilitários

- [x] **Etapa 7** — Instalar Prisma `7980946`
- [x] **Etapa 8** — Schema: Tenant (RF01) `7470042`
- [x] **Etapa 9** — Schema: TenantCredentials (RF02, RNF01) `10a4230`
- [x] **Etapa 10** — Schema: ReportLog (RNF04) `0a3e39e`
- [x] **Etapa 11** — Rodar migration `e9cc6ef`
- [x] **Etapa 12** — Prisma Client singleton `3c4b03e`
- [x] **Etapa 13** — Módulo de criptografia (AES-256-GCM) (RNF01) `f2c1ce7`
- [x] **Etapa 14** — Utilitários de data + validação de env `6cc24ad`

**Push 2 planejado** — Após Etapa 14 (FASE 1 completa)

---

## FASE 2 — Autenticação JWT Manual

- [ ] **Etapa 15** — Instalar dependências de auth
- [ ] **Etapa 16** — Middleware JWT
- [ ] **Etapa 17** — Auth Service (register + login) (RF01)
- [ ] **Etapa 18** — Auth Controller
- [ ] **Etapa 19** — Auth Routes
- [ ] **Etapa 20** — Credentials Service (RF02)
- [ ] **Etapa 21** — Credentials Controller + Routes + Route Registry

---

## FASE 3 — Serviço Provider

- [ ] **Etapa 22** — Instalar Axios
- [ ] **Etapa 23** — Cliente base Provider
- [ ] **Etapa 24** — Tipagens Provider
- [ ] **Etapa 25** — RF03: Buscar veículos ativos
- [ ] **Etapa 26** — RF04: Vendas do dia
- [ ] **Etapa 27** — RF05: Cancelamentos do dia
- [ ] **Etapa 28** — RF06 + RN01: Financeiro mensal
- [ ] **Etapa 29** — Orquestrador Provider (parallel fetch)

---

## FASE 4 — Formatação + Quepasa

- [ ] **Etapa 30** — RF07: Formatador de mensagem
- [ ] **Etapa 31** — Cliente Quepasa
- [ ] **Etapa 32** — RF08: Envio WhatsApp via Quepasa
- [ ] **Etapa 33** — Report Log Service (RNF04)
- [ ] **Etapa 34** — Report Controller + Routes (RNF03)

---

## FASE 5 — Job Scheduler

- [ ] **Etapa 35** — Instalar node-cron
- [ ] **Etapa 36** — Pipeline por tenant
- [ ] **Etapa 37** — Job diário (todos os tenants)
- [ ] **Etapa 38** — Scheduler 19:00 BRT (RNF02)
- [ ] **Etapa 39** — Endpoint de trigger manual

---

## FASE 6 — Frontend Minimalista

- [ ] **Etapa 40** — CSS Dark (RNF03)
- [ ] **Etapa 41** — Login/Register page + JS (RNF03)
- [ ] **Etapa 42** — Dashboard HTML (RNF03)
- [ ] **Etapa 43** — Dashboard JS (RNF03)

---

## FASE 7 — Testes

- [ ] **Etapa 44** — Setup Jest
- [ ] **Etapa 45** — Testes: encryption + dateUtils
- [ ] **Etapa 46** — Testes: messageFormatter
- [ ] **Etapa 47** — Teste de integração: pipeline mockado

---

## FASE 8 — Deploy e Docs

- [ ] **Etapa 48** — README final + push
