# 🤖 Integração NextGen Assets + smart-bot-staff

> **Para:** Dev integrando o bot WhatsApp (smart-bot-staff) com NextGen Assets

---

## 🎯 O que é essa integração?

O **smart-bot-staff** é um bot de atendimento WhatsApp feito em React + Supabase + Twilio + OpenAI.

O **NextGen Assets** é a plataforma de split de pagamento PIX + Open Finance.

Juntos, o bot pode:
- 💰 **Cobrar clientes via PIX** com split automático
- 🔁 **Criar subscriptions recorrentes** (Pix Automático)
- 🏦 **Conectar banco do cliente** (Open Finance)
- 💸 **Ver saldo bancário** antes de cobrar
- 📊 **Histórico de cobranças**

---

## 🏗️ Arquitetura da Integração

```
┌──────────────────────────────────────┐
│  smart-bot-staff                     │
│  (React + Supabase)                  │
│                                      │
│  Usuário: "Cobra R$ 100 do cliente"  │
└─────────────┬────────────────────────┘
              │ HTTP POST
              ▼
┌──────────────────────────────────────┐
│  NextGen Assets API                  │
│  POST /v1/integration/process        │
│                                      │
│  - Valida appId + appSecret          │
│  - Loga no AuditLog                  │
│  - Chama Woovi (PIX + Split)         │
│  - Retorna QR Code + Link            │
└─────────────┬────────────────────────┘
              │ Woovi API
              ▼
┌──────────────────────────────────────┐
│  Woovi                               │
│  - Cria cobrança                     │
│  - Split 3% + 97%                    │
│  - Notifica webhook                  │
└──────────────────────────────────────┘
              │ Webhook
              ▼
┌──────────────────────────────────────┐
│  Bot responde no WhatsApp:           │
│  "Aqui está o PIX: [link]"           │
└──────────────────────────────────────┘
```

---

## ⚙️ Setup (5 minutos)

### 1. Registrar seu smart-bot-staff na NextGen

**No NextGen** (admin):
```bash
POST https://api.nextgenassets.com.br/v1/admin/webhooks/register-app
{
  "appId": "smart-bot-staff",
  "appName": "Smart Bot Staff",
  "appSecret": "GERE_UM_SECRET_FORTE_AQUI",
  "webhookUrl": "https://smart-bot-staff.netlify.app/.netlify/functions/webhook",
  "allowedActions": ["create_charge", "create_subscription", "get_balance"]
}
```

**Anote o `appSecret`** - você vai precisar!

### 2. Configurar env vars no smart-bot-staff

**Netlify → Environment Variables** do smart-bot-staff:

```env
NEXTGEN_API_URL=https://api.nextgenassets.com.br
NEXTGEN_APP_ID=smart-bot-staff
NEXTGEN_APP_SECRET=GERE_UM_SECRET_FORTE_AQUI
NEXTGEN_DEFAULT_PIX_KEY=seu-pix@email.com
```

### 3. Instalar dependência no smart-bot-staff

```bash
cd smart-bot-staff
npm install @nextgen/sdk
```

OU copie o SDK direto:
```bash
cp /caminho/nextgen-sdk.ts src/lib/nextgen-sdk.ts
```

---

## 💻 Código de Integração (Netlify Functions)

### Estrutura

```
smart-bot-staff/
├── netlify/functions/
│   ├── webhook-twilio.ts        # Recebe msg WhatsApp
│   ├── nextgen-charge.ts        # Cobra via NextGen
│   ├── nextgen-subscription.ts  # Cria subscription
│   └── nextgen-balance.ts       # Lê saldo OF
```

### 1. `webhook-twilio.ts` (entrada principal)

```typescript
import { Handler } from '@netlify/functions';
import twilio from 'twilio';
import { NextGen } from '@nextgen/sdk';

const ng = new NextGen({
  apiKey: process.env.NEXTGEN_APP_SECRET,
  baseUrl: process.env.NEXTGEN_API_URL
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const handler: Handler = async (event) => {
  const params = new URLSearchParams(event.body || '');
  const from = params.get('From') || '';
  const body = params.get('Body') || '';
  const phone = from.replace('whatsapp:', '');

  console.log(`📩 Msg de ${phone}: ${body}`);

  // Detecta intenção
  if (/^cobrar\s+r\$?\s*(\d+(?:[.,]\d{2})?)/i.test(body)) {
    const value = parseFloat(body.match(/(\d+(?:[.,]\d{2})?)/)[1].replace(',', '.'));
    const cents = Math.round(value * 100);

    try {
      const result = await ng.process({
        appId: 'smart-bot-staff',
        appSecret: process.env.NEXTGEN_APP_SECRET,
        action: 'create_charge',
        userId: phone,
        payload: {
          value: cents,
          customer: {
            name: 'Cliente WhatsApp',
            phone: phone
          },
          sellerPixKey: process.env.NEXTGEN_DEFAULT_PIX_KEY,
          comment: `Cobrança via WhatsApp`
        }
      });

      const charge = result.charge;
      const msg = `💰 *Cobrança gerada!*\n\n` +
                  `Valor: R$ ${(charge.value / 100).toFixed(2)}\n` +
                  `Link: ${charge.paymentLinkUrl}\n` +
                  `QR Code: ${charge.qrCodeImage}\n\n` +
                  `Pague via PIX e envie o comprovante!`;

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: msg
      });
    } catch (err: any) {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: from,
        body: `❌ Erro: ${err.message}`
      });
    }
  }

  if (/saldo/i.test(body)) {
    // Ver saldo do cliente
    const result = await ng.process({
      appId: 'smart-bot-staff',
      appSecret: process.env.NEXTGEN_APP_SECRET,
      action: 'get_balance',
      userId: phone,
      payload: { cpf: '34198276870' } // pegar do DB
    });

    const msg = `💳 *Suas contas:*\n\n` +
                result.accounts.map((a: any) =>
                  `• ${a.bank}: R$ ${(a.balance / 100).toFixed(2)}`
                ).join('\n');

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: msg
    });
  }

  return { statusCode: 200, body: 'ok' };
};
```

