# 🛠️ Troubleshooting - Erros Comuns

> **Para:** Devs que estão enfrentando erros ao integrar NextGen

---

## 🚨 Erros HTTP

### 401 Unauthorized

```
HTTP 401 - Unauthorized
```

**Causa:** API Key inválida ou faltando.

**Solução:**
```bash
# Verificar se header está correto
curl -H "X-API-Key: nka_sua_chave" https://api.nextgenassets.com.br/v1/billing/me
                                                   ^^^^^^^^^^^^^^^^^^^^^
                                                   SEM espaço após :
```

**Causa 2:** API Key expirada ou revogada.

**Solução:** Gerar nova em https://nextgenassets.com.br/settings/api-keys

---

### 402 Payment Required

```
HTTP 402 - Limite do plano atingido
```

**Causa:** User FREE/PREMIUM atingiu limite de triggers.

**Solução:**
```bash
# Verificar uso
curl https://api.nextgenassets.com.br/v1/billing/me

# Se FREE (5/mês), fazer upgrade pra PREMIUM
curl -X POST https://api.nextgenassets.com.br/v1/billing/activate \
  -H "X-API-Key: nka_..." \
  -d '{ "userId": "...", "plan": "PREMIUM" }'
```

---

### 429 Too Many Requests

```
HTTP 429 - Rate limit exceeded
```

**Causa:** Muitas requisições em pouco tempo.

**Limites:**
- 100 req/min por API Key
- 1000 req/hora por IP

**Solução:** Implementar retry com backoff exponencial:
```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const wait = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  throw new Error('Rate limit');
}
```

---

### 500 Internal Server Error

```
HTTP 500 - Internal server error
```

**Causa:** Erro no servidor NextGen.

**Ação:**
1. Verificar https://status.nextgenassets.com.br (em breve)
2. Ver logs: `curl https://api.nextgenassets.com.br/v1/admin/webhooks/debug-logs`
3. Reportar em dev@nextgenassets.com.br com:
   - Endpoint chamado
   - Body enviado
   - Timestamp
   - X-Request-Id (no response header)

---

## 💰 Erros Woovi

### INVALID_SPLIT

```json
{
  "success": false,
  "error": "INVALID_SPLIT",
  "message": "Split total (10000) deve ser < total (10000)"
}
```

**Causa:** Soma dos splits é IGUAL ou MAIOR que o total.

**Solução:**
```javascript
// ❌ Errado
const split = {
  nextgenCents: 300,
  partnerCents: 9700
};
// Total split = 10000 == total 10000 ❌

// ✅ Certo
const split = {
  nextgenCents: 300,
  partnerCents: 9650   // < 9700 (Woovi retém 50)
};
// Total split = 9950 < 10000 ✅
```

**Regra:** `nextgenCents + partnerCents < totalCents`

---

### WOOVI: Charge not found

```json
{
  "error": "WOOVI",
  "message": "Charge not found"
}
```

**Causa:** Charge ID inválido ou expirado (> 30 dias).

**Solução:** Verificar se chargeId tá correto.

---

### WOOVI: Pix key invalid

```
"message": "invalid pix key"
```

**Causa:** Chave PIX inválida.

**Solução:** Validar antes:
```javascript
function isValidPixKey(key) {
  if (key.includes('@')) return isValidEmail(key);
  if (/^\d{11}$/.test(key.replace(/\D/g, ''))) return true; // CPF
  if (/^\d{14}$/.test(key.replace(/\D/g, ''))) return true; // CNPJ
  if (/^\+\d{12,13}$/.test(key.replace(/\D/g, ''))) return true; // phone
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return true; // UUID
  return false;
}
```

---

### WOOVI: Subaccount not found

**Causa:** Subconta não existe.

**Solução:** Criar antes:
```bash
curl -X POST https://api.woovi.com/api/v1/subaccount \
  -H "Authorization: <app-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "pixKey": "henriquecampos66@gmail.com",
    "name": "João Silva"
  }'
```

---

## 🏦 Efi OF mTLS

### SSL alert 40 (handshake failure)

```
error:0A000410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure
SSL alert number 40
```

**Causas possíveis (em ordem de probabilidade):**

1. **Cert não foi ativado na aplicação Efi** (mais comum)
   - **Solução:** Painel Efi → Aplicação Open Finance → Certificados → fazer upload

2. **App Open Finance não foi aprovada pela Efi**
   - **Solução:** Aguardar aprovação (24-72h úteis)

3. **mTLS não habilitado na aplicação**
   - **Solução:** Painel Efi → Habilitar "Open Finance mTLS"

