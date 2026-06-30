# API Busca

[![CI](https://github.com/JaoVile/API_Busca/actions/workflows/ci.yml/badge.svg)](https://github.com/JaoVile/API_Busca/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Multi-tenant SaaS que automatiza relatorios diarios: busca dados da API Provider SGA (gestao de veiculos), formata e envia via WhatsApp atraves do Quepasa. Opcionalmente, gera um **insight executivo via IA (Claude)** no topo de cada relatorio.

## Requisitos do Sistema

- **Node.js** 18+ (recomendado 20+)
- **Docker** e **Docker Compose** (para PostgreSQL e Quepasa)
- **Git**
- **npm** 9+

## Instalacao Passo a Passo

### 1. Clonar o repositorio

```bash
git clone https://github.com/JaoVile/API_Busca.git
cd API_Busca
```

### 2. Instalar dependencias

```bash
npm install
```

> O arquivo `.npmrc` ja contem `legacy-peer-deps=true` (necessario para Prisma 7 + ts-jest).

### 3. Configurar variaveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/api_busca
JWT_SECRET=troque_por_uma_chave_segura_aleatoria
ENCRYPTION_KEY=gere_com_o_comando_abaixo
```

**Gerar ENCRYPTION_KEY (64 caracteres hex = 32 bytes AES-256):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Subir o PostgreSQL via Docker

```bash
docker compose up -d
```

Isso sobe um container PostgreSQL na porta 5432.

### 5. Executar migrations do Prisma

```bash
npx prisma migrate dev --config prisma/prisma.config.ts
npx prisma generate --config prisma/prisma.config.ts
```

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

### 7. Configurar o Quepasa (WhatsApp)

O Quepasa e o servico que envia mensagens pelo WhatsApp. Voce precisa de uma instancia rodando.

**Opcao A: Usar o Docker Compose do Quepasa**

```bash
cd ../quepasa/docker
docker compose up -d
```

**Opcao B: Usar uma imagem pronta**

```bash
docker run -d --name quepasa -p 31000:31000 codeleaks/quepasa:latest
```

Apos subir:

1. Acesse **http://localhost:31000**
2. Crie uma conta ou faca login
3. Escaneie o **QR Code** com o WhatsApp
4. Copie o **Token do bot** gerado

### 8. Configurar credenciais no Dashboard

1. Acesse **http://localhost:3000**
2. Cadastre uma conta (nome da empresa + email + senha)
3. Clique em **"+ Nova Empresa"**
4. Preencha:
   - **Token Provider (SGA)**: gerado no menu Area Cliente > APIs > Gerenciar APIs do SGA
   - **Usuario Provider**: usuario de integracao do SGA
   - **Senha Provider**: senha do usuario de integracao
   - **Token Quepasa**: token do bot copiado no passo 7
   - **URL Quepasa**: `http://localhost:31000`
   - **WhatsApp**: numero com DDI+DDD (ex: `5581999999999`)
5. Clique em **"Testar Envio"** para validar

### 9. Personalizar a mensagem (opcional)

1. No dashboard, clique no botao **"Editar Mensagem"** (laranja)
2. Edite o template usando variaveis `{{nomeVariavel}}`
3. Clique nas **tags azuis** para inserir variaveis no cursor
4. Acompanhe a **pre-visualizacao** em tempo real
5. Clique em **"Salvar Template"**

**Variaveis disponiveis:**

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `{{empresa}}` | Nome da empresa | Minha Empresa |
| `{{data}}` | Data atual | 02/04/2026 |
| `{{mesAno}}` | Mes e ano | abril 2026 |
| `{{ativos}}` | Veiculos ativos | 1.250 |
| `{{vendasHoje}}` | Vendas do dia | 5 |
| `{{canceladosHoje}}` | Cancelamentos do dia | 2 |
| `{{recebidoHoje}}` | Valor recebido hoje | R$ 15.000,00 |
| `{{qtdRecebidoHoje}}` | Qtd boletos recebidos hoje | 10 |
| `{{abertoHoje}}` | Valor em aberto hoje | R$ 8.000,00 |
| `{{qtdAbertoHoje}}` | Qtd boletos abertos hoje | 6 |
| `{{pctRecebidoHoje}}` | % recebido no dia | 65.2% |
| `{{pctAbertoHoje}}` | % aberto no dia | 34.8% |
| `{{totalDia}}` | Total financeiro do dia | R$ 23.000,00 |
| `{{pagoMes}}` | Total recebido no mes | R$ 120.000,00 |
| `{{qtdPagoMes}}` | Qtd boletos pagos no mes | 60 |
| `{{abertoMes}}` | Total em aberto no mes | R$ 80.000,00 |
| `{{qtdAbertoMes}}` | Qtd boletos abertos no mes | 40 |
| `{{pctPagoMes}}` | % pago no mes | 60.0% |
| `{{pctAbertoMes}}` | % aberto no mes | 40.0% |
| `{{totalMes}}` | Total geral do mes | R$ 200.000,00 |
| `{{qtdTotalMes}}` | Qtd total boletos no mes | 100 |

## Comandos

```bash
npm run dev        # Servidor com hot-reload (nodemon + ts-node)
npm run build      # Compila TypeScript para dist/
npm start          # Roda versao compilada (producao)
npm test           # Executa testes com Jest
```

**Prisma:**

```bash
npx prisma migrate dev --config prisma/prisma.config.ts    # Aplicar migrations
npx prisma generate --config prisma/prisma.config.ts       # Regenerar client
npx prisma studio --config prisma/prisma.config.ts         # Interface visual do banco
```

## Arquitetura

```
Request -> Express Routes -> Controllers -> Services -> Provider API / Quepasa API
                                              |
                                       PostgreSQL (Prisma)
```

**Fluxo do Relatorio:**

1. **Trigger** — Cron job (18:00 BRT) ou botao manual no dashboard
2. **Auth** — Descriptografa credenciais do tenant (AES-256-GCM)
3. **Fetch** — 4 consultas paralelas na Provider via `Promise.allSettled`:
   - `POST listar/veiculo { codigo_situacao: 1 }` -> total de ativos
   - `POST listar/veiculo { data_cadastro: hoje }` -> vendas do dia
   - `POST listar/alteracao-veiculos { data: hoje }` -> cancelamentos do dia
   - `POST listar/boleto { mes_referente: MM/YYYY }` -> financeiro (pagos + abertos do mes)
4. **Parse** — Aplica template customizavel com variaveis `{{...}}`, calcula percentuais, formata valores em pt-BR
5. **IA (opcional)** — Gera um insight executivo via Claude e adiciona ao topo da mensagem (veja abaixo)
6. **Dispatch** — Envia mensagem formatada via Quepasa (WhatsApp)
7. **Log** — Registra resultado (SUCCESS / PARTIAL_FAILURE / FAILURE) no banco

### Insight executivo com IA (Claude)

Quando a variavel `ANTHROPIC_API_KEY` esta configurada, o pipeline pede ao modelo
**`claude-haiku-4-5`** (tier rapido/barato) um resumo executivo de 1-2 frases
destacando o que mais exige atencao no dia (inadimplencia, queda de vendas, pico
de cancelamentos). O resultado entra no topo do relatorio:

```
🧠 Análise do dia
Inadimplência do mês acima de 40%, com 40 boletos em aberto — atenção à cobrança.

📊 Relatório Diário — Atomos
...
```

Decisoes de projeto (`src/services/ai/aiSummaryService.ts`):

- **Recurso opcional, nunca bloqueante.** Sem `ANTHROPIC_API_KEY`, ou se a chamada
  falhar/exceder o timeout (15s), a funcao retorna `null` e o relatorio segue sem o resumo.
- **Anti-alucinacao.** O prompt (versionado em `EXECUTIVE_SUMMARY_PROMPT_V1`) instrui o
  modelo a usar **somente** os numeros fornecidos — nunca inventar dados ou tendencias.
- **Custo controlado.** Modelo barato + `max_tokens` baixo; roda uma vez por relatorio.

**Dados diarios vs mensais:**

Os dados financeiros do dia sao extraidos da mesma consulta mensal (`mes_referente`), comparando `data_pagamento` (para recebidos) e `data_vencimento` (para abertos) com a data atual. Isso evita chamadas de API adicionais.

## Endpoints da API

### Publicos

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro de tenant |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/health` | Health check |

### Protegidos (Bearer Token)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| PUT | `/api/credentials` | Salvar/atualizar credenciais e template |
| GET | `/api/credentials/status` | Status das credenciais (inclui template) |
| DELETE | `/api/credentials` | Remover credenciais |
| POST | `/api/reports/trigger` | Disparar relatorio manual |
| GET | `/api/reports/last-status` | Ultimo relatorio |
| GET | `/api/reports/history` | Historico de envios |

### Exemplos com curl

```bash
# Cadastrar
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Minha Empresa","email":"admin@empresa.com","password":"123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"123456"}'

# Salvar credenciais (usar token do login)
curl -X PUT http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "providerToken":"token_do_sga",
    "providerUser":"usuario",
    "providerPass":"senha",
    "quepasaToken":"token_do_bot",
    "quepasaBaseUrl":"http://localhost:31000",
    "whatsappNumber":"5511999999999"
  }'

