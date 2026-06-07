# DEPLOY-RENDER-NGA.md — Deploy NextGen Assets no Render

> **Guia focado e direto: API no Render + DB no Supabase + Redis no Upstash + 4 Frontends no Netlify**
> Custo: ~$7/mês (Render) + $0 (Supabase) + $0 (Upstash) + $0 (Netlify) = **~$7/mês**

---

## 🎯 Visão geral

| Componente | Plataforma | URL final | Custo |
|---|---|---|---|
| **API NestJS** | Render (Web Service) | `https://api.nextgenassets.com.br` | $7/mês |
| **PostgreSQL** | Supabase | interno (privado) | Grátis |
| **Redis** | Upstash | interno (privado) | Grátis |
| **Marketing** | Netlify | `https://nextgenassets.com.br` | Grátis |
| **Admin** | Netlify | `https://admin.nextgenassets.com.br` | Grátis |
| **Partner** | Netlify | `https://painel.nextgenassets.com.br` | Grátis |
| **Consumer** | Netlify | `https://app.nextgenassets.com.br` | Grátis |

---

## 📋 Ordem de execução

1. ☐ **HOJE:** Criar Supabase + rodar migrations (20min)
2. ☐ **HOJE:** Criar Upstash Redis (5min)
3. ☐ **HOJE:** Subir API no Render (15min)
4. ☐ **AMANHÃ:** Configurar DNS no Cloudflare (15min)
5. ☐ **AMANHÃ:** Subir 4 frontends no Netlify (30min)
6. ☐ **SEMANA 1:** Contratar APIs externas (1-2h)

---

## 1️⃣ Banco de dados: Supabase (15min)

