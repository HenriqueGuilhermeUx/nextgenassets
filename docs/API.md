# API Reference — Orkest

> Base URL: `http://localhost:3001/v1`
> Auth: API Key (parceiro) — header `X-API-KEY`
> Em produção: HTTPS obrigatório + assinatura HMAC em webhooks

---

## Health

### `GET /health`
```json
{
  "status": "ok",
  "service": "orkest-api",
  "version": "1.0.0",
  "mockAdapters": ["STOCK_BROKER", "FUND_DISTRIBUTOR", "CRYPTO_EXCHANGE", "BANK_ACCOUNT", "RETAILER"],
  "triggerCatalog": 20
}
```

---

## Partners

### `GET /partners`
Lista todos os parceiros.

### `GET /partners/:id`
Detalhe de um parceiro + métricas agregadas.

### `GET /partners/slug/:slug`
Busca por slug.

### `POST /partners`
Cria novo parceiro.

---

## Users (consumidores finais)

### `GET /users?partnerId=...`
Lista usuários de um parceiro.

### `GET /users/:id`
Detalhe + triggers + execuções.

### `POST /users`
```json
{
  "partnerId": "ckxxx",
  "externalUserId": "user-12345",
  "email": "user@email.com",
  "name": "João Silva"
}
```

### `POST /users/:id/consent/activate`
Simula ativação de consentimento Open Finance.

---

## Catalog (Gatilhos Disponíveis)

### `GET /catalog/triggers?category=INVESTMENT_AUTO&destinationType=STOCK_BROKER`
Lista gatilhos disponíveis.

### `GET /catalog/triggers/:code`
Detalhe de um gatilho.

### `GET /catalog/categories`
Lista de categorias.

---

## Triggers (Regras do Usuário)

### `GET /triggers?partnerId=...&userId=...&status=ACTIVE`
Lista gatilhos com filtros.

### `GET /triggers/:id`
Detalhe + histórico de execuções.

### `POST /triggers`
Cria gatilho a partir de parâmetros estruturados.
```json
{
  "partnerId": "ckxxx",
  "userId": "ckyyy",
  "code": "BUY_DIP_STOCK",
  "name": "ITUB4 na queda",
  "params": { "ticker": "ITUB4", "dipPct": 2, "windowDays": 7, "amountBrl": 500, "minBalance": 5000 }
}
```

### `POST /triggers/from-natural-language` 🧠
Cria gatilho via IA (linguagem natural).
```json
{
  "partnerId": "ckxxx",
  "userId": "ckyyy",
  "naturalLanguage": "Compra R$ 500 de ITUB4 se cair 2% em 7 dias"
}
```
Resposta inclui `aiInterpretation` com ruleType, params, confidence, warnings.

### `PUT /triggers/:id/pause`
Pausa gatilho.

### `PUT /triggers/:id/resume`
Reativa gatilho.

### `POST /triggers/:id/test-evaluation` 🧪
Roda avaliação sem executar. Retorna `{ shouldFire, reason, data }`.

### `POST /triggers/:id/force-execute` 🚀
Força execução manual (demo).

### `DELETE /triggers/:id`
Cancela gatilho.

---

## Executions

### `GET /executions?partnerId=...&userId=...&triggerId=...&status=COMPLETED&limit=100`
Lista execuções com filtros.

### `GET /executions/:id`
Detalhe completo (incluindo state machine, retries, error).

### `GET /executions/stats/summary`
```json
{
  "total": 1247,
  "completed": 1198,
  "failed": 32,
  "pending": 17,
  "successRate": 96.07
}
```

---

## AI Service

### `POST /ai/translate-rule`
```json
{ "naturalLanguage": "Compra ITUB4 se cair 2%", "context": { "userBalance": 5000 } }
```

### `POST /ai/monthly-insight`
Gera insight do mês pra um usuário.

---

## Reports (3 visões)

### `GET /reports/consumer/:userId?month=2026-06`
Relatório do consumidor final.

### `GET /reports/partner/:partnerId?month=2026-06`
Relatório do parceiro B2B (MAU, take-rate, top gatilhos).

### `GET /reports/internal/profitability?month=2026-06`
Relatório interno Orkest (margem, receita por parceiro).

---

## Webhooks

### `POST /webhooks/pix-received` (entrada)
Recebe confirmação de Pix da Efí/Woovi.

### `POST /webhooks/destination-confirmed` (entrada)
Recebe confirmação de execução do destino.

### `POST /webhooks/out/notify-partner` (saída)
Dispara notificação pro parceiro.

**Eventos enviados ao parceiro:**
- `trigger.executed` ✅
- `trigger.failed` ❌
- `trigger.paused` ⏸
- `consent.revoked` 🔒

---

## Schemas Comuns

### ExecutionStatus
```
PENDING → EVALUATING → EVALUATION_PASSED → INITIATING_PIX →
PIX_PENDING → PIX_CONFIRMED → EXECUTING_DESTINATION → COMPLETED
                                                  ↘ FAILED
```

### TriggerStatus
```
ACTIVE, PAUSED, EXHAUSTED, BUDGET_EXCEEDED, FAILED, CANCELED
```

### DestinationType
```
STOCK_BROKER, FUND_DISTRIBUTOR, CRYPTO_EXCHANGE, BANK_ACCOUNT, RETAILER, INSURER, BILL_PAYER
```

---

## Erros

Todos os erros retornam:
```json
{
  "statusCode": 400,
  "message": "Mensagem do erro",
  "error": "Bad Request"
}
```

Códigos comuns:
- `400` — Validação falhou
- `401` — API key inválida
- `404` — Recurso não encontrado
- `409` — Conflito (ex: gatilho duplicado)
- `429` — Rate limit
- `500` — Erro interno

---

## Rate Limits

| Endpoint | Limite |
|---|---|
| `POST /triggers*` | 100 req/min por partner |
| `POST /ai/*` | 30 req/min por partner |
| Webhooks in | Ilimitado (com assinatura) |
| Relatórios | 60 req/min por partner |