### 2. Webhook do NextGen → smart-bot-staff

Quando o cliente paga a cobrança, o NextGen manda webhook:

```typescript
// netlify/functions/webhook-nextgen.ts
import { Handler } from '@netlify/functions';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const handler: Handler = async (event) => {
  const { event: type, data } = JSON.parse(event.body || '{}');

  if (type === 'charge.completed') {
    // Cliente pagou!
    const phone = data.customerPhone;
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phone}`,
      body: `✅ Pagamento confirmado!\n\nValor: R$ ${(data.value / 100).toFixed(2)}\nObrigado!`
    });
  }

  return { statusCode: 200, body: 'ok' };
};
```

---

## 🤖 Comandos do Bot

| Comando | Ação |
|---|---|
| `cobrar R$ 100` | Cria cobrança PIX R$ 100 |
| `cobrar R$ 50 para João` | Cria cobrança com nome custom |
| `saldo` | Mostra saldo das contas conectadas |
| `conectar banco` | Envia link Open Finance |
| `assinar R$ 19,90` | Cria subscription mensal |
| `cancelar assinatura` | Cancela subscription |
| `histórico` | Lista últimas cobranças |

---

## 📋 Endpoints de Integração

### `POST /v1/integration/process`

Endpoint único de integração.

**Body:**
```json
{
  "appId": "smart-bot-staff",
  "appSecret": "seu-secret",
  "action": "create_charge",
  "userId": "user-001",
  "payload": {
    "value": 10000,
    "customer": { "name": "João", "taxID": "12345678900" },
    "sellerPixKey": "seu@email.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "charge": {
    "identifier": "woovi-abc",
    "brCode": "00020126...",
    "paymentLinkUrl": "https://woovi.com/pay/abc",
    "qrCodeImage": "data:image/png;base64,...",
    "value": 10000,
    "status": "ACTIVE"
  }
}
```

### Ações disponíveis

| Action | Payload | Retorna |
|---|---|---|
| `create_charge` | `{value, customer, sellerPixKey, comment}` | `{charge}` |
| `create_subscription` | `{taxID, value, dayGenerateCharge}` | `{subscription}` |
| `get_balance` | `{cpf}` | `{accounts}` |
| `connect_bank` | `{cpf, redirectUrl}` | `{linkUrl}` |
| `list_charges` | `{partnerId, limit}` | `{charges}` |
| `cancel_subscription` | `{taxID}` | `{subscription}` |
| `get_user_info` | `{userId, cpf}` | `{user}` |
| `check_limit` | `{userId, action}` | `{allowed, used, limit}` |

---

## 🧪 Testar Local

```bash
curl -X POST http://localhost:8888/.netlify/functions/ping

# Ou produção
curl -X POST https://smart-bot-staff.netlify.app/.netlify/functions/ping
```

---

## 🔐 Segurança

**1. appSecret no env (NUNCA no código)**
```typescript
// ❌ Errado
const appSecret = 'abc123';

// ✅ Certo
const appSecret = process.env.NEXTGEN_APP_SECRET;
```

**2. Validar webhook com HMAC**
```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex') === signature;
}
```

**3. Rate limiting**
- 100 req/min por appId
- Implementar retry com backoff

---

## 📊 Casos de Uso

### Marketplace
```
Cliente: "Quero vender meu produto"
Bot: "Qual o valor?"
Cliente: "R$ 250"
Bot: [cria cobrança split 3% + 97%]
Bot: "Link de pagamento enviado!"
```

### Subscription (SaaS)
```
Cliente: "Quero assinar o plano PRO"
Bot: "OK, R$ 49,90/mês. Confirma?"
Cliente: "Sim"
Bot: [cria subscription recorrente]
Bot: "Assinatura criada! Cobrança todo dia 1"
```

### Gatilho de Saldo
```
Cliente: "Avise quando meu saldo passar de R$ 5.000"
Bot: [cria gatilho Open Finance]
Bot: "OK! Vou te avisar"
[Diariamente, bot checa saldo]
[Saldo > R$ 5.000]
Bot: "Seu saldo passou de R$ 5.000! R$ 6.234,56"
```

---

## 🆘 Troubleshooting

### Erro: "App não autorizado"

```json
{
  "success": false,
  "error": "App smart-bot-staff não autorizado ou secret inválido"
}
```

**Causa:** `appSecret` errado.

**Solução:** Verificar env var `NEXTGEN_APP_SECRET` no Netlify.

---

### Erro: "Valor mínimo R$ 1,00"

```json
{
  "success": false,
  "error": "value mínimo R$ 1,00 (100 centavos)"
}
```

**Causa:** Valor em centavos < 100.

**Solução:** Converter corretamente:
```typescript
const reais = 50; // R$ 50
const cents = reais * 100; // 5000 centavos
```

---

### Bot não responde

**Checklist:**
- [ ] Webhook Twilio configurado?
- [ ] Env vars OK?
- [ ] Logs no Netlify?
- [ ] Function deployed?

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328
- **GitHub Issues:** https://github.com/HenriqueGuilhermeUx/smart-bot-staff/issues

---

**Próximo:** [Voltar ao índice](../README.md)