# Salvar template customizado
curl -X PUT http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{"messageTemplate":"📊 {{empresa}} — {{data}}\nAtivos: {{ativos}}\nRecebido: {{pagoMes}} ({{pctPagoMes}})"}'

# Disparar relatorio
curl -X POST http://localhost:3000/api/reports/trigger \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## Exemplo de Mensagem (template padrao)

```
📊 Relatório Diário — Atomos
📅 02/04/2026

🚗 Resumo do Dia
  • Ativos: 7.830
  • Vendas hoje: 10
  • Cancelados hoje: 4

📋 Financeiro do Dia
  • Recebido: R$ 15.000,00 (10 boletos) — 65.2%
  • Em aberto: R$ 8.000,00 (6 boletos) — 34.8%

💰 Resumo do mês — abril 2026
  • Total recebido: R$ 120.000,00 (60 boletos) — 60.0%
  • Total em aberto: R$ 80.000,00 (40 boletos) — 40.0%
  • Total geral: R$ 200.000,00 (100 boletos)
```

## Estrutura de Pastas

```
src/
  controllers/       # Controladores Express
  database/          # Prisma client
  jobs/              # Scheduler (cron) e pipeline de relatorio
  middlewares/       # Auth JWT middleware
  routes/            # Rotas Express
  services/          # Logica de negocio
    provider/          # Integracao Provider (auth, veiculos, boletos, cancelamentos)
    quepasa/         # Envio WhatsApp
  utils/             # Encryption, date helpers
  config/            # Validacao de env vars
public/
  index.html         # Login / Cadastro
  dashboard.html     # Painel principal (com editor de template)
  css/               # Estilos
  js/                # Scripts do frontend
prisma/
  schema.prisma      # Schema do banco
  prisma.config.ts   # Config Prisma 7 (datasource URL)
tests/
  unit/              # Testes unitarios
  integration/       # Testes de integracao
```

