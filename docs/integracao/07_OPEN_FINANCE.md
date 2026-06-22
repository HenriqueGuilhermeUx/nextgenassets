# 🏦 Open Finance Brasil

> **Para:** Devs integrando Open Finance (read + write/PISP)

---

## O que é Open Finance?

**Open Finance Brasil** = sistema do Banco Central que permite **compartilhar dados e iniciar pagamentos** entre instituições financeiras, com autorização do cliente.

**NextGen usa 3 providers:**

| Provider | Tipo | Status | Custo |
|---|---|---|---|
| **Pluggy** | Read (sandbox) | ✅ Live | R$ 0,50/query |
| **Klavi** | Read (sandbox) | ✅ Live | Free (sandbox) |
| **Efi OF** | Read + Write (PISP) | 🟡 Configurando | Grátis |

---

## 📖 Read Open Finance (consultar dados)

**Funcionalidades:**
- Listar contas do cliente
- Listar transações
- Ver saldos
- Ver investimentos (em breve)

**Providers:**

### Pluggy (pago, R$ 0,50/query)

**Setup:**
1. Login em https://dashboard.pluggy.com
2. Conectar Connect Token
3. Sandbox: `https://sandbox.pluggy.com`

**Fluxo:**
```
1. Backend cria Connect Token (POST /connect_token)
2. Frontend abre widget Pluggy (https://connect.pluggy.com)
3. Cliente seleciona banco + autoriza
4. Pluggy cria Item + Account
5. Webhook → nosso backend
6. Backend salva Consent ACTIVE
7. Backend faz queries (GET /accounts, /transactions)
```

### Klavi (free sandbox, mais barato)

**Setup:**
1. Login em https://klavi.ai
2. Sandbox: `https://api-sandbox.klavi.ai`

**Fluxo similar ao Pluggy.**

**Vantagem:** Free em sandbox.

---

## 🛠️ Implementação Read OF

### 1. Cliente conecta banco

```javascript
// Backend: criar Connect Token (Klavi)
const response = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/klavi-test', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({ cpf: '34198276870' })
});

const { linkUrl, linkToken } = await response.json();

// Frontend: redirecionar
window.location.href = linkUrl;
```

### 2. Cliente autoriza no app do banco

Klavi/Pluggy abrem o app do banco, cliente faz login + autoriza.

### 3. Webhook → consent ACTIVE

```json
{
  "event": "consent.authorized",
  "data": {
    "cpf": "34198276870",
    "provider": "klavi"
  }
}
```

### 4. Ler saldo

```javascript
// Backend: ler saldo via Klavi
const balance = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/klavi-simulate', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get-balance',
    cpf: '34198276870'
  })
});

// Resposta
{
  "success": true,
  "balance": 500000,  // R$ 5.000,00 em centavos
  "account": {
    "bank": "Itaú",
    "type": "CACC",
    "number": "12345-6"
  }
}
```

### 5. Listar transações

```javascript
const txns = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/klavi-simulate', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type": 'application/json' },
  body: JSON.stringify({
    action: 'get-transactions',
    cpf: '34198276870',
    from: '2026-06-01',
    to: '2026-06-22'
  })
});

// Resposta
{
  "success": true,
  "transactions": [
    {
      "id": "tx-001",
      "date": "2026-06-20",
      "amount": 50000,  // R$ 500,00 (positivo = entrada)
      "description": "TED recebido",
      "type": "CREDIT"
    }
  ]
}
```

---

## 💸 Write Open Finance (PISP) - Efi OF

> **Status:** Em homologação.

**PISP** = Payment Initiation Service Provider. Permite **iniciar PIX DIRETO** da conta do cliente, com autorização prévia.

**Diferença vs split manual:**

| Split Manual | PISP (Efi OF) |
|---|---|
| Cliente vê QR Code e paga | Cliente autoriza 1x, sistema inicia PIX |
| Cliente precisa abrir app toda vez | Automático após autorização |
| 1 pagamento = 1 ação | 1 autorização = N pagamentos (90 dias) |

**Fluxo PISP:**

```
1. App cria Consent (escopos: accounts.read, payments.initiate)
2. Cliente abre app do banco → autoriza
3. Webhook: consent.authorized
4. Sistema inicia pagamento (POST /v1/payments)
5. PIX sai da conta do cliente → direto pro vendedor
6. Webhook: payment.completed
```

### Setup Efi OF

**No painel Efi:**
1. Aplicações → API Pix via Open Finance
2. Gerar certificado mTLS (.p12)
3. Anotar Client_ID e Client_Secret

