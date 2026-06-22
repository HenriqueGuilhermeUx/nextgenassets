# 📡 Referência Completa da API

**Base URL:** `https://api.nextgenassets.com.br`
**Auth:** Header `X-API-Key` (obrigatório)

---

## 🏥 Health & Info

### `GET /health`

Health check da API.

**Response 200:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-06-22T18:00:00Z"
}
```

### `GET /api-spec.json`

OpenAPI 3.0 spec (Swagger).

**Útil para:** gerar SDK em outras linguagens.

---

## 💳 Billing (B2C)

### `GET /v1/billing/me`

Retorna info do plano do user.

**Headers:**
- `X-API-Key: nka_...`
- `X-User-Id: <user-id>` (opcional, pra user específico)

**Response 200:**
```json
{
  "success": true,
  "userId": "cmqa2r5w70001hmvqqvgywyxd",
  "partnerId": "cmq9py9m70000o0ijl4wreunk",
  "plan": "PREMIUM",
  "triggersLimit": 100,
  "triggersUsed": 12,
  "triggersRemaining": 88,
  "features": ["open_finance", "ai_orchestrator", "split"]
}
```

### `POST /v1/billing/check-limit`

Verifica se user pode executar ação.

**Body:**
```json
{
  "action": "create_trigger" | "receive_pix",
  "userId": "<user-id>"
}
```

**Response 200:**
```json
{
  "success": true,
  "allowed": true,
  "remaining": 88
}
```

**Response 402 (limite atingido):**
```json
{
  "success": false,
  "allowed": false,
  "error": "Limite FREE atingido (5/mês). Faça upgrade para PREMIUM.",
  "upgradeUrl": "/billing"
}
```

### `POST /v1/billing/activate`

Ativa plano PREMIUM (B2C).

**Body:**
```json
{
  "userId": "<user-id>",
  "plan": "PREMIUM",
  "correlationID": "<woovi-correlation-id>"
}
```

---

## 💰 Woovi (PIX + Split)

### `POST /v1/admin/webhooks/woovi-test`

Cria uma cobrança PIX com split.

**Body:**
```json
{
  "totalCents": 10000,
  "nextgenCents": 300,
  "partnerCents": 9700,
  "nextgenPixKey": "61922930000197",
  "partnerPixKey": "34198276870",
  "correlationID": "order-001",
  "comment": "Venda marketplace",
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "taxID": "12345678900"
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "charge": {
    "identifier": "woovi-abc123",
    "correlationID": "order-001",
    "brCode": "00020126...",
    "paymentLinkUrl": "https://woovi.com/pay/abc123",
    "qrCodeImage": "data:image/png;base64,...",
    "value": 10000,
    "status": "ACTIVE",
    "splits": [
      { "pixKey": "61922930000197", "value": 300 },
      { "pixKey": "34198276870", "value": 9700 }
    ]
  }
}
```

### `GET /v1/admin/webhooks/woovi-subaccounts`

Lista subcontas com saldos.

**Response 200:**
```json
{
  "count": 2,
  "totalCents": 0,
  "subaccounts": [
    {
      "pixKey": "61922930000197",
      "name": "NextGen Assets",
      "balance": 0,
      "withdrawBlocked": false
    },
    {
      "pixKey": "34198276870",
      "name": "henrique teste",
      "balance": 0,
      "withdrawBlocked": false
    }
  ]
}
```

### `POST /v1/admin/webhooks/woovi-withdraw`

Saca saldo de 1 subconta.

**Body:**
```json
{
  "pixKey": "34198276870",
  "value": 920
}
```

**Response 201:**
```json
{
  "success": true,
  "transaction": {
    "value": 920,
    "endToEndId": "E000000002026...",
    "status": "CREATED"
  }
}
```

### `POST /v1/admin/webhooks/woovi-withdraw-all`

Saca de TODAS as subcontas (auto-withdraw).

**Body:**
```json
{
  "minCents": 100
}
```

**Response 201:**
```json
{
  "success": true,
  "withdrawals": [
    { "pixKey": "61922930000197", "value": 30, "status": "OK" },
    { "pixKey": "34198276870", "value": 920, "status": "OK" }
  ]
}
```

### `POST /v1/admin/webhooks/woovi-pixout`

PIX OUT (transferência entre contas).

**Body:**
```json
{
  "value": 500,
  "pixKey": "henriquecampos66@gmail.com",
  "correlationID": "withdraw-001"
}
```

### `POST /v1/admin/webhooks/woovi-subscriber-create`

Cria subscription (Pix Automático).

**Body:**
```json
{
  "taxID": "34198276870",
  "value": 1990,
  "dayGenerateCharge": 5
}
```

**Response 201:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-abc123",
    "value": 1990,
    "dayGenerateCharge": 5,
    "type": "RECURRENT",
    "chargeType": "OVERDUE",
    "status": "ACTIVE"
  }
}
```

### `GET /v1/admin/webhooks/woovi-subscription-list`

Lista subscriptions ativas.

### `POST /v1/admin/webhooks/woovi-subscriber-cancel`

