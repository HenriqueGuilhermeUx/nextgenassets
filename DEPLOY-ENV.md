# DEPLOY-ENV.md — Mapa Completo de Variáveis de Ambiente

> **Cada chave API, cada secret, cada token — onde colocar, como gerar, como proteger.**

---

## 🎯 Regra de ouro

| Tipo de variável | Onde colocar |
|---|---|
| **API keys de serviços externos** (OpenAI, Efí, etc) | **Render** (backend) — **NUNCA** no front |
| **`NEXT_PUBLIC_*`** (precisa chegar no browser) | **Netlify** (frontend) |
| **JWT_SECRET, senhas internas** | **Render** (gerar valor novo, nunca reusar) |
| **Certificados (.p12)** | **Render** (em base64) |
| **Connection strings de banco** | **Render** (com `?sslmode=require`) |
| **DNS / Domínios** | **Cloudflare** (não é env var) |

> ⚠️ **NUNCA** commite `.env` no Git. Sempre use `.env.example` (template) e configure secrets no painel.

---

## 📋 Mapa completo de variáveis

### 🔵 RENDER (Backend NestJS)

#### Banco de dados
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres?sslmode=require` | [supabase.com](https://supabase.com) > Settings > Database |

#### Redis
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `REDIS_URL` | `redis://default:xxx@xxx.upstash.io:6379` | [upstash.com](https://upstash.com) > Database > Details |

#### Aplicação
| Key | Exemplo | Notas |
|---|---|---|
| `NODE_ENV` | `production` | Fixo |
| `PORT` | `3001` | Fixo (Render já injeta, mas não custa) |
| `APP_URL` | `https://nextgenassets.com.br` | Fixo |
| `API_URL` | `https://api.nextgenassets.com.br` | Fixo |
| `WIDGET_URL` | `https://widget.nextgenassets.com.br` | Fixo (CDN no futuro) |
| `CORS_ORIGINS` | `https://nextgenassets.com.br,https://admin.nextgenassets.com.br,...` | CSV, sem espaços |

#### JWT (autenticação interna)
| Key | Exemplo | Como gerar |
|---|---|---|
| `JWT_SECRET` | `a1b2c3d4e5...` (32+ chars) | Render > Environment > **Generate value** |
| `JWT_REFRESH_SECRET` | `f6g7h8i9j0...` (diferente do JWT_SECRET) | Render > Environment > **Generate value** |
| `JWT_EXPIRES_IN` | `15m` | Fixo |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Fixo |