### 1.1 Cria projeto
1. Acessa [supabase.com](https://supabase.com) → **Start your project**
2. Login com GitHub
3. **New Project**:
   - **Name:** `nextgen-assets-prod`
   - **Database Password:** clica em **Generate** (copia e guarda — vai ser sua senha do banco)
   - **Region:** `South America (São Paulo)` ← mais perto = mais rápido
   - **Plan:** Free
4. Espera provisionar (~1-2 min)

### 1.2 Pega a connection string
1. Vai em **Settings** (⚙️ no menu lateral) → **Database**
2. Rola até **Connection string** → **URI**
3. Copia o valor, vai ser tipo:
   ```
   postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
4. **Substitui `[YOUR-PASSWORD]`** pela senha real do passo 1.1
5. **Adiciona `?sslmode=require`** no final

Exemplo final:
```
postgresql://postgres.xxxx:AbCdEf123456@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

> ⚠️ **GUARDA ESSA URL** — você vai colar no Render.

### 1.3 Roda as migrations

**Opção A — Local (recomendado):**
```bash
# Exporta temporariamente a URL do Supabase
export DATABASE_URL="postgresql://postgres.xxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

cd apps/api
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

**Opção B — Pelo SQL Editor do Supabase:**
1. No painel do Supabase → **SQL Editor** (menu lateral)
2. Clica em **+ New query**
3. Cola o conteúdo de `prisma/migrations/0_init/migration.sql`
4. Clica em **Run** (ou Ctrl+Enter)
5. Repete pro `seed.ts` (mas o seed tem TypeScript, melhor usar Opção A)

### 1.4 Verifica
```bash
psql "postgresql://postgres.xxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT count(*) FROM \"Partner\";"
# → 1 (do seed)
```

---

## 2️⃣ Redis: Upstash (5min)

### 2.1 Cria database
1. Acessa [console.upstash.com](https://console.upstash.com) → **Login** com GitHub
2. **Create Database**:
   - **Name:** `nextgen-assets-redis`
   - **Type:** Regional
   - **Region:** `us-east-1` (mais barato, funciona bem do Brasil)
   - **TLS:** Enabled (default)
3. Clica em **Create**

### 2.2 Pega a connection string
1. Clica no database criado
2. Rola até **Connect to your database** → **Redis URL** (ou **TCP/SSL URL**)
3. Copia algo tipo:
   ```
   redis://default:AbCdEf123456@us1-xxxxx.upstash.io:6379
   ```

> ⚠️ **GUARDA ESSA URL** — vai pro Render.

### 2.3 Verifica (opcional)
```bash
redis-cli -u "redis://default:SUA_SENHA@us1-xxxxx.upstash.io:6379" PING
# → PONG
```

---

## 3️⃣ API no Render (15min)

### 3.1 Cria Web Service
1. Acessa [dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Web Service**
3. **Connect a repository** → procura `HenriqueGuilhermeUx/nextgenassets` → **Connect**
4. Se não aparecer, clica em **Configure account** e dá permissão

### 3.2 Configura o serviço

| Campo | Valor |
|---|---|
| **Name** | `nga-api` |
| **Region** | **Oregon (US West)** ← mais barato |
| **Branch** | `main` |
| **Root Directory** | *(deixe vazio)* |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `deploy/docker/api.Dockerfile` |
| **Docker Context** | `.` |
| **Plan** | **Starter** ($7/mês) ← tem que ser Starter, não Free (Free dorme) |

### 3.3 Adiciona variáveis de ambiente

Clica em **Advanced** → **Add Environment Variable** pra cada uma:

#### Banco + Redis
```
DATABASE_URL=postgresql://postgres.xxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
REDIS_URL=redis://default:SUA_SENHA@us1-xxxxx.upstash.io:6379
```

#### Aplicação
```
NODE_ENV=production
PORT=3001
APP_URL=https://nextgenassets.com.br
API_URL=https://api.nextgenassets.com.br
WIDGET_URL=https://widget.nextgenassets.com.br
CORS_ORIGINS=https://nextgenassets.com.br,https://www.nextgenassets.com.br,https://admin.nextgenassets.com.br,https://painel.nextgenassets.com.br,https://app.nextgenassets.com.br
```

#### JWT
```
JWT_SECRET=clica-no-botao-Generate
JWT_REFRESH_SECRET=clica-no-botao-Generate
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

> 💡 No campo de valor, clica em **Generate** pra Render criar valores aleatórios fortes.

#### OpenAI (pega em platform.openai.com)
```
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini
AI_CONFIDENCE_THRESHOLD=0.7
```

#### Anthropic (pega em console.anthropic.com)
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-haiku-4-5
```

#### Efí Bank (Open Finance + ITP)
```
EFI_API_URL=https://api-hml.efi.com.br/v1
EFI_CLIENT_ID=Client_Id_xxxxx
EFI_CLIENT_SECRET=Client_Secret_xxxxx
EFI_PIX_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EFI_SANDBOX=true
EFI_CERTIFICATE_BASE64=conteudo-em-base64-do-certificado
```

**Como gerar o base64 do certificado:**
```bash
# Mac
base64 -i ~/caminho/certificado-efi.p12 | tr -d '\n' | pbcopy

# Linux
base64 -i ~/caminho/certificado-efi.p12 | tr -d '\n' | xclip -selection clipboard
```

#### Woovi (Pix + Subcontas)
```
WOOVI_API_URL=https://api.woovi.com/v1
WOOVI_APP_ID=app_xxxxx
WOOVI_API_KEY=xxxxx
WOOVI_SANDBOX=true
```

#### WhatsApp (Z-API)
```
WHATSAPP_PROVIDER=zapi
WHATSAPP_API_URL=https://api.z-api.io
WHATSAPP_INSTANCE_ID=xxxxx
WHATSAPP_TOKEN=xxxxx
```

#### Outros
```
BULL_PREFIX=nga
SENTRY_DSN=
LOG_LEVEL=info
```

### 3.4 Configura health check
- **Health Check Path:** `/health`

### 3.5 Clica em **Create Web Service**

Vai aparecer os logs em tempo real. Build demora 5-10min.

---

## 4️⃣ Domínio customizado no Render (5min)

### 4.1 Adiciona domínio
1. No painel do serviço → **Settings** → **Custom Domains**
2. Clica em **+ Add Custom Domain**
3. Digita: `api.nextgenassets.com.br`
4. Clica em **Save**
5. Render vai mostrar o **CNAME** que você precisa configurar

Exemplo: `nga-api.onrender.com`

### 4.2 Configura DNS

**Se seu domínio tá no Cloudflare:**
| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `api` | `nga-api.onrender.com` | **DNS only** (cinza) |

**Se tá no Registro.br:**
| Tipo | Nome | Valor |
|---|---|---|
| CNAME | `api.nextgenassets.com.br` | `nga-api.onrender.com` |

> ⚠️ **Proxy do Cloudflare tem que estar DESLIGADO** (cinza) pro subdomínio `api` — senão quebra o SSL do Render.

### 4.3 Espera propagar
- DNS: 5-30 min
- SSL do Render: até 1h

### 4.4 Testa
```bash
curl https://api.nextgenassets.com.br/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "nextgen-assets-api",
  "version": "1.0.0",
  "timestamp": "2026-06-07T19:00:00.000Z"
}
```

---

## 5️⃣ DNS no Cloudflare (15min) — pra todos os subdomínios

**Cloudflare é mais rápido que Registro.br** pra propagação.

### 5.1 Se seu domínio AINDA NÃO está no Cloudflare
1. Cria conta em [dash.cloudflare.com](https://dash.cloudflare.com)
2. **+ Add a site** → `nextgenassets.com.br`
3. Plano **Free**
4. Cloudflare vai te dar 2 nameservers (tipo `anna.ns.cloudflare.com` e `bob.ns.cloudflare.com`)
5. Vai no **Registro.br** → seu domínio → **DNS** → **Alterar nameservers** → cola os 2 do Cloudflare
6. Espera 1-24h propagar (geralmente 1-2h)

### 5.2 Configura os 6 subdomínios

Vai em **DNS > Records** → **+ Add record**:

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `api` | `nga-api.onrender.com` | **DNS only** (cinza) |
| CNAME | `admin` | `nga-admin.netlify.app` | **Proxied** (laranja) |
| CNAME | `painel` | `nga-partner.netlify.app` | **Proxied** (laranja) |
| CNAME | `app` | `nga-consumer.netlify.app` | **Proxied** (laranja) |
| CNAME | `www` | `nextgen-assets.netlify.app` | **Proxied** (laranja) |
| CNAME | `@` | `nextgen-assets.netlify.app` | **Proxied** (laranja) |

> ⚠️ **Importante:** `api` é o único que fica **cinza** (DNS only). Os outros podem ficar **laranja** (proxy) — Cloudflare acelera e protege.

### 5.3 SSL/TLS
1. **SSL/TLS > Overview**
2. Mode: **Full** (não "Full Strict")
3. **Edge Certificates > Always Use HTTPS:** ON

---

## 6️⃣ 4 Frontends no Netlify (30min)

### 6.1 Cria 4 sites
1. Acessa [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Conecta o GitHub → seleciona `HenriqueGuilhermeUx/nextgenassets`
3. Repete 4 vezes com essas configs:

#### Site 1: Marketing
| Campo | Valor |
|---|---|
| **Site name** | `nextgen-assets` |
| **Base directory** | `apps/marketing` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

#### Site 2: Admin
| Campo | Valor |
|---|---|
| **Site name** | `nga-admin` |
| **Base directory** | `apps/admin` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

#### Site 3: Partner
| Campo | Valor |
|---|---|
| **Site name** | `nga-partner` |
| **Base directory** | `apps/partner` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

#### Site 4: Consumer
| Campo | Valor |
|---|---|
| **Site name** | `nga-consumer` |
| **Base directory** | `apps/consumer` |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |

### 6.2 Variáveis de ambiente (cada site)

Em **Site settings > Environment variables** → **Add a variable**:

#### Comum a TODOS os 4 sites
```
NEXT_PUBLIC_API_URL=https://api.nextgenassets.com.br
```

#### Específico do Marketing
```
NEXT_PUBLIC_SITE_URL=https://nextgenassets.com.br
```

#### Específico do Admin
```
NEXT_PUBLIC_SITE_URL=https://admin.nextgenassets.com.br
```

#### Específico do Partner
```
NEXT_PUBLIC_SITE_URL=https://https://painel.nextgenassets.com.br
```

#### Específico do Consumer
```
NEXT_PUBLIC_SITE_URL=https://app.nextgenassets.com.br
```

### 6.3 Domínios customizados

Pra cada site:
1. **Domain settings > Add custom domain**
2. Adiciona o subdomínio (ex: `admin.nextgenassets.com.br`)
3. Netlify já tá esperando o CNAME (configurado no Cloudflare no passo 5.2)
4. SSL provisiona em 1-5 min

### 6.4 Testa
Acessa:
- https://nextgenassets.com.br → Marketing ✅
- https://admin.nextgenassets.com.br → Admin ✅
- https://painel.nextgenassets.com.br → Partner ✅
- https://app.nextgenassets.com.br → Consumer ✅

---

## 7️⃣ APIs externas (1-2h)

### 7.1 OpenAI (obrigatório)
1. [platform.openai.com](https://platform.openai.com) → Sign up
2. **API keys > + Create new secret key** → copia
3. **Settings > Billing > Add credit** → $5 mínimo
4. Cola no Render como `OPENAI_API_KEY`

### 7.2 Anthropic (opcional, fallback)
1. [console.anthropic.com](https://console.anthropic.com) → Sign up
2. **Settings > API Keys > Create Key** → copia
3. **Settings > Billing** → adiciona $5
4. Cola no Render como `ANTHROPIC_API_KEY`

### 7.3 Efí Bank (Open Finance)
1. [sejaefi.com.br](https://sejaefi.com.br) → Cadastrar
2. Valida email + documentos
3. Solicita **acesso sandbox** (1-2 dias úteis)
4. Gera **aplicação** com scopes `pix.read pix.write open-finance.read`
5. Copia `Client_Id`, `Client_Secret`, `Pix Key`
6. Gera certificado `.p12` (gerenciado pelo painel Efí)
7. Converte pra base64 (comando na seção 3.3 acima)
8. Cola tudo no Render

### 7.4 Woovi (Pix)
1. [woovi.com](https://woovi.com) → Cadastrar
2. **API > Suas aplicações > Criar aplicação**
3. Copia `appId` e `apiKey`
4. Cola no Render

### 7.5 Z-API (WhatsApp) — opcional
1. [z-api.io](https://z-api.io) → Assina Starter (R$ 60/mês)
2. Conecta WhatsApp (escaneia QR Code)
3. Copia **Instance ID** e **Token**
4. Cola no Render

---

## 8️⃣ Verificação final

### 8.1 Checklist de saúde
```bash
# 1. DNS propagou?
dig api.nextgenassets.com.br +short
# → deve retornar IP do Render

