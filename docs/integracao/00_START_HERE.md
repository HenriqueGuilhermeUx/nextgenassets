# 🚀 NextGen Assets - Guia de Integração Completo

> **Para:** Devs integrando NextGen Assets em outras aplicações
> **Versão:** v0.1
> **Última atualização:** 2026-06-22

---

## 🎯 O que é o NextGen Assets?

**NextGen Assets** é uma **plataforma de split de pagamentos PIX + Open Finance** com **AI integrada**.

Permite que **marketplaces, ERPs, e-commerces e apps** recebam pagamentos PIX com **split automático** (3% NextGen + 97% Vendedor) e **integração Open Finance** pra pagamentos recorrentes e início de pagamento direto da conta do cliente.

### 💡 Casos de uso:

```
1. Marketplace de produtos/serviços
   → Cliente paga R$ 100 → R$ 3 vai pra NextGen, R$ 97 pro vendedor
   
2. Subscription recorrente (Pix Automático)
   → Cliente autoriza uma vez → Cobrança mensal automática
   
3. Split multi-vendor (Marketplace)
   → R$ 100 = R$ 60 vendor A + R$ 35 vendor B + R$ 5 fee
   
4. Gatilho de compra (Open Finance)
   → Lê saldo do cliente OF → Inicia PIX via split
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│           APLICAÇÃO DO DEV (seu app)            │
│  (Node, Python, PHP, Java, qualquer linguagem)  │
└────────────────────┬────────────────────────────┘
                     │ HTTP REST
                     ▼
┌─────────────────────────────────────────────────┐
│  NextGen API (NestJS)                           │
│  https://api.nextgenassets.com.br               │
│  - Autenticação (X-API-Key)                     │
│  - Billing & Planos                             │
│  - Triggers & Gatilhos                          │
│  - Webhooks                                     │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────┐
        ▼            ▼            ▼              ▼
   ┌────────┐  ┌─────────┐  ┌────────┐   ┌──────────┐
   │ Woovi  │  │  Pluggy │  │  Klavi │   │  Efi OF  │
   │(PIX +  │  │(Open    │  │(Open   │   │(Open     │
   │ Split) │  │Finance) │  │Finance)│   │Finance+  │
   │        │  │         │  │        │   │PISP)     │
   └────────┘  └─────────┘  └────────┘   └──────────┘
```

### Stack:

- **Backend:** NestJS 10 (Node.js 20)
- **Database:** PostgreSQL (via Prisma)
- **Auth:** API Key (`X-API-Key`) + opcional JWT
- **Providers:**
  - **Woovi** (PIX + Split + Subcontas + Pix Automático)
  - **Pluggy** (Open Finance sandbox - read-only)
  - **Klavi** (Open Finance sandbox - read-only, mais barato)
  - **Efi** (Open Finance PISP - read + write, quando ativo)
- **Hosting:** Render (API) + Netlify (marketing) + Vercel (consumer)

---

## ⚡ Quick Start (5 minutos)

### 1. Pegar API Key

```bash
# 1. Login em https://nextgenassets.com.br/login
# 2. Settings → API Keys
# 3. Generate New Key
# 4. Copiar (começa com "nka_...")
```

### 2. Testar com cURL

```bash
curl -X POST https://api.nextgenassets.com.br/v1/billing/me \
  -H "X-API-Key: nka_sua_chave_aqui"
```

Resposta:
```json
{
  "success": true,
  "userId": "cmqa2r5w70001hmvqqvgywyxd",
  "plan": "PREMIUM",
  "triggersLimit": 100,
  "triggersUsed": 0
}
```

### 3. Criar primeira cobrança com split

```bash
curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-test \
  -H "X-API-Key: nka_sua_chave_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "totalCents": 10000,
    "nextgenCents": 300,
    "partnerCents": 9700,
    "nextgenPixKey": "61922930000197",
    "partnerPixKey": "34198276870",
    "correlationID": "test-001",
    "comment": "Venda marketplace"
  }'
```

Resposta:
```json
{
  "success": true,
  "charge": {
    "identifier": "woovi-abc123",
    "brCode": "00020126...",
    "paymentLinkUrl": "https://woovi.com/pay/abc123",
    "qrCodeImage": "data:image/png;base64,...",
    "value": 10000,
    "status": "ACTIVE"
  }
}
```

**Pronto! Você já tem uma cobrança PIX com split! 🎉**