#### OpenAI
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `OPENAI_API_KEY` | `sk-proj-xxxxx` | [platform.openai.com](https://platform.openai.com) > API keys |
| `OPENAI_MODEL` | `gpt-4o-mini` | Fixo (custo ~$0.15/1M tokens) |
| `AI_CONFIDENCE_THRESHOLD` | `0.7` | Fixo (gatilhos < 0.7 entram como PAUSED) |

#### Anthropic (fallback)
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx` | [console.anthropic.com](https://console.anthropic.com) > Settings > API Keys |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` | Fixo |

#### Efí Bank (Open Finance + ITP)
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `EFI_API_URL` | `https://api.efi.com.br/v1` | Fixo (ou `https://api-hml.efi.com.br/v1` em sandbox) |
| `EFI_CLIENT_ID` | `Client_Id_xxxxx_xxxxx` | [sejaefi.com.br](https://sejaefi.com.br) > API > Credenciais |
| `EFI_CLIENT_SECRET` | `Client_Secret_xxxxx_xxxxx` | Mesmo lugar |
| `EFI_PIX_KEY` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Painel Efí > Pix > Minhas chaves |
| `EFI_CERTIFICATE_BASE64` | *(base64 do .p12)* | Veja abaixo |

**Como converter certificado .p12 pra base64:**
```bash
base64 -i caminho-do-certificado.p12 | tr -d '\n' > cert-base64.txt
# Copia o conteúdo (sem quebras de linha) e cola no Render
```

> ⚠️ **Nunca commite o .p12 no Git!** Usa `.gitignore` pra ignorar `*.p12`.

#### Woovi (Pix + Subcontas)
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `WOOVI_API_URL` | `https://api.woovi.com/v1` | Fixo |
| `WOOVI_APP_ID` | `app_xxxxx` | [woovi.com](https://woovi.com) > API |
| `WOOVI_API_KEY` | `xxxxxxxxxxxxxxxxxxxx` | Mesmo lugar |

#### WhatsApp (multi-provider)
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `WHATSAPP_PROVIDER` | `zapi` | Fixo (ou `twilio`, `business_api`, `evolution`) |
| `WHATSAPP_API_URL` | `https://api.z-api.io` | Depende do provider |
| `WHATSAPP_INSTANCE_ID` | `xxxxx` | Painel do provider |
| `WHATSAPP_TOKEN` | `xxxxx` | Mesmo lugar |

#### BullMQ (fila)
| Key | Exemplo | Notas |
|---|---|---|
| `BULL_PREFIX` | `nga` | Fixo (usado pra separar de outros projetos no Redis) |

#### Sentry (monitoramento de erros)
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `SENTRY_DSN` | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` | [sentry.io](https://sentry.io) > Project Settings |
| `SENTRY_ENVIRONMENT` | `production` | Fixo |

---

### 🟢 NETLIFY (Frontends)

#### Comum a TODOS os 4 frontends
| Key | Exemplo | Notas |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.nextgenassets.com.br` | URL do backend no Render |
| `NEXT_PUBLIC_APP_URL` | `https://nextgenassets.com.br` | URL do marketing (referência) |

#### Marketing (apps/marketing)
| Key | Exemplo | Notas |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nextgenassets.com.br` | Pra SEO/canonical |

#### Admin (apps/admin)
| Key | Exemplo | Notas |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://admin.nextgenassets.com.br` | Pra canonical |
| `NEXT_PUBLIC_ADMIN_KEY` | `nga_adm_xxxxx_xxxxx` | Senha de bootstrap (opcional) |

#### Partner (apps/partner)
| Key | Exemplo | Notas |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://painel.nextgenassets.com.br` | Pra canonical |

#### Consumer (apps/consumer)
| Key | Exemplo | Notas |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://app.nextgenassets.com.br` | Pra canonical |

---

### 🟡 FIREBASE (opcional)

#### Em todos os frontends
| Key | Exemplo | Onde conseguir |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` | [console.firebase.google.com](https://console.firebase.google.com) > Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `nextgen-assets.firebaseapp.com` | Mesmo lugar |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `nextgen-assets` | Mesmo lugar |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `nextgen-assets.appspot.com` | Mesmo lugar |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | Mesmo lugar |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789:web:xxxxx` | Mesmo lugar |

---

## 🔐 Como proteger

### 1. Rotação de chaves
- **JWT_SECRET, JWT_REFRESH_SECRET** — rotacionar a cada 90 dias (invalida todos os tokens, forçando re-login)
- **API keys externas** — rotacionar a cada 6 meses ou se vazar
- **Webhook secrets** — rotacionar a cada 6 meses

### 2. Criptografia
No código, **nunca** logar API keys. Criptografa antes de salvar no banco:
```typescript
import { createCipheriv, createDecipheriv } from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
```

### 3. Auditoria
- Toda leitura/escrita de secret vai pra `AuditLog`
- Sentry captura qualquer log acidental
- DPO revisa mensalmente

### 4. Backup
Não tem como fazer backup de env vars. **Por isso a regra é: documente.**

Esse próprio arquivo (DEPLOY-ENV.md) é o backup. Mantém versionado no Git (privado).

---

## 🛠️ Passo a passo: configurar TUDO

### Ordem recomendada:

1. **Cria Supabase** → pega `DATABASE_URL`
2. **Cria Upstash** → pega `REDIS_URL`
3. **Cria conta OpenAI** → pega `OPENAI_API_KEY` (deposita $5 mínimo)
4. **Cria conta Anthropic** → pega `ANTHROPIC_API_KEY` (deposita $5 mínimo)
5. **Cria conta Efí** → sandbox primeiro (grátis)
   - Pega `EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`, `EFI_PIX_KEY`
   - Converte certificado pra base64
6. **Cria conta Woovi** → sandbox primeiro (grátis)
   - Pega `WOOVI_APP_ID`, `WOOVI_API_KEY`
7. **(Opcional) Cria Firebase** → pega credenciais web
8. **Cria conta Render** → configura Web Service com TODAS as vars acima
9. **Cria conta Netlify** → configura 4 sites, cada um com suas vars
10. **Configura Cloudflare DNS** → aponta tudo

---

## 🧪 Testa cada integração antes de ir pra produção

### OpenAI
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
# → lista de modelos
```

### Anthropic
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'
```

### Supabase
```bash
psql "$DATABASE_URL" -c "SELECT version();"
# → PostgreSQL 16.x
```

### Upstash
```bash
redis-cli -u "$REDIS_URL" PING
# → PONG
```

### Efí (sandbox)
```bash
curl -X POST "https://api-hml.efi.com.br/v1/oauth/token" \
  -H "Authorization: Basic $(echo -n "$EFI_CLIENT_ID:$EFI_CLIENT_SECRET" | base64)" \
  -d "grant_type=client_credentials&scope=pix.read pix.write"
# → access_token
```

### Woovi (sandbox)
```bash
curl "https://api.woovi.com/v1/account" \
  -H "Authorization: $WOOVI_API_KEY"
```

---

## 📊 Checklist completo de env vars

### Render
- [ ] `DATABASE_URL` (Supabase)
- [ ] `REDIS_URL` (Upstash)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `APP_URL`
- [ ] `API_URL`
- [ ] `WIDGET_URL`
- [ ] `CORS_ORIGINS`
- [ ] `JWT_SECRET` (gerado pelo Render)
- [ ] `JWT_REFRESH_SECRET` (gerado pelo Render)
- [ ] `JWT_EXPIRES_IN=15m`
- [ ] `JWT_REFRESH_EXPIRES_IN=7d`
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_MODEL=gpt-4o-mini`
- [ ] `AI_CONFIDENCE_THRESHOLD=0.7`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `ANTHROPIC_MODEL=claude-haiku-4-5`
- [ ] `EFI_API_URL`
- [ ] `EFI_CLIENT_ID`
- [ ] `EFI_CLIENT_SECRET`
- [ ] `EFI_PIX_KEY`
- [ ] `EFI_CERTIFICATE_BASE64`
- [ ] `WOOVI_API_URL`
- [ ] `WOOVI_APP_ID`
- [ ] `WOOVI_API_KEY`
- [ ] `WHATSAPP_PROVIDER`
- [ ] `WHATSAPP_API_URL`
- [ ] `WHATSAPP_INSTANCE_ID`
- [ ] `WHATSAPP_TOKEN`
- [ ] `BULL_PREFIX=nga`
- [ ] `SENTRY_DSN` (opcional mas recomendado)

### Netlify — Marketing
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] (Firebase, se usar)

### Netlify — Admin
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_ADMIN_KEY`
- [ ] (Firebase, se usar)

### Netlify — Partner
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] (Firebase, se usar)

### Netlify — Consumer
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] (Firebase, se usar)

---

## ⚠️ Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| **"Invalid API Key" (OpenAI)** | Chave errada ou sem crédito | Verifica em [platform.openai.com/usage](https://platform.openai.com/usage) |
| **"Connection refused" (Supabase)** | Senha errada ou falta `?sslmode=require` | Testa com `psql` local |
| **"Redis not connected"** | Senha errada | Confere endpoint completo |
| **"Efi: 401 Unauthorized"** | Client ID/Secret errado OU certificado expirado | Re-gera no painel Efí |
| **"CORS policy"** | Domínio não tá em `CORS_ORIGINS` | Adiciona e redeploya |
| **"JWT malformed"** | `JWT_SECRET` mudou entre deploys | Rotação vai invalidar tokens — espera re-login |
| **Build timeout** | Plano Free com build > 15min | Upgrade Pro ou otimiza |

---

## 📁 Onde guardar cada arquivo

| Arquivo | Onde | Commit? |
|---|---|---|
| `.env` (desenvolvimento) | Local (sua máquina) | ❌ NUNCA |
| `.env.example` (template) | No GitHub | ✅ SIM |
| `render.yaml` (config Render) | No GitHub | ✅ SIM |
| `netlify.toml` (config Netlify) | No GitHub | ✅ SIM |
| `DEPLOY-ENV.md` (esse arquivo) | No GitHub (privado) | ✅ SIM |
| Certificados .p12 | Vault / Supabase Storage | ❌ NUNCA no Git |
| `cert-base64.txt` | Local | ❌ NUNCA no Git |

Adiciona ao `.gitignore`:
```gitignore
.env
.env.local
.env.production
*.p12
*.pem
cert-base64.txt
```

---

**Tudo que você precisa tá aqui. Bora deployar.** 🚀
