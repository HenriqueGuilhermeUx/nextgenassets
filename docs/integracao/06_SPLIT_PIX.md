# 💰 Split de PIX - Como Funciona

> **Para:** Devs que querem entender e customizar o split de pagamento

---

## Conceito

**Split de pagamento** = dividir o valor de uma cobrança PIX entre múltiplas contas.

**Caso de uso:** Marketplace onde o valor pago pelo cliente é dividido automaticamente entre o vendedor e a plataforma (NextGen).

```
Cliente paga R$ 100,00
  ↓
Woovi recebe R$ 100,00
  ↓
Split automático:
  ├─ R$ 3,00  → NextGen (3% de comissão)
  ├─ R$ 96,50 → Vendedor (97% líquido)
  └─ R$ 0,50  → Woovi retém (5% de taxa)
```

---

## 📊 Fórmulas

### Split padrão (3% NextGen + 97% Vendedor - 0.5% Woovi)

```javascript
function calcularSplit(valueCents) {
  const nextgenCents = Math.floor(valueCents * 0.03);
  const wooviFeeCents = Math.max(Math.ceil(valueCents * 0.005), 1);
  const partnerCents = valueCents - nextgenCents - wooviFeeCents;
  
  return { nextgenCents, partnerCents, wooviFeeCents };
}

// Exemplo R$ 100,00 (10000 cents)
calcularSplit(10000);
// { nextgenCents: 300, partnerCents: 9699, wooviFeeCents: 50 }
// Total: 300 + 9699 + 50 = 10049 ❌ (NÃO BATE!)
```

⚠️ **Problema:** A soma dá 10049, mas o valor é 10000. **NÃO pode ser maior que o total!**

### Split correto (rounding down)

```javascript
function calcularSplit(valueCents) {
  const nextgenCents = Math.floor(valueCents * 0.03);  // sempre pra baixo
  const wooviFeeCents = Math.max(Math.ceil(valueCents * 0.005), 1);
  const partnerCents = valueCents - nextgenCents - wooviFeeCents;
  
  return { nextgenCents, partnerCents, wooviFeeCents };
}

// R$ 100,00
calcularSplit(10000);
// { nextgenCents: 300, partnerCents: 9650, wooviFeeCents: 50 }
// Total: 300 + 9650 + 50 = 10000 ✅
```

**Regra de ouro:** `nextgenCents + partnerCents + wooviFeeCents === valueCents`

---

## 🔢 Edge Cases

### Valores pequenos (< R$ 1,00)

```javascript
// R$ 0,30 (30 cents)
calcularSplit(30);
// { nextgenCents: 0, partnerCents: -21, wooviFeeCents: 1 }
// ❌ partner negativo!

// Solução: mínimo R$ 1,00
```

**Workaround:** API rejeita valores < R$ 1,00 (ou aplica fee mínimo de 1 centavo).

### Valores mínimos

```javascript
function calcularSplit(valueCents) {
  if (valueCents < 100) {
    return { error: 'Valor mínimo R$ 1,00' };
  }
  
  // ... resto da lógica
}
```

### Split 100% NextGen (sem vendedor)

```javascript
// Caso: doar tudo pra NextGen (ex: taxa de serviço)
const value = 10000;
const split = {
  nextgenCents: value - 1,  // 9999
  partnerCents: 0,
  wooviFeeCents: 1
};
```

---

## 🎯 Tipos de Split no Woovi

### 1. SPLIT_SUB_ACCOUNT (padrão)

```json
{
  "pixKey": "vendor@email.com",
  "value": 9700,
  "splitType": "SPLIT_SUB_ACCOUNT"
}
```

Vendedor recebe na **subconta Woovi** (precisa criar antes).

**Vantagem:** Saque automático via cron.

**Desvantagem:** Vendor precisa ter subconta Woovi.

### 2. SPLIT_PARTNER (parceiro Woovi)

```json
{
  "pixKey": "vendor@email.com",
  "value": 9700,
  "splitType": "SPLIT_PARTNER"
}
```

Vendedor recebe direto na **conta Woovi principal** (sem subconta).

**Vantagem:** Mais simples.

**Desvantagem:** Vendor precisa ter conta Woovi.

---

## 🏦 Subcontas Woovi

**Subconta** = conta virtual dentro do Woovi.

### Criar subconta

```bash
curl -X POST https://api.woovi.com/api/v1/subaccount \
  -H "Authorization: <app-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "pixKey": "henriquecampos66@gmail.com",
    "name": "João Silva"
  }'
```

**Response:**
```json
{
  "subaccount": {
    "pixKey": "henriquecampos66@gmail.com",
    "name": "João Silva"
  }
}
```

### Listar subcontas

