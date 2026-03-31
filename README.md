# API_Busca

Automacao de relatorios diarios via Provider para WhatsApp (Quepasa).
Multi-tenant com isolamento de credenciais (AES-256-GCM).

## Stack

- **Backend**: Node.js + Express + TypeScript
- **Banco**: PostgreSQL (Docker) + Prisma ORM
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Scheduler**: node-cron (19:00 BRT)
- **APIs externas**: Provider SGA v2 + Quepasa (WhatsApp)
- **Frontend**: HTML/CSS/JS (dark theme minimalista)

## Arquitetura

```
Frontend (public/)  -->  Express (Node+TS)  -->  PostgreSQL (Docker)
                              |
                    +---------+---------+
                    |                   |
              Provider API          Quepasa API
              (dados)            (WhatsApp)
```

## Fluxo do Relatorio

1. **Trigger**: Cron Job as 19:00 BRT (ou manual via dashboard)
2. **Auth**: Recupera credenciais criptografadas do banco, autentica na Provider (2 etapas)
3. **Fetch**: 4 consultas em paralelo (ativos, vendas, cancelamentos, financeiro)
4. **Parse**: Calcula percentuais e formata valores
5. **Dispatch**: Envia mensagem formatada via Quepasa (WhatsApp)
6. **Log**: Registra resultado (SUCCESS / PARTIAL_FAILURE / FAILURE)

## Setup

### Pre-requisitos

- Node.js 18+
- Docker Desktop
- Git

### Instalacao

```bash
git clone https://github.com/JaoVile/API_Busca.git
cd API_Busca
cp .env.example .env          # preencher com suas chaves
docker compose up -d           # sobe o PostgreSQL
npm install
npx prisma migrate dev --schema prisma/schema.prisma --config prisma/prisma.config.ts
npm run dev
```

### Variaveis de Ambiente (.env)

| Variavel | Descricao |
|----------|-----------|
| `PORT` | Porta do servidor (default: 3000) |
| `DATABASE_URL` | URL de conexao PostgreSQL |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT |
| `ENCRYPTION_KEY` | 64 caracteres hex (32 bytes) para AES-256-GCM |

Para gerar chaves seguras:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Endpoints da API

### Publicos (sem autenticacao)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro de empresa |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/health` | Health check |

### Protegidos (requer Bearer Token)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| PUT | `/api/credentials` | Salvar tokens (Provider + Quepasa) |
| GET | `/api/credentials/status` | Ver configuracao atual |
| GET | `/api/reports/last-status` | Ultimo envio de relatorio |
| GET | `/api/reports/history` | Historico de envios |
| POST | `/api/reports/trigger` | Disparar relatorio manualmente |

### Exemplo de uso com curl

```bash
# 1. Registrar empresa
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Minha Empresa","email":"admin@empresa.com","password":"123456"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"123456"}'
# Copie o token retornado

# 3. Configurar credenciais
curl -X PUT http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "providerToken":"token_sga_provider",
    "providerUser":"usuario_provider",
    "providerPass":"senha_provider",
    "quepasaToken":"token_quepasa",
    "quepasaBaseUrl":"http://localhost:31000",
    "whatsappNumber":"5511999999999"
  }'

# 4. Disparar relatorio
curl -X POST http://localhost:3000/api/reports/trigger \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Frontend

Acesse `http://localhost:3000` no navegador:

- **Tela de Login**: cadastro e login de empresas
- **Dashboard**: configurar credenciais, testar envio, ver status

## Credenciais necessarias

### Provider (API SGA v2)
- **Token SGA**: gerado no painel Provider (Area Cliente > APIs > Gerenciar APIs)
- **Usuario**: usuario ativo do sistema SGA
- **Senha**: senha de acesso do SGA

A autenticacao e feita em 2 etapas:
1. POST `/usuario/autenticar` com Token SGA no header + usuario/senha no body
2. Retorna `token_usuario` (nao expira) usado nas demais requisicoes

### Quepasa (WhatsApp)
- **Token**: token de acesso da instancia Quepasa
- **URL Base**: endereco do servidor Quepasa (ex: `http://localhost:31000`)

## Exemplo de Mensagem Gerada

```
📊 *Relatorio Diario - Nome da Empresa*

🚗 Ativos Totais: 1.250
✅ Vendas hoje: 05
❌ Cancelados hoje: 02

💰 *Financeiro Mensal:*
  • Aberto: R$ 50.000,00
  • Pago: R$ 35.000,00 (70%)
```

## Testes

```bash
npm test
```

## Scripts disponiveis

| Script | Comando | Descricao |
|--------|---------|-----------|
| `npm run dev` | `nodemon` | Desenvolvimento (auto-reload) |
| `npm run build` | `tsc` | Compila TypeScript |
| `npm start` | `node dist/server.js` | Producao |
| `npm test` | `jest` | Roda testes |

## Requisitos atendidos

| Codigo | Descricao | Status |
|--------|-----------|--------|
| RF01 | Cadastro de Tenant | Implementado |
| RF02 | Configuracao de Credenciais | Implementado |
| RF03 | Coleta de Ativos | Implementado |
| RF04 | Relatorio de Vendas | Implementado |
| RF05 | Monitoramento de Cancelamentos | Implementado |
| RF06 | Resumo Financeiro | Implementado |
| RF07 | Formatacao de Mensagem | Implementado |
| RF08 | Disparo via Quepasa | Implementado |
| RNF01 | Isolamento de Credenciais (AES-256) | Implementado |
| RNF02 | Periodicidade (Cron 19:00 BRT) | Implementado |
| RNF03 | Simplicidade de Interface | Implementado |
| RNF04 | Tratamento de Erros de API | Implementado |
| RN01 | Boletos do mes inteiro (dia 01 ao ultimo dia) | Implementado |
