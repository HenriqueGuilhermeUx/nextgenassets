# 🏦 Guia Completo: Efi Open Finance (PISP)

**Autor:** Henrique C. (NextGen Assets)
**Data:** 2026-06-21
**Para:** Devs integrando Efi Open Finance com **Payment Initiation (PISP)**

---

## 🎯 O que é PISP?

**PISP = Payment Initiation Service Provider.** É a funcionalidade da **Efí** dentro do **Open Finance Brasil** que permite:

> **Iniciar pagamentos PIX DIRETO da conta do cliente, com autorização prévia dele.**

**Antes do PISP:** Cliente recebia link → clicava → pagava manual.
**Com PISP:** Cliente autoriza UMA VEZ → sistema inicia PIX direto da conta dele.

---

## 🏗️ Arquitetura do fluxo PISP

```
1. 🧑 Cliente quer pagar R$ 100 ao Vendedor
   ↓
2. 📋 Sistema cria CONSENTIMENTO (POST /v1/consent)
   - Escopos: accounts.read, transactions.read, payments.initiate
   - Cliente recebe URL no app do banco
   ↓
3. 🏦 Cliente ABRE o app do banco → AUTORIZA o consentimento
   ↓
4. ✅ Webhook: consent.authorized → sistema salva Consent ACTIVE
   ↓
5. 💸 Sistema INICIA PAGAMENTO (POST /v1/payments)
   - PIX sai DIRETO da conta do cliente
   - Vai pra conta NextGen (split Woovi)
   ↓
6. 💰 Woovi recebe → SPLIT 3% NextGen + 97% Vendedor
   ↓
7. 🎉 Vendedor recebe o dinheiro, NextGen fica com comissão
```

**Sem PISP:** 6 cliques do cliente.
**Com PISP:** 1 autorização no app do banco (e dura 90 dias!).

---

## 🔑 Credenciais necessárias

No `.env`:

```env
# Efi OF (Produção)
EFI_CLIENT_ID=Client_Id_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EFI_CLIENT_SECRET=Client_Secret_xxxxxxxxxxxxxxxxxxxxx
EFI_CERTIFICATE_BASE64=<base64 do arquivo .p12>
EFI_CERT_PASSPHRASE=<senha do .p12 se houver>
EFI_OF_ENABLED=true
```

**Como conseguir o `.p12`:**
1. Login no painel Efí → **Aplicações** → **Criar aplicação**
2. Tipo: **Open Finance**
3. Baixar certificado (.p12) gerado pelo painel
4. Converter pra base64:
   ```bash
   base64 -i seu_certificado.p12 | tr -d '\n' > cert_base64.txt
   ```
5. Colar em `EFI_CERTIFICATE_BASE64`

---

## 🛠️ Endpoints Efi OF (todos testados em produção)

### 1. Auth (gera access_token)

```bash
POST https://openfinance.api.efibank.com.br/v1/oauth/token
Authorization: Basic <base64(clientId:clientSecret)>
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "scope": "open-finance.consent open-finance.payment"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**IMPORTANTE:** Esse endpoint usa **mTLS** (cert .p12 obrigatório).

---

### 2. Criar Consentimento

```bash
POST https://openfinance.api.efibank.com.br/v1/consent
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "data": {
    "loggedUser": {
      "document": {
        "identification": "34198276870",
        "rel": "CPF"
      }
    },
    "permissions": [
      "accounts.read",
      "transactions.read",
      "payments.initiate"
    ],
    "expirationDateTime": "2026-09-19T23:59:59Z"
  }
}
```

**Response:**
```json
{
  "data": {
    "consentId": "urn:efi:consent:abc123",
    "status": "AWAITING_AUTHORISATION",
    "expirationDateTime": "2026-09-19T23:59:59Z"
  },
  "links": {
    "self": "https://...",
    "redirect": {
      "href": "https://efi.com.br/auth?consent=abc123"
    }
  }
}
```

**Cliente acessa `links.redirect.href` → autoriza no app do banco.**

---

### 3. Webhook: consent.authorized

Quando cliente autoriza, Efí manda webhook pra `https://seudominio.com/v1/webhooks/efi-of-public`:

```json
{
  "event": "consent.authorized",
  "data": {
    "consentId": "urn:efi:consent:abc123",
    "loggedUser": { "document": { "identification": "34198276870", "rel": "CPF" } },
    "status": "AUTHORIZED"
  }
}
```

**Seu handler salva `Consent` ACTIVE no DB.**

---

### 4. Iniciar Pagamento (PISP)

```bash
POST https://openfinance.api.efibank.com.br/v1/payments
Authorization: Bearer <access_token>
Content-Type: application/json
Idempotency-Key: <unique-per-payment>

{
  "data": {
    "consentId": "urn:efi:consent:abc123",
    "payment": {
      "amount": "100.00",
      "currency": "BRL"
    },
    "creditorAccount": {
      "ispb": "12345678",
      "issuer": "0001",
      "number": "0000000000000001",
      "accountType": "CACC"
    },
    "remittanceInformation": "Pagamento NextGen #order-123"
  }
}
```

**Response:**
```json
{
  "data": {
    "paymentId": "urn:efi:payment:xyz789",
    "status": "PENDING",
    "endToEndId": "E00000000202606211234..."
  }
}
```

**PIX é iniciado DIRETO da conta do cliente. Sem precisar clicar.**

---

### 5. Webhook: payment.completed

```json
{
  "event": "payment.completed",
  "data": {
    "paymentId": "urn:efi:payment:xyz789",
    "endToEndId": "E00000000202606211234...",
    "payment": { "amount": "100.00", "currency": "BRL" },
    "status": "COMPLETED"
  }
}
```

**Seu handler marca pagamento como pago.**

