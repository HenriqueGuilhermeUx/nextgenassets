# 🔄 Fluxos Completos de Uso

> **Para:** Devs integrando NextGen Assets em diferentes tipos de aplicação

---

## 📊 Visão Geral dos Fluxos

| Fluxo | Caso de uso | Complexidade |
|---|---|---|
| **Fluxo 1: Split Simples** | Marketplace recebe pagamento com split | ⭐ |
| **Fluxo 2: Split Multi-vendor** | Marketplace com N vendedores | ⭐⭐ |
| **Fluxo 3: Subscription Recorrente** | SaaS com Pix Automático | ⭐⭐ |
| **Fluxo 4: Gatilho de Compra** | Lê saldo OF, paga via split | ⭐⭐⭐ |
| **Fluxo 5: AI Orchestrator** | User descreve em linguagem natural | ⭐⭐⭐ |
| **Fluxo 6: Auto-withdraw** | Cron saca saldo automaticamente | ⭐ |

---

## Fluxo 1: Split Simples (Marketplace)

**Cenário:** Cliente compra produto de R$ 100. Vendedor recebe R$ 97. NextGen fica com R$ 3.

### Passo a passo

```javascript
// 1. Cliente clica "Pagar" no seu app
const order = {
  productId: 'prod-001',
  productName: 'Tênis Nike',
  totalCents: 10000, // R$ 100
  sellerId: 'seller-001',
  sellerPixKey: 'henriquecampos66@gmail.com'
};

// 2. Seu backend chama NextGen
const response = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-test', {
  method: 'POST',
  headers: {
    'X-API-Key': 'nka_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    totalCents: 10000,
    nextgenCents: 300,        // 3% NextGen
    partnerCents: 9700,        // 97% Vendedor
    nextgenPixKey: '61922930000197',  // CNPJ NextGen
    partnerPixKey: order.sellerPixKey,
    correlationID: `order-${order.productId}`,
    comment: `Compra: ${order.productName}`,
    customer: {
      name: 'João Silva',
      taxID: '12345678900'
    }
  })
});

const { charge } = await response.json();

// 3. Mostre o QR Code pro cliente
console.log(charge.brCode);
console.log(charge.paymentLinkUrl);
console.log(charge.qrCodeImage);

// 4. Cliente paga via PIX
// 5. Woovi manda webhook → NextGen
// 6. Split automático (Woovi credita subcontas)
// 7. Cron (1h) auto-withdraw → PIX na conta do vendedor
```

### Webhook do Woovi → Seu app (opcional)

```javascript
// POST /seu-webhook (cadastrado no Woovi)
app.post('/seu-webhook', (req, res) => {
  const { event, charge } = req.body;
  
  if (event === 'OPENPIX:CHARGE_COMPLETED') {
    // Charge paga!
    // Atualize seu DB: order.status = 'paid'
    // Mande email pro vendedor
    // Libere o produto
  }
  
  res.status(200).send('ok');
});
```

---

## Fluxo 2: Split Multi-vendor

**Cenário:** Marketplace com 3 vendedores no mesmo carrinho.

```javascript
// R$ 300 total = R$ 120 vendor A + R$ 100 vendor B + R$ 80 vendor C

const splits = [
  { pixKey: 'vendorA@email.com', value: 12000 },
  { pixKey: 'vendorB@email.com', value: 10000 },
  { pixKey: 'vendorC@email.com', value: 8000 }
];

const nextgenCents = Math.floor(30000 * 0.03); // 900
const totalSplits = splits.reduce((s, x) => s + x.value, 0);

if (nextgenCents + totalSplits >= 30000) {
  throw new Error('Splits devem somar menos que total (Woovi retém 5%)');
}

const response = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-test', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    totalCents: 30000,
    nextgenCents: 900,
    partnerCents: 0,  // não usado aqui
    nextgenPixKey: '61922930000197',
    splits: splits.map(s => ({ ...s, splitType: 'SPLIT_SUB_ACCOUNT' })),
    correlationID: 'cart-001',
    comment: 'Carrinho com 3 produtos'
  })
});
```

---

## Fluxo 3: Subscription Recorrente (Pix Automático)

**Cenário:** SaaS cobra R$ 19,90/mês automaticamente.

### 1. Cliente assina

```javascript
// Cliente autoriza Pix Automático no app do banco dele
const sub = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscriber-create', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taxID: '34198276870',  // CPF
    value: 1990,           // R$ 19,90
    dayGenerateCharge: 5   // todo dia 5
  })
});

const { subscription } = await sub.json();
// { id: 'sub-abc', status: 'ACTIVE', type: 'RECURRENT' }
```

### 2. Woovi cobra automaticamente todo dia 5

