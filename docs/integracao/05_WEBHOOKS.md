# 🪝 Webhooks

> **Para:** Devs que querem receber notificações de eventos do NextGen

---

## Visão Geral

NextGen envia webhooks para **3 tipos de eventos**:

1. **Woovi** (PIX pago/expirado/cancelado)
2. **Efi OF** (Open Finance consent + payment)
3. **Pluggy/Klavi** (Open Finance connect)

Você pode:
- Receber webhooks do NextGen
- Cadastrar sua URL de webhook

---

## 📥 Webhooks que o NextGen RECEBE

### 1. Woovi Webhook

**URL:** `POST /v1/webhooks/woovi-public`

**Eventos:**
- `OPENPIX:CHARGE_COMPLETED` - Cobrança paga
- `OPENPIX:CHARGE_EXPIRED` - Cobrança expirou
- `OPENPIX:CHARGE_CANCELED` - Cobrança cancelada
- `OPENPIX:TRANSACTION_RECEIVED` - PIX direto recebido

**Payload exemplo:**
```json
{
  "event": "OPENPIX:CHARGE_COMPLETED",
  "charge": {
    "identifier": "woovi-abc123",
    "correlationID": "order-001",
    "value": 10000,
    "status": "COMPLETED",
    "paidAt": "2026-06-22T18:00:00Z"
  }
}
```

**Configurar URL no painel Woovi:**
1. Login em https://app.woovi.com
2. Settings → Webhooks
3. URL: `https://api.nextgenassets.com.br/v1/webhooks/woovi-public`
4. Salvar

---

### 2. Efi OF Webhook

**URL:** `POST /v1/webhooks/efi-of-public?ignorar=`

**Eventos:**
- `consent.authorized` - Cliente autorizou OF
- `consent.rejected` - Cliente rejeitou OF
- `payment.completed` - Pagamento OF completou
- `payment.failed` - Pagamento OF falhou

**Payload exemplo:**
```json
{
  "event": "consent.authorized",
  "data": {
    "consentId": "urn:efi:consent:abc",
    "loggedUser": {
      "document": { "identification": "34198276870", "rel": "CPF" }
    }
  }
}
```

**Importante:** Usar `?ignorar=` no final da URL para Efi NÃO adicionar `/pix` automaticamente.

---

### 3. Pluggy Webhook

**URL:** `POST /v1/webhooks/pluggy-public`

**Eventos:**
- `item/created` - Item criado no Pluggy Connect
- `item/updated` - Item atualizado
- `consent/authorized` - Consent autorizado
- `consent/revoked` - Consent revogado

---

## 📤 Webhooks que o NextGen ENVIA

Você pode cadastrar uma URL no seu painel NextGen e receber webhooks.

### Como cadastrar

```bash
curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-test \
  -H "X-API-Key: nka_..." \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://seu-app.com/webhooks/nextgen",
    "events": ["charge.completed", "subscription.payment"]
  }'
```

### Eventos disponíveis

| Evento | Quando |
|---|---|
| `charge.completed` | Cobrança PIX paga |
| `charge.expired` | Cobrança expirou |
| `subscription.created` | Nova subscription criada |
| `subscription.payment` | Payment recorrente processado |
| `subscription.cancelled` | Subscription cancelada |
| `withdraw.completed` | Auto-withdraw completou |
| `consent.authorized` | OF consent autorizado |
| `payment.completed` | OF payment completou |

### Payload

```json
{
  "event": "charge.completed",
  "timestamp": "2026-06-22T18:00:00Z",
  "data": {
    "chargeId": "woovi-abc123",
    "correlationID": "order-001",
    "value": 10000,
    "splits": [
      { "pixKey": "...", "value": 300 },
      { "pixKey": "...", "value": 9700 }
    ],
    "paidAt": "2026-06-22T18:00:00Z"
  },
  "signature": "sha256=..." // HMAC pra validação
}
```

---

## 🔐 Validar Assinatura (HMAC)