Cancela subscription.

**Body:**
```json
{
  "taxID": "34198276870"
}
```

### `GET /v1/admin/webhooks/woovi-cron-status`

Status do cron de auto-withdraw.

---

## 🏦 Open Finance - Read

### Pluggy

#### `GET /v1/admin/webhooks/pluggy-status`
Status do Pluggy.

#### `POST /v1/admin/webhooks/pluggy-connect-token`

Cria Connect Token (widget).

**Body:**
```json
{
  "clientUserId": "user-001"
}
```

**Response 201:**
```json
{
  "connectToken": "ct-abc...",
  "clientUserId": "user-001"
}
```

#### `GET /v1/admin/webhooks/consents`

Lista consents Pluggy salvos.

**Response 200:**
```json
{
  "count": 1,
  "consents": [
    {
      "id": "consent-001",
      "provider": "pluggy",
      "status": "ACTIVE",
      "providerUserId": "34198276870"
    }
  ]
}
```

### Klavi (mais barato, sandbox free)

#### `GET /v1/admin/webhooks/klavi-status`
#### `POST /v1/admin/webhooks/klavi-test`
#### `POST /v1/admin/webhooks/klavi-simulate`

(Klavi é mais novo, endpoints similares ao Pluggy)

---

## 🏦 Open Finance - PISP (Efi OF)

> ⚠️ Em homologação. mTLS pending.

### `GET /v1/admin/webhooks/efi-of-status`
### `POST /v1/admin/webhooks/efi-criar-consent`
### `POST /v1/admin/webhooks/efi-pay`
### `POST /v1/admin/webhooks/efi-of-flow-completo`

(Flow completo: cria consent + inicia pagamento + split Woovi)

---

## 🤖 AI Orchestrator

### `POST /v1/admin/webhooks/from-natural-language`

Cria gatilho a partir de linguagem natural.

**Body:**
```json
{
  "userInput": "Cobrar R$ 100 todo dia 5 de todo mês",
  "userId": "user-001"
}
```

**Response 201:**
```json
{
  "success": true,
  "trigger": {
    "id": "trigger-001",
    "code": "pix-recurring",
    "config": {
      "value": 10000,
      "dayOfMonth": 5
    }
  },
  "aiReasoning": "Detectei cobrança recorrente de R$ 100, agendada para dia 5..."
}
```

### `POST /v1/admin/webhooks/orchestrate`

Orchestra múltiplos passos.

**Body:**
```json
{
  "userInput": "Conectar banco do João, ler saldo, e se tiver > R$ 500, pagar R$ 100 via split",
  "userId": "user-001"
}
```

---

## 🎯 Gatilhos (Triggers)

### `GET /v1/admin/webhooks/triggers`

Lista todos os gatilhos.

### `POST /v1/admin/webhooks/:userId/apply`

Aplica gatilho manualmente.

### `POST /v1/admin/webhooks/:id/force-execute`

Força execução imediata.

---

## 🔌 Webhooks (Recebidos)

### `POST /v1/webhooks/woovi-public`

Webhook do Woovi (configurado automaticamente).

**Eventos:**
- `OPENPIX:CHARGE_COMPLETED` → charge paga
- `OPENPIX:CHARGE_EXPIRED` → charge expirou

### `POST /v1/webhooks/efi-public`

Webhook da Efi.

**Configurar:** `?ignorar=` no final da URL.

---

## 🛠️ Admin / Debug

### `GET /v1/admin/webhooks/list-users`
Lista users (debug).

### `GET /v1/admin/webhooks/stats/summary`
Stats gerais.

### `GET /v1/admin/webhooks/trace`
Trace de execução.

---

## 📋 Códigos de Erro

| Status | Código | Significado |
|---|---|---|
| 200 | OK | Sucesso |
| 201 | Created | Recurso criado |
| 400 | Bad Request | Parâmetros inválidos |
| 401 | Unauthorized | API key inválida |
| 402 | Payment Required | Limite do plano atingido |
| 404 | Not Found | Recurso não existe |
| 409 | Conflict | Conflito (ex: split duplicado) |
| 422 | Unprocessable | Validação falhou |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Error | Erro no servidor |
| 502 | Bad Gateway | Provider (Woovi/Pluggy) offline |
| 503 | Unavailable | Manutenção |

---

## 🆘 Códigos de Erro Customizados

| Error Code | Significado |
|---|---|
| `INVALID_SPLIT` | Split não soma o total |
| `INSUFFICIENT_BALANCE` | Saldo insuficiente |
| `WOOVI_ERROR` | Erro no Woovi |
| `OPEN_FINANCE_TIMEOUT` | OF não respondeu |
| `PLAN_LIMIT_REACHED` | Limite FREE/PREMIUM |
| `INVALID_PIX_KEY` | Chave PIX inválida |
| `DAILY_LIMIT_EXCEEDED` | Limite diário Woovi |

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328

---

**Próximo:** [04_FLUXOS.md](04_FLUXOS.md) - Fluxos completos de uso