```bash
curl https://api.woovi.com/api/v1/subaccount \
  -H "Authorization: <app-id>"
```

### Ver saldo

```bash
curl https://api.woovi.com/api/v1/subaccount/{pixKey} \
  -H "Authorization: <app-id>"
```

### Sacar (PIX OUT)

```bash
curl -X POST https://api.woovi.com/api/v1/subaccount/{pixKey}/withdraw \
  -H "Authorization: <app-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 1000
  }'
```

**IMPORTANTE:** Body é só `{ "value": X }`, **SEM** `pixKey` no body (ele tá na URL).

**Resposta:**
```json
{
  "transaction": {
    "value": 1000,
    "endToEndId": "E000000002026...",
    "status": "CREATED"
  }
}
```

---

## 🔄 Auto-withdraw (Cron)

A cada 1 hora, NextGen verifica saldos > R$ 1,00 e saca automaticamente.

**Config:**
```env
AUTO_WITHDRAW_MIN_CENTS=100  # R$ 1,00
AUTO_WITHDRAW_CRON=0 * * * *  # a cada hora
```

**Logs:**
```sql
SELECT * FROM "AuditLog" WHERE action = 'AUTO_WITHDRAW' ORDER BY "createdAt" DESC LIMIT 10;
```

**Exemplo de log:**
```json
{
  "action": "AUTO_WITHDRAW",
  "resource": "subaccount",
  "resourceId": "henriquecampos66@gmail.com",
  "metadata": {
    "balanceCents": 970,
    "withdrawnCents": 970,
    "endToEndId": "E000000002026..."
  }
}
```

---

## 📈 Split Customizado

Se o dev quiser **alterar a % de comissão NextGen** (default 3%):

### No Partner (B2B)

```typescript
// Partner define sua própria commissionRate
model Partner {
  commissionRate Decimal @default(0.03)  // 3% default
}
```

**Setar:**
```bash
curl -X PATCH https://api.nextgenassets.com.br/v1/admin/webhooks/partners/{partnerId} \
  -H "X-API-Key: nka_..." \
  -d '{ "commissionRate": 0.05 }'  # 5%
```

### Por Transação (override)

```javascript
const split = {
  nextgenCents: 500,    // override 5% pra essa venda
  partnerCents: 9500,   // 95% vendedor
  wooviFeeCents: 50     // 0.5% Woovi
};
```

---

## 🛡️ Validações

A API NextGen valida:

1. **Soma do split ≤ total** (Woovi retém diferença)
2. **Split mínimo R$ 1,00** (cada item)
3. **Pix key válida** (formato CPF/CNPJ/email/celular)
4. **Subconta existe** (se splitType = SPLIT_SUB_ACCOUNT)
5. **Valor > R$ 0,01**

**Erros comuns:**

| Erro | Causa | Solução |
|---|---|---|
| `INVALID_SPLIT` | Soma > total | Reduzir valor de algum split |
| `INVALID_PIX_KEY` | Formato errado | Validar antes |
| `SUBCONTA_NOT_FOUND` | Pix key não registrada | Criar subconta primeiro |
| `MIN_VALUE` | < R$ 0,01 | Aumentar valor |

---

## 📊 Exemplos de Splits

### E-commerce simples

```
Produto: R$ 50,00
- NextGen: R$ 1,50 (3%)
- Vendedor: R$ 48,25 (96.5%)
- Woovi: R$ 0,25 (0.5%)
```

### Marketplace com 2 vendors

```
Carrinho: R$ 200,00
- Vendor A: R$ 80,00
- Vendor B: R$ 110,00
- NextGen: R$ 6,00 (3%)
- Woovi: R$ 1,00 (0.5%)
- Total: 80 + 110 + 6 + 1 = 197 ≠ 200 ❌

// Solução: ajustar splits
- Vendor A: R$ 80,00
- Vendor B: R$ 113,00  // 110 + 3 do Woovi
- NextGen: R$ 6,00
- Woovi: R$ 1,00
- Total: 200 ✅
```

### Doação (100% NextGen)

```
Doação: R$ 20,00
- NextGen: R$ 19,99
- Woovi: R$ 0,01
- Total: 20 ✅
```

### Subscription (R$ 19,90)

```
Mensalidade: R$ 19,90
- NextGen: R$ 0,59 (3%)
- Vendedor: R$ 19,21 (96.5%)
- Woovi: R$ 0,10 (0.5%)
- Total: 19,90 ✅
```

---

## 🔍 Debug

### Ver splits gerados

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/efi/recent-splits
```

### Status de um split específico

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/efi/split-status/{chargeId}
```

### Stats

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/stats/summary
```

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br

---

**Próximo:** [07_OPEN_FINANCE.md](07_OPEN_FINANCE.md) - Open Finance
