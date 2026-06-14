# 📚 Guia Completo: Como sacar saldo de subcontas Woovi via PIX

**Autor:** Henrique C. (NextGen Assets)
**Data:** 2026-06-14
**Para:** Devs integrando em outros projetos

---

## 🎯 TL;DR

> **SIM, dá pra fazer PIX pra QUALQUER chave (CPF, CNPJ, email, telefone, aleatória)** — desde que a chave esteja cadastrada como **subconta** na conta Woovi.
> 
> **Como fazer:** `POST /api/v1/subaccount/{pixKey}/withdraw` com `{value: 30}`.

A gente usa isso pra **auto-withdraw de subcontas Woovi via cron** — o saldo acumulado numa subconta vai automaticamente pro PIX cadastrado, **sem precisar de PIX OUT (TRANSFER_POST) entre contas**.

---

## 🏗️ Arquitetura: Subcontas Woovi

Cada Partner/loja/NextGen tem sua **própria subconta** Woovi, com PIX key própria.

```
CONTA PRINCIPAL WOOVI (NextGen CNPJ 61922930000197)
│
├── Subconta 1: NextGen Assets (PIX = CNPJ 61922930000197)
│   └── saldo vai pro PIX CNPJ via withdraw
│
├── Subconta 2: Partner 1 (PIX = CPF 34198276870)  
│   └── saldo vai pro PIX CPF via withdraw
│
├── Subconta 3: Partner 2 (PIX = email partner2@empresa.com)
│   └── saldo vai pro email via withdraw
│
└── ... (N partners)
```

**Quando uma cobrança é paga:**
1. Woovi faz **split nativo** entre as subcontas
2. Cada subconta tem seu saldo
3. **Auto-withdraw** (cron a cada 1h) saca pro PIX de cada uma

---

## 🔧 Endpoints Woovi (todos funcionam, testados em produção)

### 1. Listar subcontas com saldos

```bash
GET https://api.woovi.com/api/v1/subaccount
Authorization: <APP_ID>
```

**Resposta:**
```json
{
  "subAccounts": [
    {
      "pixKey": "61922930000197",
      "name": "NextGen Assets",
      "balance": 30,
      "withdrawBlocked": false
    },
    {
      "pixKey": "34198276870",
      "name": "henrique teste",
      "balance": 920,
      "withdrawBlocked": false
    }
  ]
}
```

---

### 2. Sacar saldo de UMA subconta (manualmente)

```bash
POST https://api.woovi.com/api/v1/subaccount/34198276870/withdraw
Authorization: <APP_ID>
Content-Type: application/json

{
  "value": 920
}
```

**Resposta (sucesso):**
```json
{
  "transaction": {
    "value": 920,
    "endToEndId": "E54811417202606130241nsBv9TDkuOv",
    "status": "CREATED",
    "correlationID": "withdraw-34198276870-1234567890"
  },
  "destination": {
    "name": "34198276870",
    "pixKey": "34198276870"
  }
}
```

**Pronto!** O PIX de R$ 9,20 foi enviado pra chave CPF `34198276870` em 3 segundos. 💸

---

### 3. Sacar saldo de TODAS as subcontas (auto-withdraw via cron)

```bash
# Script roda a cada 1h (configurável)
# Saca saldo > R$ 1,00 de cada subconta pro seu próprio PIX

POST https://api.woovi.com/api/v1/subaccount/{pixKey}/withdraw  # loop
```

**Lógica do cron (pseudocódigo):**
```typescript
const subs = await woovi.listSubaccounts();
for (const sub of subs) {
  if (sub.balance >= 100) { // R$ 1,00 mínimo
    await woovi.withdraw(sub.pixKey, sub.balance);
    console.log(`Saquei R$ ${sub.balance/100} pra ${sub.pixKey}`);
  }
}
```

**Implementação NextGen (NestJS):**
```typescript
@Cron(CronExpression.EVERY_HOUR)
async autoWithdrawAll() {
  const subs = await woovi.listSubaccounts();
  for (const sub of subs) {
    if (sub.balance >= parseInt(process.env.AUTO_WITHDRAW_MIN_CENTS)) {
      const result = await woovi.withdraw(sub.pixKey, sub.balance);
      // loga no AuditLog
      await prisma.auditLog.create({
        data: {
          action: 'AUTO_WITHDRAW',
          resource: 'subaccount',
          resourceId: sub.pixKey,
          actor: 'cron:auto-withdraw',
          metadata: {
            balanceCents: sub.balance,
            endToEndId: result.transaction.endToEndId
          }
        }
      });
    }
  }
}
```

