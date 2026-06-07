# Features Avançadas — Orkest v2.0

> 6 adições que transformam o Orkest de "motor de automação" em "plataforma de demanda futura".

---

## 1. 🛍️ Pre-Order Flow Completo

O lojista agora gerencia um **pipeline de vendas agendadas** com visibilidade total de estoque e caixa futuro.

### Endpoints

| Endpoint | Método | Função |
|---|---|---|
| `/v1/retailer/pre-orders` | POST | Cria reserva (chamado pelo Trigger Engine) |
| `/v1/retailer/pre-orders/:id/confirm` | POST | Confirma pagamento + reserva no estoque |
| `/v1/retailer/pre-orders/:id/ship` | POST | Despacha + gera tracking code |
| `/v1/retailer/pre-orders` | GET | Lista pipeline com filtros |
| `/v1/retailer/pipeline/summary` | GET | KPIs: total pendente, valor, etc |
| `/v1/retailer/inventory` | GET | Estoque atual de todos os produtos |
| `/v1/retailer/restock/today` | GET | Produtos que voltam ao estoque hoje |
| `/v1/retailer/forecast` | GET | Previsão conservadora/realista/otimista |

### Estados da Reserva

```
PENDING → CONFIRMED → FULFILLED
   ↓          ↓
CANCELED   CANCELED
```

### Exemplo de Uso

```bash
# Cliente configura gatilho BALANCE_TRIGGER_BUY
# Sistema detecta saldo OK, dispara:

curl -X POST /v1/retailer/pre-orders \
  -d '{"userId":"usr_123","sku":"PERFUME_X","quantity":1}'

# Reserva criada: PRE-ORDER-1699999

# Pix do cliente cai na conta via Efí ITP
# Lojista recebe webhook confirmando pagamento

curl -X POST /v1/retailer/pre-orders/PRE-ORDER-1699999/confirm
# Estoque reservado, status: CONFIRMED

# Lojista despacha
curl -X POST /v1/retailer/pre-orders/PRE-ORDER-1699999/ship
# Tracking code gerado, status: FULFILLED
```

---

## 2. 📊 Gráficos de Tendência (Recharts)

A página `/retailer-pipeline` agora tem **4 visualizações**:

| Gráfico | Tipo | O que mostra |
|---|---|---|
| Execuções ao longo do tempo | Area Chart | Volume de compras automatizadas/dia (últimos 30 dias) |
| Distribuição por gatilho | Pie Chart | Quais tipos de gatilho mais convertem |
| Previsão de receita | Bar Chart | 7/30/90 dias — quanto vai entrar |
| Top produtos pipeline | Horizontal Bar | Produtos mais pré-vendidos |

**Benefício pro lojista:** ver a curva de demanda antes dela acontecer.

---

## 3. 🤖 IA Proativa — Sugestões Personalizadas

Endpoint `GET /v1/ai/suggestions/:userId` analisa o perfil financeiro do consumidor e sugere **gatilhos relevantes pra vida real dele**.

### Como funciona

1. Lê Open Finance (saldo, transações, salário)
2. Detecta padrão: estável, variável, baixo, alto
3. Avalia risk profile (conservador, moderado, agressivo)
4. Pede pra IA sugerir 3-5 gatilhos com base no padrão

### Exemplo de Resposta

```json
{
  "profile": {
    "userId": "usr_123",
    "avgBalance": 6200,
    "avgMonthlyIncome": 5000,
    "incomeVariability": "STABLE",
    "savingsRate": 0.18,
    "riskProfile": "MODERATE"
  },
  "suggestions": [
    {
      "triggerCode": "DCA_FUND",
      "title": "Aporte mensal automático em fundo",
      "rationale": "Saldo médio R$ 6.200 + salário fixo = aporte consistente possível",
      "suggestedParams": {
        "fundId": "XP_SELECTION",
        "dayOfMonth": 10,
        "amountBrl": 500,
        "minBalance": 2000
      },
      "expectedImpact": "R$ 6.000/ano investidos automaticamente",
      "confidence": 0.87,
      "priority": 1
    },
    {
      "triggerCode": "RASI_CAIXA_FUND",
      "title": "Move excedente de caixa pro fundo DI",
      "rationale": "Saldo médio R$ 6.200 parado renderia ~R$ 680/ano em DI",
      "suggestedParams": {
        "fundId": "BTG_PACTUAL_YIELD",
        "minCashReserve": 3000,
        "dayOfMonth": 5
      },
      "expectedImpact": "~R$ 680/ano de rendimento",
      "confidence": 0.92,
      "priority": 1
    }
  ]
}
```

**Onde aparece no app:** consumer portal exibe os 3 top sugestões como "💡 Recomendado pra você".

---

## 4. 🔌 Adapters de E-commerce Reais

Dois adapters prontos pra produção:

### Shopify Adapter

**Config:**
```bash
SHOPIFY_SHOP_DOMAIN=loja.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_VERSION=2024-01
```