## Banco de Dados

3 modelos no PostgreSQL via Prisma 7:

- **Tenant** — Empresa cadastrada (id, email, senha hash)
- **TenantCredentials** — Tokens criptografados (AES-256-GCM), template de mensagem, 1:1 com Tenant
- **ReportLog** — Historico de envios (status, mensagem, erro) 1:N com Tenant

## Seguranca

- Senhas: **bcryptjs** com 12 rounds de salt
- Tokens: **AES-256-GCM** com IV unico por criptografia
- Autenticacao: **JWT** com expiracao de 7 dias
- Isolamento: cada tenant so acessa suas proprias credenciais

## Requisitos Implementados

- [x] RF01 — Cadastro de Tenant com UUID unico
- [x] RF02 — Configuracao de credenciais (Provider + Quepasa + WhatsApp)
- [x] RF03 — Coleta de veiculos ativos
- [x] RF04 — Vendas do dia (veiculos cadastrados hoje)
- [x] RF05 — Cancelamentos do dia (alteracoes para status CANCELADO)
- [x] RF06 — Financeiro do mes atual (boletos pagos + abertos via mes_referente, com dados diarios)
- [x] RF07 — Mensagem formatada com template customizavel e variaveis
- [x] RF08 — Envio via Quepasa (WhatsApp)
- [x] RNF01 — Isolamento de credenciais com criptografia
- [x] RNF02 — Job scheduler (cron 18:00 BRT)
- [x] RNF03 — Interface minimalista (dark theme) com editor de mensagem
- [x] RNF04 — Log de erros por envio
- [x] RN01 — Boletos filtrados por mes_referente (somente mes corrente)

## Stack

Node.js | Express 5 | TypeScript | PostgreSQL | Prisma 7 | JWT | AES-256-GCM | node-cron | Axios | Jest | Claude (Anthropic SDK)