**Env vars NextGen:**
```env
EFI_CLIENT_ID=Client_Id_xxx
EFI_CLIENT_SECRET=Client_Secret_xxx
EFI_CERTIFICATE_BASE64=<base64-of-p12>
EFI_OF_API_URL=https://openfinance.api.efibank.com.br
EFI_OAUTH_URL=https://openfinance.api.efibank.com.br/v1/oauth/token
EFI_ENABLED=true
```

### Criar Consent

```javascript
const consent = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-criar-consent', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cpf: '34198276870',
    permissions: ['accounts.read', 'transactions.read', 'payments.initiate'],
    expirationDateTime: '2026-09-19T23:59:59Z'
  })
});

const { consentId, authUrl } = await consent.json();
// Redirecionar cliente pro authUrl
window.location.href = authUrl;
```

### Iniciar Pagamento

```javascript
const payment = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-pay', {
  method: 'POST',
  headers: { 'X-API-Key': 'nka_...', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consentId: 'urn:efi:consent:abc',
    amount: 10000,  // R$ 100,00
    pixKey: 'henriquecampos66@gmail.com',
    description: 'Pagamento NextGen'
  })
});

const { paymentId, endToEndId } = await payment.json();
```

### Split após pagamento PISP

O PISP é **direto** (sem split). Pra ter split, o sistema pode:
1. Receber 100% na conta NextGen via PISP
2. Woovi faz split 3% + 97% para subcontas

**OU** usar PISP pra pagar a conta NextGen, depois split via Woovi interno.

---

## 🛡️ Segurança mTLS

**mTLS** = Mutual TLS. Cliente E servidor se autenticam mutuamente com certificados.

**Efi OF exige mTLS:**
- Cliente (NextGen) envia cert ao conectar
- Servidor (Efi) valida cert
- Sem cert válido → SSL alert 40

**Setup do cert .p12:**

1. Gerar no painel Efi (Aplicação Open Finance)
2. Converter pra base64:
   ```bash
   base64 -i cert.p12 -o cert.txt
   ```
3. Setar env var `EFI_CERTIFICATE_BASE64`
4. Cert é automaticamente usado nas chamadas

**Problema comum:** cert não ativado no painel Efi. Veja [09_TROUBLESHOOTING.md](09_TROUBLESHOOTING.md#efi-of-mtls).

---

## 🧪 Sandbox vs Produção

| Ambiente | URL | Custo | Validação |
|---|---|---|---|
| **Sandbox** | `https://api-sandbox.klavi.ai` (Klavi) | Free | Fake data |
| | `https://sandbox.pluggy.com` (Pluggy) | R$ 0,50/query | Fake data |
| | `https://openfinance-h.api.efibank.com.br` (Efi homolog) | Grátis | Mock data |
| **Produção** | Real provider URLs | Custo real | Dados reais |

**Sandbox Pluggy/Klavi** tem bancos fake (Ex: "Banco Demo").

**Sandbox Efi homolog** retorna dados mock.

---

## 📋 Comparação de Providers

| Feature | Pluggy | Klavi | Efi OF |
|---|---|---|---|
| Read accounts | ✅ | ✅ | ✅ |
| Read transactions | ✅ | ✅ | ✅ |
| Read investments | ✅ | ✅ | ❌ |
| **PISP (write)** | ❌ | ❌ | ✅ |
| Preço (sandbox) | Free | Free | Free |
| Preço (prod) | R$ 0,50/query | Barato | Grátis (PISP) |
| mTLS necessário | ❌ | ❌ | ✅ |
| UI widget | ✅ Pluggy Connect | ✅ Klavi Connect | ❌ Manual |
| Tempo setup | 30min | 30min | 2-4h (aprovação) |

---

## 🎯 Recomendação

**Cenário 1: Marketplace simples (só split)**
→ Não precisa OF. Só Woovi.

**Cenário 2: Subscription recorrente**
→ Não precisa OF. Só Woovi Pix Automático.

**Cenário 3: Gatilho automático (lê saldo)**
→ Precisa OF read. Use Klavi (free sandbox).

**Cenário 4: Pagamento direto da conta (sem QR Code)**
→ Precisa PISP. Use Efi OF (em homologação).

**Cenário 5: Multi-provider (high availability)**
→ Pluggy + Klavi (fallback).

---

## 📞 Suporte

- **Email:** dev@nextgenassets.com.br
- **Open Finance Brasil docs:** https://openfinancebrasil.atlassian.net

---

**Próximo:** [08_SUBSCRIPTION.md](08_SUBSCRIPTION.md) - Pix Automático