# 2. API respondendo?
curl https://api.nextgenassets.com.br/health
# → {"status":"ok",...}

# 3. Banco conectado?
curl https://api.nextgenassets.com.br/api/partners
# → 401 (Unauthorized) — significa que tá respondendo

# 4. Swagger funciona?
# Abre no browser: https://api.nextgenassets.com.br/api/docs

# 5. Frontends carregam?
# Abre cada subdomínio no browser

# 6. Login end-to-end?
# Acessa admin.nextgenassets.com.br
# Login: admin@nextgenassets.com.br / Admin@2026
# Se entrar no dashboard, TUDO tá conectado ✅
```

### 8.2 Monitoramento (opcional, mas recomendado)

**UptimeRobot** (grátis):
1. [uptimerobot.com](https://uptimerobot.com) → Sign up
2. **+ Add New Monitor**:
   - Type: HTTPS
   - URL: `https://api.nextgenassets.com.br/health`
   - Interval: 5 minutes
3. Adiciona alerta por email

**Sentry** (grátis):
1. [sentry.io](https://sentry.io) → Sign up
2. **Projects > Create > Node/Express**
3. Copia o DSN
4. Cola no Render como `SENTRY_DSN`

---

## 9️⃣ Custos finais

| Item | Custo/mês |
|---|---|
| Render (Starter) | **$7** |
| Supabase (Free tier) | **$0** |
| Upstash (Free tier) | **$0** |
| Netlify (4 sites Free) | **$0** |
| Cloudflare (Free) | **$0** |
| UptimeRobot (Free) | **$0** |
| Sentry (Free) | **$0** |
| OpenAI (gpt-4o-mini) | **~$5-20** |
| Anthropic (Claude) | **~$3-10** |
| WhatsApp (Z-API) | **R$ 60** |
| **TOTAL** | **~$15-40/mês (~R$ 80-220)** |

---

## 🔟 Próximos passos depois do deploy

1. ☐ Cadastrar primeiro parceiro-piloto (via admin)
2. ☐ Configurar Efí homologação (sandbox → produção: 30-60 dias)
3. ☐ Configurar Woovi produção
4. ☐ Configurar webhook de retorno da Efí pra `https://api.nextgenassets.com.br/api/webhooks/efi`
5. ☐ Testar fluxo end-to-end: criar gatilho → IA estrutura → cron monitora → Pix executa
6. ☐ Aplicar pra 1-2 clientes-piloto

---

## ✅ Checklist final

### Banco + Redis
- [ ] Supabase projeto criado em `sa-east-1`
- [ ] `DATABASE_URL` copiada
- [ ] Migrations rodadas
- [ ] Seed executado
- [ ] Upstash Redis criado em `us-east-1`
- [ ] `REDIS_URL` copiada

### API no Render
- [ ] Web Service criado com `deploy/docker/api.Dockerfile`
- [ ] 28 variáveis de ambiente configuradas
- [ ] Plan **Starter** selecionado ($7/mês)
- [ ] Build passou
- [ ] Health check respondendo
- [ ] Domínio `api.nextgenassets.com.br` configurado
- [ ] DNS CNAME no Cloudflare apontando

### DNS
- [ ] `nextgenassets.com.br` no Cloudflare
- [ ] 6 CNAMEs configurados
- [ ] SSL/TLS modo **Full**
- [ ] `api` com proxy **DESLIGADO** (cinza)
- [ ] Outros 5 com proxy **LIGADO** (laranja)

### Frontends
- [ ] 4 sites criados no Netlify
- [ ] Variáveis de ambiente configuradas em cada
- [ ] Domínios customizados em cada
- [ ] Todos os 4 sites carregando

### APIs externas
- [ ] OpenAI: $5 creditado + key no Render
- [ ] Anthropic (opcional): $5 creditado + key no Render
- [ ] Efí (sandbox): credenciais + cert no Render
- [ ] Woovi (sandbox): credenciais no Render
- [ ] Z-API (opcional): instance + token no Render

### Monitoramento
- [ ] UptimeRobot monitorando `/health`
- [ ] Sentry capturando erros (opcional)

### Verificação
- [ ] Login no admin funciona
- [ ] Cadastrar parceiro de teste
- [ ] Criar gatilho de teste
- [ ] Ver execução rodar

---

**Bora pro Render! Se travar em algum passo, me chama.** 🚀