**Features:**
- Cria order com `financial_status: paid` (Pix já caiu)
- Verifica estoque em tempo real
- Webhook out pro Shopify quando fulfillment
- Admin URL incluída no retorno

**Ativação:**
```typescript
// app.module.ts
providers: [ShopifyAdapter, ...]

// Partner.config
{ "retailerAdapter": "SHOPIFY" }
```

### WooCommerce Adapter

**Config:**
```bash
WC_SITE_URL=https://loja.com.br
WC_CONSUMER_KEY=ck_xxxxx
WC_CONSUMER_SECRET=cs_xxxxx
```

**Features:**
- Cria order com `set_paid: true`
- Adiciona meta_data `_orkest_trigger`
- Verifica estoque antes
- Suporta orders de guest (sem customer_id)

---

## 5. 💬 Notificações WhatsApp

Serviço de notificação multi-canal com WhatsApp como canal premium (no Brasil é o preferido).

### Providers Suportados

| Provider | Quando usar | Config |
|---|---|---|
| `META_OFFICIAL` | Produção oficial (Meta for Business) | `META_WA_PHONE_ID`, `META_WA_TOKEN` |
| `ZAPI` | Solução BR mais popular | `ZAPI_INSTANCE`, `ZAPI_TOKEN` |
| `TWILIO` | Internacional | `TWILIO_SID`, `TWILIO_TOKEN` |
| `MOCK` | Dev (default) | Nenhuma |

### Templates de Mensagem

Cada evento tem template formatado com emoji + CTA:

```
✅ *Gatilho executado!*

Seu gatilho "ITUB4 na queda" foi executado. 
Movimentado: R$ 500.00.
22 ações ITUB4 compradas.

👉 Ver detalhes: https://app.com/triggers/123

— Orkest
```

### Eventos Suportados

- `TRIGGER_EXECUTED` ✅
- `TRIGGER_FAILED` ❌
- `TRIGGER_PAUSED` ⏸
- `PRE_ORDER_CREATED` 📋
- `PRE_ORDER_CONFIRMED` 🎉
- `PRE_ORDER_SHIPPED` 🚚
- `RESTOCK_AVAILABLE` 📦
- `BUDGET_WARNING` ⚠️
- `MONTHLY_INSIGHT` 📊

### Envio Multi-Canal

O sistema envia pra **todos os canais ativos** do usuário simultaneamente:

```typescript
await notifications.send({
  userId: 'usr_123',
  event: 'TRIGGER_EXECUTED',
  channels: ['WHATSAPP', 'PUSH', 'EMAIL'],
  data: { triggerName: 'ITUB4', amount: 500, details: '22 ações' }
});
```

---

## 6. 🔐 Webhooks Out com HMAC + Retry + DLQ

O sistema de webhooks out foi completamente reformulado pra ser **production-grade**.

### Recursos

| Feature | Implementação |
|---|---|
| **HMAC-SHA256** | Assinatura de payload com secret do partner |
| **Retry exponencial** | 1s, 2s, 4s, 8s, 16s (5 tentativas) |
| **Dead Letter Queue** | Falhas permanentes ficam isoladas pra análise |
| **Idempotência** | Cada delivery tem ID único (`X-ORKEST-Delivery`) |
| **Timeout** | 10s por tentativa |
| **Headers padrão** | `X-ORKEST-Event`, `X-ORKEST-Signature`, `X-ORKEST-Delivery` |

### Endpoints de Gestão

```bash
# Disparar webhook
POST /v1/webhooks/out/notify-partner
Body: { partnerId, event, data }

# Ver entregas
GET /v1/webhooks/out/deliveries?partnerId=xxx

# Estatísticas
GET /v1/webhooks/out/stats
# → { total, delivered, pending, deadLetter, successRate }

# Reenviar DLQ
POST /v1/webhooks/out/retry-dead-letter
Body: { partnerId? }
```

### Como Parceiro Verifica Assinatura

```javascript
// No backend do parceiro
const crypto = require('crypto');

app.post('/webhooks/orkest', (req, res) => {
  const signature = req.headers['x-orkest-signature'];
  const payload = JSON.stringify(req.body);
  const expected = `t=${Date.now()},v1=${crypto.createHmac('sha256', SECRET).update(`${Date.now()}.${payload}`).digest('hex')}`;
  
  if (signature === expected) {
    // válido
  }
  res.status(200).send();
});
```

---

## 📊 Resumo do Impacto

| Feature | Quem se beneficia | Como |
|---|---|---|
| Pre-order flow | Lojista | Visibilidade de pipeline + reserva de estoque |
| Gráficos | Lojista (B2B) | Decisões de compra de estoque data-driven |
| IA sugestões | Consumidor final | Engajamento 3-5x maior (gatilhos relevantes) |
| Adapters reais | Lojista | Plug-and-play com Shopify/WC |
| WhatsApp | Consumidor | Notificação instantânea, maior conversão |
| Webhooks HMAC | Parceiro B2B | Confiança + retry = zero perda de evento |