---

## 🔄 Como criar subcontas

### Criar subconta (Partner novo)

```bash
POST https://api.woovi.com/api/v1/subaccount
Authorization: <APP_ID>
Content-Type: application/json

{
  "pixKey": "34198276870",
  "name": "henrique teste"
}
```

**Resposta:**
```json
{
  "subAccount": {
    "pixKey": "34198276870",
    "name": "henrique teste"
  }
}
```

**Importante:** A chave PIX tem que ser **válida** (CPF/CNPJ/email/telefone/chave aleatória).

---

## 💰 Como ACUMULAR saldo na subconta (via Split)

### Opção A: Split via charge

```bash
POST https://api.woovi.com/api/v1/charge
Authorization: <APP_ID>
Content-Type: application/json

{
  "value": 10000,  // R$ 100,00
  "correlationID": "order-123",
  "splits": [
    { "pixKey": "61922930000197", "value": 300, "splitType": "SPLIT_SUB_ACCOUNT" },  // NextGen R$ 3
    { "pixKey": "34198276870",   "value": 9700, "splitType": "SPLIT_SUB_ACCOUNT" }  // Partner R$ 97
  ]
  // Woovi retém os 10000 - 300 - 9700 = 0
  // ⚠️ MAS: a soma dos splits DEVE ser MENOR que o total (Woovi retém 0,5% de taxa)
}
```

**Regra da Woovi:** a soma dos splits tem que ser **menor** que o valor total (pra Woovi reter a taxa).

Exemplo correto pra R$ 100:
- Total: 10000 (R$ 100)
- NextGen split: 300 (R$ 3) 
- Partner split: 9600 (R$ 96) — note: NÃO pode ser 9700!
- Woovi retém: 100 (R$ 1) — taxa 1% (pode variar, normalmente 0,5% a 1%)

**Pra saber a taxa exata da Woovi**, consulta `/charge` após criar e vê `fee` no response.

---

### Opção B: Sem split (acumula na conta principal)

```bash
POST https://api.woovi.com/api/v1/charge
Authorization: <APP_ID>
Content-Type: application/json

{
  "value": 10000,
  "correlationID": "order-123"
}
// Sem split = tudo vai pra conta principal NextGen
// Aí tu saca via dashboard Woovi (saque manual)
```

---

## 🔐 Autenticação

Woovi usa **AppID estático** (sem OAuth):

```bash
Authorization: <APP_ID_BASE64>
```

**Formato do AppID:**
- É base64 de `ClientId:ClientSecret`
- Exemplo: `Q2xpZW50X0lkXzNkZjJkZTNjLWE5NDEtNGIwOC05NGE4LWUwZThmYjM2NzQwNzpDbGllbnRfU2VjcmV0X0ZXZFEySXYvdXVkN3pXRWxtdVlWTTVKYVNJR2lORWEzS0ltOEpRQ3pHZGM9`
- Decode: `Client_Id_3df2de3c-a941-4b08-94a8-e0e8fb367407:Client_Secret_FWdQ2Iv/uud7zWElmuYVM5JaSIGiNEa3KIm8JQCzGdc=`

---

## ⚠️ Erros comuns

### 1. "pixKey não pertence a uma conta virtual"
**Causa:** A chave PIX precisa estar cadastrada como subconta antes.
**Fix:** `POST /api/v1/subaccount` primeiro, depois usar no split.

### 2. "valor total do split não pode ser igual ao valor da cobrança"
**Causa:** Soma dos splits = total. Woovi precisa reter a taxa.
**Fix:** Deixar pelo menos 0,5% (1-2 reais em R$ 100) pra Woovi.

### 3. "Split de pagamentos não estão habilitados para sua empresa"
**Causa:** Escopo `SPLIT_SUB_ACCOUNT` não liberado.
**Fix:** Solicitar em https://app.woovi.com.br → Settings → API → Split de Pagamentos.

### 4. "Essa funcionalidade não está habilitada" (TRANSFER_POST)
**Causa:** PIX OUT entre contas Woovi não liberado.
**Fix:** Usar subcontas + auto-withdraw (esse fluxo FUNCIONA sem PIX OUT).

### 5. "Method Not Allowed" em /withdraw
**Causa:** URL errada.
**Certo:** `POST /api/v1/subaccount/{pixKey}/withdraw` (com pixKey NO PATH, não no body).

