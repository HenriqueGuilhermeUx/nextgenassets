# 🔁 Subscription Recorrente (Pix Automático)

> **Para:** Devs implementando cobranças recorrentes via Pix Automático

---

## O que é Pix Automático?

**Pix Automático** = funcionalidade do Banco Central que permite **cobranças PIX recorrentes autorizadas previamente pelo cliente**.

**Vantagens vs Boleto/Cartão:**
- ✅ Sem taxa de cartão (~3%)
- ✅ Sem taxa de boleto (~R$ 3)
- ✅ Sem custo de chargeback
- ✅ Aprovação instantânea
- ✅ Cliente autoriza 1x, vale 90 dias
- ✅ Cancelável a qualquer momento

**NextGen usa Woovi como gateway.**

---

## 🔄 Fluxo Completo

```
1. App cria subscription (Woovi POST /api/v1/subscriptions)
   ↓
2. Woovi retorna subscription ACTIVE
   ↓
3. App mostra link/QR pro cliente
   ↓
4. Cliente autoriza no app do banco (consentimento Pix Automático)
   ↓
5. Webhook: subscription ACTIVE
   ↓
6. Todo dia 5 do mês, Woovi gera cobrança
   ↓
7. Woovi cobra automaticamente (sem ação do cliente)
   ↓
8. Webhook: CHARGE_COMPLETED
   ↓
9. Split: 3% NextGen + 97% Vendedor
   ↓
10. Cron auto-withdraw (1h depois)
```

---

## 🛠️ Implementação

### 1. Criar subscription

```bash
curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscriber-create \
  -H "X-API-Key: nka_..." \
  -H "Content-Type: application/json" \
  -d '{
    "taxID": "34198276870",
    "value": 1990,
    "dayGenerateCharge": 5
  }'
```

**Body params:**

| Campo | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `taxID` | string | CPF ou CNPJ do cliente | `"34198276870"` |
| `value` | int | Valor em centavos | `1990` (R$ 19,90) |
| `dayGenerateCharge` | int | Dia do mês (1-28) | `5` |

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-abc123",
    "taxID": "34198276870",
    "value": 1990,
    "dayGenerateCharge": 5,
    "type": "RECURRENT",
    "chargeType": "OVERDUE",
    "status": "ACTIVE",
    "createdAt": "2026-06-22T18:00:00Z"
  }
}
```

**Tipos:**
- `RECURRENT` - recorrente (default)
- `INSTALLMENT` - parcelado (N vezes)

**chargeType:**
- `OVERDUE` - gera cobrança no dia, se não pagar vira atrasada
- `AUTO` - tenta cobrar automaticamente

---

### 2. Listar subscriptions

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscription-list \
  -H "X-API-Key: nka_..."
```

**Response:**
```json
{
  "count": 1,
  "subscriptions": [
    {
      "id": "sub-abc123",
      "taxID": "34198276870",
      "value": 1990,
      "dayGenerateCharge": 5,
      "status": "ACTIVE"
    }
  ]
}
```

---

### 3. Cancelar subscription

```bash
curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscriber-cancel \
  -H "X-API-Key: nka_..." \
  -H "Content-Type: application/json" \
  -d '{ "taxID": "34198276870" }'
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-abc123",
    "status": "CANCELED"
  }
}
```

---

## 📊 Split em Subscription

**Subscription recorrente também tem split!**

```
Cliente paga R$ 19,90 mensal:
  ├─ R$ 0,60 (3%)   → NextGen
  ├─ R$ 19,20 (96.5%) → Vendedor
  └─ R$ 0,10 (0.5%) → Woovi
```

**Configurar split (opcional):**

```javascript
const subscription = await ng.woovi.createSubscriber({
  taxID: '34198276870',
  value: 1990,
  dayGenerateCharge: 5,
  splits: [
    { pixKey: '61922930000197', value: 60 },   // 3% NextGen
    { pixKey: '34198276870', value: 1920 }      // 96.5% Vendor
  ]
});
```

**Nota:** Woovi cobra a subscription 1x no full value. Split é aplicado internamente.

---

## 🔔 Webhook de Subscription

**Evento:** `OPENPIX:SUBSCRIPTION_PAYMENT` (Woovi)

**Payload:**
```json
{
  "event": "OPENPIX:SUBSCRIPTION_PAYMENT",
  "subscription": {
    "id": "sub-abc123",
    "taxID": "34198276870",
    "value": 1990
  },
  "charge": {
    "identifier": "woovi-xyz",
    "value": 1990,
    "status": "COMPLETED",
    "paidAt": "2026-07-05T00:00:00Z"
  }
}
```

**API NextGen processa:**
1. Marca subscription.payment como paid
2. Split automático
3. AuditLog

---

## 📈 Casos de Uso

### SaaS Mensal

```javascript
// R$ 49,90/mês todo dia 1
createSubscription({
  taxID: customer.cpf,
  value: 4990,
  dayGenerateCharge: 1
});
```

### Curso Online (parcelado)

```javascript
// R$ 297 em 12x (R$ 24,75/mês)
createSubscription({
  taxID: customer.cpf,
  value: 2475,
  type: 'INSTALLMENT',
  totalInstallments: 12,
  dayGenerateCharge: 15
});
```

### Assinatura anual (1x/ano)

```javascript
// R$ 1.200/ano (todo dia 1 de janeiro)
// Usa custom logic com 1 charge
```

### Doação mensal

```javascript
// R$ 10/mês
createSubscription({
  taxID: donor.cpf,
  value: 1000,
  dayGenerateCharge: 20
});
```

---

## ⚠️ Limitações

| Limit | Valor | Workaround |
|---|---|---|
| Valor mínimo | R$ 1,00 | Cobranças < R$ 1 use Boleto |
| Valor máximo | R$ 50.000/mês | Para mais, usar split multi-vendor |
| Dia do mês | 1-28 | Último dia do mês: usar 28 |
| Tipos de chave | CPF, CNPJ, email, celular | Não aceita chave aleatória |

---

## 🛡️ Compliance

**LGPD:** cliente pode cancelar a qualquer momento.

**BACEN:** Pix Automático é regulado. Cliente sempre pode revogar autorização no app do banco.

**Pró-rata:** Se cliente cancelar no meio do mês, valor NÃO é devolvido (a menos que implementado).

---

## 🆘 Troubleshooting

### Subscription não está cobrando

```bash
# Verificar status
curl https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscription-list

# Status esperado: ACTIVE
# Se INACTIVE: cliente cancelou ou charge falhou
```

### Cliente não consegue autorizar

1. **App do banco não suporta** (raro, mas alguns bancos pequenos)
2. **Valor muito alto** (limite diário do banco)
3. **Conta é conjunta** (alguns bancos não permitem)

### Cobrança falhou (CHARGE_FAILED)

**Motivos comuns:**
- Saldo insuficiente
- Banco offline
- Limite PIX diário atingido
- Cliente cancelou autorização

**Workaround:** Retry automático 3x (próximos 3 dias).

---

## 📊 Dashboard

**Ver subscriptions no painel NextGen:**

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/woovi-subscription-list
```

**Stats:**
- Total de subscriptions ativas
- MRR (Monthly Recurring Revenue)
- Churn rate
- LTV médio

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br
- **Woovi docs:** https://docs.woovi.com

---

**Próximo:** [09_TROUBLESHOOTING.md](09_TROUBLESHOOTING.md) - Erros comuns
