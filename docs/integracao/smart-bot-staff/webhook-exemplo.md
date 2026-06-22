# 🪝 Webhook do NextGen → smart-bot-staff

Quando uma cobrança é paga, o NextGen manda webhook pro smart-bot-staff notificar o cliente no WhatsApp.

## Setup

### 1. Cadastrar URL do webhook no NextGen

```bash
POST https://api.nextgenassets.com.br/v1/admin/webhooks/register-app
{
  "appId": "smart-bot-staff",
  "appName": "Smart Bot Staff",
  "appSecret": "SEU_SECRET",
  "webhookUrl": "https://smart-bot-staff.netlify.app/.netlify/functions/webhook-nextgen",
  "hmacSecret": "GERE_OUTRO_SECRET_PARA_HMAC"
}
```

### 2. Criar a function `webhook-nextgen.ts`

```typescript
// netlify/functions/webhook-nextgen.ts
import { Handler } from '@netlify/functions';
import twilio from 'twilio';
import crypto from 'crypto';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);
const hmacSecret = process.env.NEXTGEN_HMAC_SECRET;

function verifySignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', hmacSecret);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export const handler: Handler = async (event) => {
  const signature = event.headers['x-nextgen-signature'] || '';
  const payload = event.body || '';

  // Verificar HMAC
  if (!verifySignature(payload, signature)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const { event: type, data } = JSON.parse(payload);
  console.log(`📥 Webhook: ${type}`, data);

  // Responder rápido
  const response = { statusCode: 200, body: 'ok' };

  // Processar em background
  process.nextTick(async () => {
    try {
      if (type === 'charge.completed') {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:${data.customerPhone}`,
          body: `✅ *Pagamento confirmado!*\n\n` +
                `Valor: R$ ${(data.value / 100).toFixed(2)}\n` +
                `ID: ${data.chargeId}\n\n` +
                `Obrigado pela compra! 🎉`
        });
      }

      if (type === 'subscription.payment') {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:${data.customerPhone}`,
          body: `🔁 *Cobrança recorrente processada!*\n\n` +
                `Valor: R$ ${(data.value / 100).toFixed(2)}\n` +
                `Próxima: dia ${data.dayGenerateCharge}/${data.nextMonth}`
        });
      }

      if (type === 'withdraw.completed') {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:${data.sellerPhone}`,
          body: `💸 *Saque realizado!*\n\n` +
                `Valor: R$ ${(data.value / 100).toFixed(2)}\n` +
                `PIX enviado para ${data.pixKey}`
        });
      }
    } catch (err) {
      console.error('Erro ao processar webhook:', err);
    }
  });

  return response;
};
```

### 3. Adicionar env vars

```env
NEXTGEN_HMAC_SECRET=outro-secret-forte-aqui
```

## Eventos disponíveis

| Evento | Quando | Payload |
|---|---|---|
| `charge.completed` | Cliente pagou PIX | `{chargeId, value, customerPhone, splits}` |
| `charge.expired` | Cobrança expirou | `{chargeId, value}` |
| `subscription.created` | Nova subscription | `{subscriptionId, value, dayGenerateCharge}` |
| `subscription.payment` | Payment recorrente | `{subscriptionId, value, dayGenerateCharge}` |
| `subscription.cancelled` | Subscription cancelada | `{subscriptionId}` |
| `withdraw.completed` | Saque realizado | `{pixKey, value, endToEndId}` |
| `consent.authorized` | OF consent OK | `{consentId, cpf, provider}` |
| `payment.completed` | OF payment OK | `{paymentId, endToEndId, value}` |

## Testar webhook local

```bash
# Simular webhook manualmente
curl -X POST http://localhost:8888/.netlify/functions/webhook-nextgen \
  -H "Content-Type: application/json" \
  -H "x-nextgen-signature: sha256=..." \
  -d '{
    "event": "charge.completed",
    "data": {
      "chargeId": "woovi-abc",
      "value": 10000,
      "customerPhone": "+5511999999999"
    }
  }'
```