```
Dia 5 de cada mês:
  Woovi gera cobrança de R$ 19,90
  Tenta debitar do cliente (autorizado previamente)
  Se OK → webhook CHARGE_COMPLETED
```

### 3. Webhook processa

```javascript
// Webhook automático
// /v1/webhooks/woovi-public
{
  event: 'OPENPIX:CHARGE_COMPLETED',
  charge: {
    correlationID: 'subscription-34198276870-2026-07-05',
    value: 1990
  }
}

// API NextGen:
// 1. Marca subscription.payment como paid
// 2. Split: 3% NextGen + 97% Vendedor
// 3. AuditLog
```

### 4. Cliente cancela

```javascript
await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscriber-cancel', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({ taxID: '34198276870' })
});
```

---

## Fluxo 4: Gatilho de Compra (Open Finance + Split)

**Cenário:** App lê saldo OF do cliente e paga automaticamente quando atinge threshold.

### Passo a passo

```javascript
// 1. Cliente conecta banco (Klavi/Pluggy)
const link = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/klavi-simulate', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({ cpf: '34198276870' })
});

// 2. Cliente autoriza no app do banco
// 3. Webhook → consent ACTIVE

// 4. Criar gatilho
const trigger = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/gatilho-criar', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-001',
    code: 'gatilho-compra',
    config: {
      cpf: '34198276870',
      minBalance: 50000,  // R$ 500
      paymentValue: 10000, // paga R$ 100
      pixKey: 'henriquecampos66@gmail.com'
    }
  })
});

// 5. API periodicamente (cron 1h) verifica saldo via OF
//    Se saldo > R$ 500, inicia pagamento via Woovi split

// 6. Webhook → update trigger
//    "Pagamento iniciado: R$ 100 → split 3% + 97%"
```

### Testar manualmente

```bash
curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/gatilho-flow-completo \
  -H "X-API-Key: nka_..." \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "34198276870",
    "value": 10000,
    "pixKey": "henriquecampos66@gmail.com"
  }'
```

---

## Fluxo 5: AI Orchestrator (Linguagem Natural)

**Cenário:** User descreve o que quer, AI monta o gatilho.

```javascript
const userInput = "Quero que toda vez que meu cliente João receber mais de R$ 1000 no banco, eu seja notificado e receba 5% automático via split";

// AI processa e retorna:
{
  "success": true,
  "trigger": {
    "code": "saldo-monitor",
    "config": {
      "userId": "joao-cpf",
      "minBalance": 100000,  // R$ 1000
      "notificationType": "all",
      "autoCharge": {
        "percentage": 5,
        "destinationPixKey": "seu-pix"
      }
    }
  },
  "aiReasoning": "Detectei: 1) Monitor de saldo bancário via Open Finance, 2) Threshold R$ 1000, 3) Ação: split automático de 5%..."
}
```

---

## Fluxo 6: Auto-withdraw (Cron)

**Automático**, sem código do dev.

```
A cada 1 hora (configurável):
  Para cada subconta com saldo > R$ 1,00:
    Saque via Woovi /api/v1/subaccount/{pixKey}/withdraw
    PIX OUT pra conta do vendedor
    AuditLog
```

**Configurar:**
```env
AUTO_WITHDRAW_MIN_CENTS=100  # R$ 1,00
AUTO_WITHDRAW_CRON=0 * * * *  # a cada hora
```

---

## 🔀 Combinando Fluxos

### Marketplace + Subscription + Auto-withdraw

```
1. Cliente compra produto (Fluxo 1: R$ 100, split)
2. Após 30 dias, oferece subscription (Fluxo 3: R$ 19,90/mês)
3. Cliente aceita → Pix Automático
4. Woovi cobra todo mês
5. Split automático (R$ 0,60 NextGen + R$ 19,30 Vendedor)
6. Cron (1h) auto-withdraw → PIX na conta do vendedor
```

### Marketplace + Gatilho de Compra + AI

```
1. Vendedor configura gatilho em linguagem natural (Fluxo 5)
2. AI cria trigger automaticamente
3. Cliente conecta banco (Open Finance)
4. Trigger monitora saldo (a cada hora)
5. Quando saldo > threshold, inicia pagamento via split
6. Vendedor recebe comissão automática
```

---

## 📊 Diagrama de Decisão

```
Seu user quer receber pagamentos?
│
├── SIM, one-time
│   └── Use Fluxo 1: Split Simples
│
├── SIM, recorrente
│   └── Use Fluxo 3: Subscription (Pix Automático)
│
├── SIM, multi-vendor
│   └── Use Fluxo 2: Split Multi-vendor
│
└── SIM, automático via saldo bancário
    └── Use Fluxo 4: Gatilho de Compra
```

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328

---

**Próximo:** [05_WEBHOOKS.md](05_WEBHOOKS.md) - Webhooks