4. **Cert tem passphrase desconhecida**
   - **Solução:** Gerar cert sem senha OU setar `EFI_CERT_PASSPHRASE`

5. **IP não whitelisted**
   - **Solução:** Adicionar IP do Render (44.232.0.0/16, 54.86.0.0/16)

**Debug:**
```bash
# 1. Ver cert no env
curl https://api.nextgenassets.com.br/v1/admin/webhooks/efi-cert-decode

# 2. Testar mTLS
curl -X POST https://api.nextgenassets.com.br/v1/admin/webhooks/efi-of-test

# 3. Status
curl https://api.nextgenassets.com.br/v1/admin/webhooks/efi-of-status
```

---

### Efi: invalid_client

```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

**Causa:** Client_ID ou Client_Secret errado.

**Solução:**
```bash
# Verificar env vars
echo $EFI_CLIENT_ID
echo $EFI_CLIENT_SECRET

# Devem começar com Client_Id_ e Client_Secret_
```

---

### Efi: insufficient_scope

```json
{
  "error": "insufficient_scope"
}
```

**Causa:** App Efi não tem escopo `open-finance.payment`.

**Solução:** Painel Efi → Aplicação → Habilitar escopos.

---

## 🔌 Open Finance (Klavi/Pluggy)

### Connect Token expired

```
"error": "connect_token_expired"
```

**Causa:** Token Connect expira em 30min.

**Solução:** Criar novo token e abrir widget imediatamente.

---

### Item not found (Pluggy)

**Causa:** Item ID não existe ou foi desconectado pelo cliente.

**Solução:** Cliente reconectar via widget.

---

### Bank not supported (Klavi/Pluggy)

**Causa:** Banco do cliente não está na lista de suportados.

**Solução:** Avisar usuário que banco X não está disponível.

---

## 🐛 Bugs Comuns

### 1. "fetch is not defined" (Node < 18)

**Causa:** `fetch` só existe nativamente em Node 18+.

**Solução:**
```bash
npm install node-fetch
```

```javascript
const fetch = require('node-fetch');
```

---

### 2. "JSON.parse" unexpected token

**Causa:** Response não é JSON (ex: HTML de erro).

**Solução:**
```javascript
const res = await fetch(url, options);
const text = await res.text();

try {
  const data = JSON.parse(text);
  // ...
} catch (e) {
  console.error('Not JSON:', text.substring(0, 200));
}
```

---

### 3. CORS error (browser)

**Causa:** Frontend em outro domínio sem CORS.

**Solução:** API já tem CORS aberto. Se persistir, contatar suporte.

---

### 4. Webhook não chega

**Checklist:**
- [ ] URL do webhook está correta?
- [ ] URL responde 200 OK rápido?
- [ ] Tem HTTPS válido?
- [ ] Firewall não bloqueia IP do NextGen?

**Testar manualmente:**
```bash
curl -X POST https://seu-app.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 📊 Performance

### API lenta (> 2s)

**Causa:** Provider (Woovi/Pluggy) offline.

**Solução:**
- Implementar cache (5min para dados estáticos)
- Retry com backoff
- Fallback provider (Klavi se Pluggy falhar)

---

### Cron não roda

**Causa:** Render free tier desliga após 15min inativo.

**Solução:** Upgrade pra Render Standard ($7/mês).

---

## 🔍 Debug Tools

### Ver logs do servidor

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/debug-logs
```

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2026-06-22T18:00:00Z",
      "level": "INFO",
      "message": "Charge created: woovi-abc123",
      "context": {
        "value": 10000,
        "splits": 2
      }
    }
  ]
}
```

### Ver stats

```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/stats/summary
```

### Trace de request

```bash
curl -H "X-Trace-Id: my-trace-001" \
  https://api.nextgenassets.com.br/v1/billing/me
```

Verificar trace:
```bash
curl https://api.nextgenassets.com.br/v1/admin/webhooks/trace/my-trace-001
```

---

## 📞 Quando Contatar Suporte

Antes de contatar, tenha em mãos:

1. **API Key** (pode ser truncada)
2. **Endpoint** que está falhando
3. **Body** enviado (sem dados sensíveis)
4. **Response completa** (status + body)
5. **Timestamp** do erro
6. **X-Request-Id** (header de response)

**Canais:**
- 📧 dev@nextgenassets.com.br
- 📱 WhatsApp +55 11 94798-4328
- 💬 Discord (em breve)

---

**Próximo:** [10_PRICING.md](10_PRICING.md) - Pricing