---

## 📦 Instalação do SDK

### Node.js / Browser

```bash
npm install @nextgen/sdk
```

```javascript
import { NextGen } from '@nextgen/sdk';

const ng = new NextGen({
  apiKey: 'nka_sua_chave',
  baseUrl: 'https://api.nextgenassets.com.br' // opcional
});

// Criar cobrança com split
const charge = await ng.woovi.createCharge({
  value: 10000, // R$ 100,00 em centavos
  correlationID: 'order-001',
  splits: [
    { pixKey: '61922930000197', value: 300 }, // 3% NextGen
    { pixKey: '34198276870', value: 9700 }     // 97% Vendedor
  ]
});

console.log(charge.paymentLinkUrl);
// https://woovi.com/pay/woovi-abc123
```

### Python (sem SDK, direto via requests)

```python
import requests

API_URL = 'https://api.nextgenassets.com.br'
API_KEY = 'nka_sua_chave'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Criar cobrança
response = requests.post(
    f'{API_URL}/v1/admin/webhooks/woovi-test',
    headers=headers,
    json={
        'totalCents': 10000,
        'nextgenCents': 300,
        'partnerCents': 9700,
        'nextgenPixKey': '61922930000197',
        'partnerPixKey': '34198276870',
        'correlationID': 'order-001'
    }
)

print(response.json())
```

### PHP

```php
<?php
$apiUrl = 'https://api.nextgenassets.com.br';
$apiKey = 'nka_sua_chave';

$ch = curl_init("$apiUrl/v1/admin/webhooks/woovi-test");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'totalCents' => 10000,
    'nextgenCents' => 300,
    'partnerCents' => 9700,
    'nextgenPixKey' => '61922930000197',
    'partnerPixKey' => '34198276870',
    'correlationID' => 'order-001'
]));

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
```

---

## 📚 Documentação Adicional

| Documento | Conteúdo |
|---|---|
| [01_ARQUITETURA.md](01_ARQUITETURA.md) | Stack, banco, providers, deploy |
| [02_SETUP_LOCAL.md](02_SETUP_LOCAL.md) | Como rodar o NextGen localmente |
| [03_API_REFERENCIA.md](03_API_REFERENCIA.md) | Todos os endpoints documentados |
| [04_FLUXOS.md](04_FLUXOS.md) | Fluxos B2B, B2C, B2B2C |
| [05_WEBHOOKS.md](05_WEBHOOKS.md) | Webhooks de pagamento, Open Finance |
| [06_SPLIT_PIX.md](06_SPLIT_PIX.md) | Como funciona o split, fórmulas, edge cases |
| [07_OPEN_FINANCE.md](07_OPEN_FINANCE.md) | Open Finance read + write (PISP) |
| [08_SUBSCRIPTION.md](08_SUBSCRIPTION.md) | Pix Automático (recorrência) |
| [09_TROUBLESHOOTING.md](09_TROUBLESHOOTING.md) | Erros comuns e soluções |
| [10_PRICING.md](10_PRICING.md) | Modelo de negócio, fees, splits |

---

## 💰 Modelo de Negócio

### Split de Pagamento

Quando seu marketplace vende R$ 100,00:

```
R$ 100,00 = R$ 3,00 (3% NextGen) + R$ 96,50 (97% Vendedor) + R$ 0,50 (Woovi fee)
```

**Fórmula:**
```javascript
nextgenCents = Math.floor(value * 0.03);
wooviFeeCents = Math.max(Math.ceil(value * 0.005), 1);
partnerCents = value - nextgenCents - wooviFeeCents;
```

### Planos (B2C / SaaS)

| Plano | Preço | Triggers | Features |
|---|---|---|---|
| **FREE** | R$ 0 | 5/mês | Split básico |
| **PREMIUM** | R$ 29,90/mês | 100/mês | Open Finance + AI |
| **ENTERPRISE** | Custom | Ilimitado | Customizado |

---

## 🆘 Suporte

- **Email:** dev@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328
- **Docs:** https://nextgenassets.com.br/docs
- **API Reference:** https://nextgenassets.com.br/api-docs
- **Status:** https://status.nextgenassets.com.br (em breve)
- **GitHub:** https://github.com/HenriqueGuilhermeUx/nextgenassets

---

**Feito por Henrique C. para devs integrarem em 5 minutos.** 🚀
