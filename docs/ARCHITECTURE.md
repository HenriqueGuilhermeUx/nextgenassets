# Arquitetura — Orkest

> Documento técnico detalhado da plataforma.

## Visão Geral

Orkest é uma plataforma B2B2C de automação financeira. Parceiros (corretoras, fundos, bancos, varejistas) integram a API do Orkest e seus usuários finais (consumidores) configuram gatilhos que são executados automaticamente.

## Camadas

### 1. Frontend (4 apps Next.js 14)

| App | Porta | Função | Audiência |
|---|---|---|---|
| `apps/marketing` | 3000 | Site público institucional | Visitantes externos |
| `apps/admin` | 3002 | Painel interno Orkest | Time Orkest |
| `apps/partner` | 3003 | Portal do cliente B2B | Corretoras, fundos, etc. |
| `apps/consumer` | 3004 | Portal do consumidor final | Clientes dos parceiros |

### 2. Backend (NestJS)

**apps/api** — Porta 3001

```
src/
├── modules/
│   ├── destinations/          # Adapters (mock + reais)
│   │   ├── destination.interface.ts
│   │   ├── destination-registry.ts
│   │   └── mock-providers/
│   │       ├── mock-stock-broker.ts
│   │       ├── mock-fund-distributor.ts
│   │       ├── mock-crypto-exchange.ts
│   │       ├── mock-bank-transfer.ts
│   │       └── mock-retailer.ts
│   ├── ai/                    # AI Service (OpenAI)
│   ├── triggers/              # Trigger Engine + Catalog
│   ├── executions/            # State Machine
│   ├── market-data/           # Preços reais (Yahoo/CoinGecko)
│   ├── open-finance/          # Bank Transfer Service
│   ├── webhooks/              # In + Out
│   └── reports/               # 3 visões
├── workers/                   # BullMQ
│   ├── trigger-evaluation.worker.ts
│   └── market-watcher.worker.ts
└── infrastructure/            # DB, Queue, Vault
```

### 3. Integrações Externas

| Serviço | Função | Quando real |
|---|---|---|
| **Efí Bank** | Open Finance + ITP | API real (sandbox/homologação/produção) |
| **Woovi** | Recebimento Pix + Subcontas | API real |
| **Yahoo Finance** | Cotação de ações | API gratuita (sem auth) |
| **CoinGecko** | Cotação de cripto | API gratuita (rate limit) |
| **OpenAI** | Structured Outputs (NL → JSON) | API com chave |
| **HashiCorp Vault** | Criptografia de tokens/secrets | Dev mode + produção |
| **MailHog** | SMTP dev (testes de email) | Substituir por SendGrid/SES |

## Fluxo de Execução (Happy Path)

```
1. CRON @every 1min
   └─ MarketWatcherWorker.tick()
       └─ Pra cada trigger ativo: queue.add('evaluate', { triggerId })

2. TriggerEvaluationWorker
   └─ TriggerEngine.evaluateTrigger()
       ├─ MarketDataService.getStockQuote(ticker)
       ├─ MarketDataService.getStockHistory()
       ├─ BankTransferService.getBalance(userId)
       └─ Retorna { shouldFire, reason, data }

3. SE shouldFire = true:
   └─ TriggerEngine.executeTrigger()
       ├─ Cria Execution (status: EVALUATING)
       ├─ Status → INITIATING_PIX
       ├─ BankAdapter.execute(TRANSFER)     ← Efí ITP
       ├─ Status → PIX_CONFIRMED
       ├─ DestinationAdapter.execute()      ← Mock Stock/Fund/Crypto/Retailer
       ├─ Status → COMPLETED
       └─ Audit log + Webhook pro parceiro

4. Webhook out:
   └─ POST { partner.webhookUrl }
       Body: { event: "trigger.executed", details... }
```

## State Machine — Execution

```
PENDING
  ↓
EVALUATING
  ↓ (passa)
EVALUATION_PASSED → INITIATING_PIX
  ↓ (Pix falha)
EVALUATION_FAILED [SKIP]
  ↓
INITIATING_PIX → PIX_PENDING → PIX_CONFIRMED
  ↓ (Pix falhou)
FAILED [PIX_FAILED]
  ↓
EXECUTING_DESTINATION
  ↓ (destino falhou)
FAILED [DEST_FAILED]
  ↓
COMPLETED ✅
```

## Modelo de Dados (Prisma)

Tabelas principais:
- `Partner` — B2B client (corretora, fundo, banco, varejista)
- `ApiKey` — Autenticação de parceiro
- `ConsumerUser` — Usuário final (cliente do cliente)
- `Trigger` — Regra configurada
- `Execution` — Tentativa de execução (state machine)
- `AuditLog` — Trilha imutável
- `TriggerCatalog` — Catálogo global de gatilhos
- `Notification` — Push/email enviado

Ver [schema.prisma](../apps/api/prisma/schema.prisma) completo.

## Segurança

- **Tokens Open Finance**: armazenados criptografados no HashiCorp Vault
- **API Keys**: bcrypt hash no banco
- **Webhooks**: assinatura HMAC-SHA256
- **LGPD**: Operador (Orkest) processa em nome do Controlador (parceiro B2B)
- **Audit Log**: imutável, append-only
- **Idempotência**: cada execution tem ID único, retry não duplica

## Escalabilidade

- **Filas assíncronas** (BullMQ/Redis) — processa milhares de triggers em paralelo
- **Rate limit** respeitando APIs externas (Efí, Woovi)
- **Horizontal scaling** — múltiplas instâncias do worker
- **Cache** de preços (TTL 1min) — evita bater em Yahoo/CoinGecko repetidamente
- **State machine persistente** — sobrevive a crashes, retoma automaticamente

## Por que Mock-First

| Benefício | Detalhe |
|---|---|
| Zero dependência externa | Desenvolve e testa sem API key de ninguém |
| Demo pra prospects | Mostra sistema completo sem precisar homologar |
| Edge cases controláveis | Força falhas, simula cotações, etc. |
| Troca trivial | Mock → real = 1 linha de config |

A `DestinationRegistry` resolve qual adapter usar por partner + tipo. Trocar mock por real não exige mudança no Trigger Engine.
