# 🏗️ Arquitetura do NextGen Assets

## Visão Geral

NextGen é um **monorepo** com 4 aplicações + API + SDK.

```
orkest/
├── apps/
│   ├── api/              # NestJS API (Backend)
│   ├── marketing/        # Next.js site institucional
│   ├── consumer/         # Next.js app do consumidor
│   ├── admin/            # Next.js painel admin
│   └── partner/          # Next.js app do parceiro (marketplace)
├── sdk/
│   └── js/               # SDK JavaScript/TypeScript
├── postman/              # Postman collection
├── scripts/              # Scripts auxiliares
├── docs/                 # Documentação
└── prisma/               # Schema do banco
```

---

## 🔧 Stack Técnico

### Backend (`apps/api`)

- **Framework:** NestJS 10
- **Runtime:** Node.js 20
- **Linguagem:** TypeScript 5
- **ORM:** Prisma 5
- **DB:** PostgreSQL 15
- **Auth:** API Key + JWT (opcional)
- **Jobs:** Bull + Redis
- **Schedule:** @nestjs/schedule
- **Docs:** Swagger (OpenAPI 3.0)

### Frontend (4 apps Next.js)

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3
- **UI:** HeadlessUI + HeroIcons
- **State:** React Query (TanStack Query)
- **Auth:** NextAuth.js (em dev)

### Banco de Dados

**PostgreSQL 15** (Supabase em prod)

**Tabelas principais:**
```prisma
model Partner {
  id            String   @id
  slug          String   @unique
  name          String
  commissionRate Decimal @default(0.03)
  // ... mais campos
}

model ConsumerUser {
  id              String   @id
  partnerId       String
  externalUserId  String
  plan            PlanType @default(FREE)
  // ...
}

model Charge {
  id            String   @id
  partnerId     String
  userId        String
  value         Int      // centavos
  status        ChargeStatus
  wooviChargeId String?
  // ...
}

model Consent {
  id            String   @id
  userId        String
  partnerId     String
  provider      String   // 'pluggy' | 'klavi' | 'efi-of'
  status        ConsentStatus
  // ...
}

model Trigger {
  id            String   @id
  userId        String
  partnerId     String
  code          String   // 'gatilho-compra'
  config        Json
  active        Boolean  @default(true)
  // ...
}

model AuditLog {
  id            String   @id
  action        String
  resource      String
  resourceId    String?
  actor         String
  metadata      Json
  createdAt     DateTime @default(now())
}
```

---

## 🌐 Providers (3ºs)

### Woovi (PIX + Split)

**Por quê:** Gateway PIX brasileiro, suporte split nativo, subcontas, Pix Automático.

**Features usadas:**
- ✅ Cobrança PIX (QR Code + link)
- ✅ Split nativo (splitType: SPLIT_SUB_ACCOUNT)
- ✅ Subcontas (virtual accounts)
- ✅ Pix Automático (subscription recorrente)
- ✅ Webhook (CHARGE_COMPLETED)

**URL:** https://api.woovi.com

### Pluggy (Open Finance - read)

**Por quê:** Open Finance Brasil read-only.

**Features usadas:**
- ✅ Connect Token (widget pra conectar banco)
- ✅ Listar contas do cliente
- ✅ Listar transações
- ✅ Saldos

**Limitação:** R$ 0,50 por query (caro)

### Klavi (Open Finance - read, mais barato)

**Por quê:** Alternativa ao Pluggy, sandbox free.

**Features:** mesmas do Pluggy, mas **mais barato** (free em sandbox).

### Efi (Open Finance + PISP)

**Por quê:** **Único** com PISP (Payment Initiation).

**Status:** Em homologação (cert mTLS pending).

---

## 🔐 Autenticação

### API Key (padrão)

Todas as requisições precisam do header `X-API-Key`:

```bash
curl -H "X-API-Key: nka_sua_chave" https://api.nextgenassets.com.br/v1/...
```