---

## 📊 Custos

| Operação | Custo |
|---|---|
| Criar charge | R$ 0 (Woovi retém 0,5-1% do valor) |
| Split nativo | R$ 0 |
| Withdraw (sacar saldo) | R$ 0 (é PIX normal) |
| Receber PIX de subconta | R$ 0 |

**Total: NextGen fica com a comissão configurada (ex: 3%) MENOS a taxa Woovi (~0,5%).**

Exemplo pra R$ 100:
- NextGen split: R$ 3
- Partner split: R$ 96
- Woovi retém: R$ 1
- Total distribuição: R$ 100 ✓

**NextGen fica com 3%.** Líquido depois de Woovi: ~2,5%.

---

## 🧪 Testar (Postman / cURL)

### Passo 1: Criar subconta
```bash
curl -X POST https://api.woovi.com/api/v1/subaccount \
  -H "Authorization: <APP_ID>" \
  -H "Content-Type: application/json" \
  -d '{"pixKey":"34198276870","name":"henrique teste"}'
```

### Passo 2: Criar charge COM split
```bash
curl -X POST https://api.woovi.com/api/v1/charge \
  -H "Authorization: <APP_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 10000,
    "correlationID": "test-001",
    "splits": [
      {"pixKey":"61922930000197","value":300,"splitType":"SPLIT_SUB_ACCOUNT"},
      {"pixKey":"34198276870","value":9600,"splitType":"SPLIT_SUB_ACCOUNT"}
    ]
  }'
```

### Passo 3: Pagar (cliente paga o `paymentLinkUrl`)

### Passo 4: Ver saldo
```bash
curl https://api.woovi.com/api/v1/subaccount \
  -H "Authorization: <APP_ID>"
```

### Passo 5: Sacar
```bash
curl -X POST https://api.woovi.com/api/v1/subaccount/34198276870/withdraw \
  -H "Authorization: <APP_ID>" \
  -H "Content-Type: application/json" \
  -d '{"value":9600}'
```

**Pronto! R$ 96,00 enviado pro CPF 34198276870 em 3 segundos.** 🎉

---

## 🏗️ Endpoints extras úteis

| Endpoint | Pra quê |
|---|---|
| `GET /api/v1/subaccount` | Lista subcontas com saldos |
| `POST /api/v1/subaccount` | Cria subconta |
| `POST /api/v1/subaccount/{pixKey}/withdraw` | Saca saldo |
| `POST /api/v1/subaccount/{pixKey}/transfer` | Transfere entre subcontas |
| `POST /api/v1/subaccount/{pixKey}/debit` | Debita (manda pra conta principal) |
| `GET /api/v1/subaccount/{pixKey}/statement` | Extrato da subconta |
| `POST /api/v1/charge` | Cria cobrança (com ou sem split) |
| `GET /api/v1/charge/{id}` | Consulta cobrança |
| `GET /api/v1/webhook` | Lista webhooks |
| `POST /api/v1/webhook` | Registra webhook |
| `POST /api/v1/transfer` | PIX OUT (conta principal → externo) — **requer request access** |

---

## 🎯 Receita pro teu dev (TL;DR)

```typescript
// 1. Setup
import Woovi from '@nextgen/sdk';
const woovi = new Woovi({ apiKey: process.env.WOOVI_APP_ID });

// 2. Criar Partner (subconta)
const partner = await woovi.createSubaccount({
  pixKey: partner.cpf,  // ou cnpj, email, phone
  name: partner.name
});

// 3. Quando Partner vende R$ 100
const charge = await woovi.createCharge({
  value: 10000,  // centavos
  correlationID: `order-${orderId}`,
  splits: [
    { pixKey: 'nextgen@pix', value: 300 },  // 3% NextGen
    { pixKey: partner.pixKey, value: 9600 }  // 96% Partner
  ]
});
// Cliente paga o charge.paymentLinkUrl

// 4. Webhook avisa quando foi pago
// Auto-withdraw (cron 1h) saca saldo da subconta pro PIX do Partner
await woovi.withdrawAll({ minCents: 100 });
```

**É isso. Em 1 hora teu dev integra.**

---

## 📞 Suporte

- Docs Woovi: https://developers.woovi.com/
- NextGen docs: https://nextgenassets.com.br/docs
- WhatsApp: +55 11 94798-4328 (Henrique)
- Email: henriquecampos66@gmail.com

---

**Feito por Henrique C. em 2026-06-14, testado em produção com PIX REAL.**