**Por quê?** Garantir que o webhook é realmente do NextGen.

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// No seu handler
app.post('/webhooks/nextgen', (req, res) => {
  const signature = req.headers['x-nextgen-signature'];
  const isValid = verifyWebhook(
    JSON.stringify(req.body),
    signature,
    process.env.NEXTGEN_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Processar evento
  const { event, data } = req.body;
  
  switch (event) {
    case 'charge.completed':
      // Marcar order como paga
      break;
    case 'subscription.payment':
      // Renovar acesso
      break;
  }
  
  res.status(200).send('ok');
});
```

---

## 🛡️ Segurança (Best Practices)

### 1. Sempre validar assinatura

```javascript
if (!verifyWebhook(payload, signature, secret)) {
  return res.status(401).send('Invalid');
}
```

### 2. Usar HTTPS

```
https://seu-app.com/webhooks/nextgen  ✅
http://seu-app.com/webhooks/nextgen   ❌
```

### 3. Responder rápido (< 5s)

```javascript
// Bom: async processing
app.post('/webhooks/nextgen', (req, res) => {
  res.status(200).send('ok'); // responde rápido
  
  // Processa em background
  process.nextTick(() => {
    handleEvent(req.body);
  });
});

// Ruim: sync processing (> 5s)
app.post('/webhooks/nextgen', (req, res) => {
  handleEventSync(req.body); // pode demorar
  res.status(200).send('ok');
});
```

### 4. Idempotência

```javascript
// Use o chargeId como idempotency key
const processed = new Set();

app.post('/webhooks/nextgen', (req, res) => {
  const { chargeId } = req.body.data;
  
  if (processed.has(chargeId)) {
    return res.status(200).send('already processed');
  }
  
  processed.add(chargeId);
  handleEvent(req.body);
  res.status(200).send('ok');
});
```

---

## 🧪 Testar Webhooks Localmente

### Opção 1: ngrok

```bash
# Instalar ngrok
npm install -g ngrok

# Expor localhost:3000
ngrok http 3000

# ngrok retorna URL tipo: https://abc123.ngrok.io
# Cadastrar no NextGen: https://abc123.ngrok.io/webhooks/nextgen
```

### Opção 2: Webhook.site

```bash
# Usar webhook.site pra debug
# 1. Acessar https://webhook.site
# 2. Copiar URL única (ex: https://webhook.site/abc-123)
# 3. Cadastrar no NextGen
# 4. Disparar evento
# 5. Ver payload em https://webhook.site
```

### Opção 3: Simular manualmente

```bash
# Simular webhook Woovi manualmente
curl -X POST http://localhost:3000/v1/webhooks/woovi-public \
  -H "Content-Type: application/json" \
  -d '{
    "event": "OPENPIX:CHARGE_COMPLETED",
    "charge": {
      "identifier": "test-001",
      "value": 10000,
      "status": "COMPLETED"
    }
  }'
```

---

## 📋 Headers Importantes

| Header | Quando | Significado |
|---|---|---|
| `X-Webhook-Signature` | NextGen → Seu app | HMAC SHA256 do payload |
| `X-Webhook-Event` | NextGen → Seu app | Tipo do evento |
| `X-Webhook-Delivery` | NextGen → Seu app | UUID único da entrega |
| `X-Webhook-Timestamp` | NextGen → Seu app | Unix timestamp |
| `User-Agent: NextGen-Webhook/1.0` | NextGen → Seu app | Identifica origem |

---

## 🔄 Retry Policy

Se seu webhook retornar erro (4xx/5xx), NextGen tenta de novo:

```
Tentativa 1: imediato
Tentativa 2: +30s
Tentativa 3: +2min
Tentativa 4: +10min
Tentativa 5: +1h
Tentativa 6: +6h
Tentativa 7: +24h

Após 7 falhas: webhook vai pra "dead letter" (descartado)
```

**Dica:** Sempre responda 200 OK rápido e processe em background.

---

## 📊 Dashboard de Webhooks (em breve)

Em produção, você poderá ver em https://nextgenassets.com.br/dashboard/webhooks:
- Lista de webhooks enviados
- Status (200, 4xx, 5xx)
- Retries
- Logs de payload

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328

---

**Próximo:** [06_SPLIT_PIX.md](06_SPLIT_PIX.md) - Como funciona o split