**Como gerar:**
1. Login em https://nextgenassets.com.br/login
2. Settings → API Keys
3. Generate New Key
4. Copiar (formato: `nka_xxxxx...`)

### JWT (opcional, para apps B2C)

```bash
curl -H "Authorization: Bearer eyJhbGc..." https://api.nextgenassets.com.br/v1/...
```

---

## 🚀 Deploy

### API (Render)

- **URL prod:** https://api.nextgenassets.com.br
- **Build:** `cd apps/api && npm install && npm run build`
- **Start:** `node dist/main`
- **Health check:** `GET /health` → 200

### Marketing (Netlify)

- **URL:** https://nextgenassets.com.br
- **Build:** `cd apps/marketing && npm install && npm run build`
- **Output:** `.next/`

### Consumer / Partner (Vercel)

- **URL Consumer:** https://app.nextgenassets.com.br
- **URL Partner:** https://partner.nextgenassets.com.br
- **Build:** padrão Next.js

---

## 📊 Variáveis de Ambiente

### API

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/nextgen

# Auth
JWT_SECRET=<random-64-chars>
API_KEY_PREFIX=nka_

# Woovi
WOOVI_API_URL=https://api.woovi.com
WOOVI_APP_ID=<base64-encoded>
WOOVI_ENABLED=true
WOOVI_FROM_PIX_KEY=61922930000197

# Pluggy
PLUGGY_CLIENT_ID=<your-id>
PLUGGY_CLIENT_SECRET=<your-secret>
PLUGGY_ENABLED=true

# Klavi
KLAVI_API_URL=https://api-sandbox.klavi.ai
KLAVI_ACCESS_KEY=<access>
KLAVI_SECRET_KEY=<secret>
KLAVI_ENABLED=true

# Efi OF (PISP)
EFI_CLIENT_ID=<client-id>
EFI_CLIENT_SECRET=<client-secret>
EFI_CERTIFICATE_BASE64=<base64-of-p12>
EFI_OF_API_URL=https://openfinance.api.efibank.com.br
EFI_ENABLED=true

# Cron
AUTO_WITHDRAW_MIN_CENTS=100
AUTO_WITHDRAW_CRON=0 * * * *  # a cada hora

# OpenAI (AI Orchestrator)
OPENAI_API_KEY=sk-...
```

---

## 🔄 Fluxo de uma Transação Completa

```
1. User no seu app clica "Pagar"
2. Seu backend → POST /v1/admin/webhooks/woovi-test
   (com totalCents + splits)
3. API NextGen → POST Woovi /api/v1/charge
4. Woovi retorna charge + QR Code
5. Seu backend recebe response
6. User paga via PIX
7. Woovi webhook → POST /v1/webhooks/woovi-public
   {event: "OPENPIX:CHARGE_COMPLETED"}
8. API processa webhook:
   - Marca charge como PAID
   - Split automático (Woovi credita subcontas)
   - Loga AuditLog
9. Cron (1h) verifica saldos > R$ 1,00
10. Auto-withdraw via Woovi
11. PIX OUT chega na conta do vendedor
```

---

## 🛠️ Como Adicionar Novo Provider

1. Criar módulo em `apps/api/src/modules/<provider>/`
2. Implementar service (comunicação com API externa)
3. Implementar controller (endpoints admin)
4. Registrar no `app.module.ts`
5. Adicionar env vars no `.env.example`
6. Documentar em `docs/integracao/`
7. Adicionar testes

Exemplo de módulo:
```typescript
// apps/api/src/modules/meuprovider/meuprovider.module.ts
@Module({
  providers: [MeuProviderService],
  controllers: [MeuProviderController],
  exports: [MeuProviderService]
})
export class MeuProviderModule {}
```

---

## 📞 Contato Arquitetura

- **Tech Lead:** Henrique C.
- **Email:** dev@nextgenassets.com.br
- **Slack:** (em breve)

---

**Próximo:** [02_SETUP_LOCAL.md](02_SETUP_LOCAL.md) - Como rodar localmente