---

## 💻 Implementação Node.js

### Auth + mTLS

```javascript
const https = require('https');
const fs = require('fs');

const clientId = process.env.EFI_CLIENT_ID;
const clientSecret = process.env.EFI_CLIENT_SECRET;
const certBase64 = process.env.EFI_CERTIFICATE_BASE64;

const pfx = Buffer.from(certBase64, 'base64');
const credenciais = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      grant_type: 'client_credentials',
      scope: 'open-finance.consent open-finance.payment'
    });

    const req = https.request({
      method: 'POST',
      hostname: 'openfinance.api.efibank.com.br',
      port: 443,
      path: '/v1/oauth/token',
      pfx: pfx,
      passphrase: process.env.EFI_CERT_PASSPHRASE || '',
      rejectUnauthorized: false,
      headers: {
        'Authorization': `Basic ${credenciais}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) {
          resolve(parsed.access_token);
        } else {
          reject(new Error(`Efi OAuth error: ${res.statusCode} - ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

### Criar Consent

```javascript
async function createConsent(token, cpf) {
  const body = JSON.stringify({
    data: {
      loggedUser: { document: { identification: cpf, rel: 'CPF' } },
      permissions: ['accounts.read', 'transactions.read', 'payments.initiate'],
      expirationDateTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST',
      hostname: 'openfinance.api.efibank.com.br',
      port: 443,
      path: '/v1/consent',
      pfx: pfx,
      passphrase: process.env.EFI_CERT_PASSPHRASE || '',
      rejectUnauthorized: false,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        resolve(parsed.data?.consentId ? parsed : { raw: data, status: res.statusCode });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

### Iniciar Pagamento

```javascript
async function initiatePayment(token, consentId, cpf, amount, pixKey, description) {
  const idempotencyKey = `pay-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const body = JSON.stringify({
    data: {
      consentId,
      payment: { amount: (amount / 100).toFixed(2), currency: 'BRL' },
      creditorAccount: {
        ispb: '12345678',
        issuer: '0001',
        number: '0000000000000001',
        accountType: 'CACC'
      },
      remittanceInformation: description,
      idempotencyKey
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST',
      hostname: 'openfinance.api.efibank.com.br',
      port: 443,
      path: '/v1/payments',
      pfx: pfx,
      passphrase: process.env.EFI_CERT_PASSPHRASE || '',
      rejectUnauthorized: false,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

---

## 🧪 Fluxo end-to-end

```javascript
async function fluxoCompleto() {
  const token = await getAccessToken();
  
  // 1) Cliente conecta banco
  const consent = await createConsent(token, '34198276870');
  console.log('Cliente autorizou em:', consent.links.redirect.href);
  
  // 2) Quando cliente autoriza (via webhook), sistema inicia pagamento
  const payment = await initiatePayment(
    token,
    consent.data.consentId,
    '34198276870',
    10000,  // R$ 100,00
    'henriquecampos66@gmail.com',
    'Pagamento NextGen'
  );
  
  console.log('PIX iniciado:', payment.data.data.paymentId);
  console.log('endToEndId:', payment.data.data.endToEndId);
}
```

---

## 🛑 Erros comuns

### 1. SSL alert 40 (handshake failure)

**Causa:** Certificado .p12 inválido (expirado, homolog em prod, ou senha errada).

**Fix:**
- Confirma que é o cert de **PRODUÇÃO** (não homolog)
- Verifica validade: `openssl pkcs12 -in cert.p12 -info -nokeys -passin pass:`
- Tenta sem passphrase
- Baixa cert novo do painel

### 2. ECONNRESET

**Causa:** Render deployou com código antigo (sem mTLS).

**Fix:** Re-deploya com código novo.

### 3. 401 Invalid client credentials

**Causa:** `Client_ID` ou `Client_Secret` errado.

**Fix:** Verifica no painel Efí.

### 4. 403 Insufficient scope

**Causa:** Aplicação não tem escopo `open-finance.payment`.

**Fix:** Painel Efí → Aplicação → Habilitar escopos.

---

## 📊 Custos

| Operação | Custo |
|---|---|
| OAuth token | Grátis |
| Criar consent | Grátis |
| Consulta saldo | Grátis |
| Consulta transações | Grátis |
| **Iniciar pagamento (PISP)** | **Grátis** (mas pode ter custo regulatório BACEN) |
| Split Woovi (3% + 97%) | 0,5% do total |

**Total: PISP é GRÁTIS na Efi.** Só paga a taxa Woovi (gateway).

---

## 🔐 Webhooks (cadastrar no painel Efí)

URL: `https://api.nextgenassets.com.br/v1/webhooks/efi-of-public`

Eventos:
- ✅ `consent.authorized` (cliente autorizou)
- ✅ `consent.rejected` (cliente rejeitou)
- ✅ `payment.completed` (PIX completou)

---

## 🎯 Receita TL;DR pro dev

```typescript
// 1. Setup
const token = await getAccessToken();  // mTLS + OAuth2

// 2. Cliente conecta banco
const consent = await createConsent(token, cpf);
console.log('Link:', consent.links.redirect.href);

// 3. Sistema salva Consent quando cliente autorizar (webhook)

// 4. Inicia pagamento DIRETO da conta do cliente
const payment = await initiatePayment(token, consentId, cpf, 10000, pixKey, 'NextGen');

// 5. PIX completou (webhook) → split Woovi
```

---

## 📞 Suporte

- Docs Efi OF: https://dev.efipay.com.br
- Suporte Efi: 0800-XXX-XXXX
- NextGen docs: https://nextgenassets.com.br/docs
- WhatsApp: +55 11 94798-4328

---

**Feito por Henrique C. em 2026-06-21, testado em produção.**