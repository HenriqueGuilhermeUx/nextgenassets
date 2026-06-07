# DEPLOY-FINAL.md — Stack Definitiva NextGen Assets

> **Railway (API + Postgres + Redis) + Netlify (4 frontends) + Cloudflare (DNS)**
> Um único documento. Do zero ao 100% em produção. Custo: ~$15-40/mês (~R$ 80-220).

---

## 📋 Índice

1. [Visão geral](#1-visão-geral)
2. [Contas a criar (15min)](#2-contas-a-criar-15min)
3. [Banco + Redis (Railway)](#3-banco--redis-railway)
4. [API NestJS (Railway)](#4-api-nestjs-railway)
5. [DNS + Domínio (Cloudflare)](#5-dns--domínio-cloudflare)
6. [4 Frontends (Netlify)](#6-4-frontends-netlify)
7. [APIs externas (chaves)](#7-apis-externas-chaves)
8. [Verificação final](#8-verificação-final)
9. [Operação contínua](#9-operação-contínua)
10. [Custos e upgrade](#10-custos-e-upgrade)

---

## 1. Visão geral

### 1.1 Componentes

| Componente | Plataforma | URL final |
|---|---|---|
| **Site público** (Marketing) | Netlify | `https://nextgenassets.com.br` |
| **Painel admin** | Netlify | `https://admin.nextgenassets.com.br` |
| **Portal parceiro** | Netlify | `https://painel.nextgenassets.com.br` |
| **App consumidor** | Netlify | `https://app.nextgenassets.com.br` |
| **API REST** | Railway | `https://api.nextgenassets.com.br` |
| **PostgreSQL** | Railway (managed) | interno (privado) |
| **Redis** | Railway (managed) | interno (privado) |
| **DNS** | Cloudflare | — |

### 1.2 Conta de tudo que você precisa

| Plataforma | URL | Custo |
|---|---|---|
| **GitHub** | [github.com](https://github.com) | Grátis |
| **Railway** | [railway.app](https://railway.app) | $5/mês |
| **Netlify** | [app.netlify.com](https://app.netlify.com) | Grátis |
| **Cloudflare** | [cloudflare.com](https://cloudflare.com) | Grátis |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | Pay-as-go |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | Pay-as-go |
| **Efí Bank** | [sejaefi.com.br](https://sejaefi.com.br) | Grátis sandbox |
| **Woovi** | [woovi.com](https://woovi.com) | Grátis sandbox |
| **Z-API** (WhatsApp) | [z-api.io](https://z-api.io) | R$ 60/mês |
| **Sentry** | [sentry.io](https://sentry.io) | Grátis |
| **UptimeRobot** | [uptimerobot.com](https://uptimerobot.com) | Grátis |

**Total:** 11 contas, sendo 8 grátis e 3 pagas (Railway $5, OpenAI ~$5-20, Z-API R$60).

---

## 2. Contas a criar (15min)

### 2.1 Ordem de criação
1. **GitHub** (se não tem) → põe o código do `/workspace/orkest` lá
2. **Railway** → login com GitHub
3. **Netlify** → login com GitHub
4. **Cloudflare** → adiciona o domínio `nextgenassets.com.br`
5. **OpenAI** → gera API key + deposita $5
6. **Anthropic** → gera API key
7. **Efí** → cria conta + solicita acesso sandbox
8. **Woovi** → cria conta sandbox
9. **Z-API** → assina Starter (R$60/mês)
10. **Sentry** → cria projeto Node
11. **UptimeRobot** → adiciona monitor

### 2.2 Código no GitHub
```bash
cd /workspace/orkest
git init
git add .
git commit -m "Initial commit - NextGen Assets"
git branch -M main
git remote add origin https://github.com/SEU_USER/nextgen-assets.git
git push -u origin main
```

---

## 3. Banco + Redis (Railway)

### 3.1 Cria projeto no Railway
1. [railway.app/dashboard](https://railway.app/dashboard)
2. **New Project** → **Provision PostgreSQL**
3. Aguarda provisionar (~30s)
4. Clica no card do Postgres → **Variables** → copia `DATABASE_URL`

### 3.2 Adiciona Redis
1. Mesmo projeto → **+ New** → **Database** → **Provision Redis**
2. Aguarda provisionar
3. Clica no card do Redis → **Variables** → copia `REDIS_URL`

### 3.3 Schema do banco
**Você tem 2 opções pra rodar as migrations:**

#### Opção A — Local (recomendado, mais rápido)
```bash
# No seu computador, com DATABASE_URL do Railway
export DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"
cd /workspace/orkest/apps/api
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

#### Opção B — Via Railway Shell
1. No card do Postgres → **Data** → **Query**
2. Cola o conteúdo de `prisma/migrations/0_init/migration.sql`
3. Roda

### 3.4 Custos Railway (Hobby plan)
- **$5/mês** inclui:
  - 1 Web Service
  - 1 PostgreSQL
  - 1 Redis
  - 500h de execução/mês
  - 1 GB RAM
  - 1 GB disco
  - Tráfego ilimitado

> 💡 Quando crescer (>500h/mês ou >1GB), upgrade automático pra **Developer Plan** ($10/mês) ou **Team Plan** ($20/mês).

---

## 4. API NestJS (Railway)

### 4.1 Prepara o Dockerfile
O arquivo `/workspace/orkest/deploy/docker/api.Dockerfile` já existe. Confirma que tem:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copia package files do monorepo
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages ./packages
RUN npm ci --legacy-peer-deps

# Copia código do backend
COPY apps/api ./apps/api
COPY tsconfig*.json ./

# Build
RUN cd apps/api && npm run build

# Verifica Prisma
RUN cd apps/api && npx prisma generate

# Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copia artefatos
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

# Roda migrations + inicia
CMD ["sh", "-c", "npx --prefix apps/api prisma migrate deploy && node apps/api/dist/main.js"]
```

### 4.2 Ajusta o `main.ts` pra produção
Arquivo `apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORS
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-NGA-Signature'],
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Health check
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'nextgen-assets-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  Logger.log(`🚀 NextGen Assets API running on port ${port}`, 'Bootstrap');
  Logger.log(`📊 Environment: ${process.env.NODE_ENV}`, 'Bootstrap');
  Logger.log(`🌐 CORS origins: ${corsOrigins.join(', ')}`, 'Bootstrap');
}
bootstrap();
```

### 4.3 Cria o `railway.json` (configuração)
Arquivo `/workspace/orkest/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "deploy/docker/api.Dockerfile"
  },
  "deploy": {
    "startCommand": "node apps/api/dist/main.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4.4 Cria o Web Service no Railway
1. Mesmo projeto → **+ New** → **GitHub Repo**
2. Seleciona `nextgen-assets`
3. Railway detecta o Dockerfile automaticamente
4. Clica no card do **novo serviço**
5. **Settings**:
   - **Name:** `nga-api`
   - **Region:** `us-east-1` ou `us-west-1` (escolhe o mais perto do Supabase que tá em SP)
   - **Branch:** `main`
6. **Variables** (clica em **+ New Variable**):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `APP_URL` | `https://nextgenassets.com.br` |
| `API_URL` | `https://api.nextgenassets.com.br` |
| `WIDGET_URL` | `https://widget.nextgenassets.com.br` |
| `CORS_ORIGINS` | `https://nextgenassets.com.br,https://www.nextgenassets.com.br,https://admin.nextgenassets.com.br,https://painel.nextgenassets.com.br,https://app.nextgenassets.com.br` |
| `DATABASE_URL` | *(Reference variable → Postgres → DATABASE_URL)* |
| `REDIS_URL` | *(Reference variable → Redis → REDIS_URL)* |
| `JWT_SECRET` | *(Generate)* |
| `JWT_REFRESH_SECRET` | *(Generate)* |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `OPENAI_API_KEY` | `sk-proj-xxxxx` |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `AI_CONFIDENCE_THRESHOLD` | `0.7` |
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx` |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` |
| `EFI_API_URL` | `https://api.efi.com.br/v1` |
| `EFI_CLIENT_ID` | `Client_Id_xxxxx` |
| `EFI_CLIENT_SECRET` | `Client_Secret_xxxxx` |
| `EFI_PIX_KEY` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `EFI_CERTIFICATE_BASE64` | *(base64 do .p12)* |
| `WOOVI_API_URL` | `https://api.woovi.com/v1` |
| `WOOVI_APP_ID` | `app_xxxxx` |
| `WOOVI_API_KEY` | `xxxxx` |
| `WHATSAPP_PROVIDER` | `zapi` |
| `WHATSAPP_API_URL` | `https://api.z-api.io` |
| `WHATSAPP_INSTANCE_ID` | `xxxxx` |
| `WHATSAPP_TOKEN` | `xxxxx` |
| `BULL_PREFIX` | `nga` |
| `SENTRY_DSN` | `https://xxxxx@sentry.io/xxxxx` |

> 💡 **Dica:** Railway tem **Reference Variables** — clica em "Reference Variable" e aponta pra `DATABASE_URL` e `REDIS_URL` dos outros serviços. Atualiza automático se mudar.

### 4.5 Como referenciar variáveis no Railway
Em vez de digitar o valor, clica em **+ New Variable** → **Add Reference**:
- Seleciona o serviço **Postgres**
- Seleciona a variável **`DATABASE_URL`**
- Pronto, vai puxar automaticamente

### 4.6 Trigger deploy
1. Clica em **Deploy** (ou espera o auto-deploy)
2. Acompanhe em **Build Logs** e **Deploy Logs**
3. Quando terminar, vai aparecer a URL provisória: `https://nga-api-production-xxxx.up.railway.app`

### 4.7 Domínio customizado
1. Clica no serviço → **Settings** → **Domains** → **+ Custom Domain**
2. Digita: `api.nextgenassets.com.br`
3. Railway vai dar o CNAME target

---

## 5. DNS + Domínio (Cloudflare)

### 5.1 Adiciona domínio ao Cloudflare
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **+ Add Site**
2. Digita `nextgenassets.com.br`
3. Escolhe plano **Free**
4. Cloudflare vai pedir pra mudar nameservers no Registro.br
5. Vai no Registro.br → **Domínios** → **DNS** → **Alterar nameservers**:
   - `anna.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`
   - *(Cloudflare mostra os corretos)*
6. Espera 1-24h propagar (geralmente 1-2h)

### 5.2 Configura registros DNS

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| **CNAME** | `api` | `nga-api-production.up.railway.app` (o target do Railway) | **DNS only** (cinza) |
| **CNAME** | `admin` | `nga-admin.netlify.app` | **Proxied** (laranja) |
| **CNAME** | `painel` | `nga-partner.netlify.app` | **Proxied** (laranja) |
| **CNAME** | `app` | `nga-consumer.netlify.app` | **Proxied** (laranja) |
| **CNAME** | `www` | `nextgen-assets.netlify.app` | **Proxied** (laranja) |
| **CNAME** | `@` (raiz) | `nextgen-assets.netlify.app` | **Proxied** (laranja) |

> ⚠️ **`api` precisa ficar com proxy DESLIGADO** (cinza) porque o Railway já gerencia SSL. Os outros podem ficar com proxy LIGADO (laranja) — Cloudflare acelera + protege.

### 5.3 SSL/TLS
1. Cloudflare > **SSL/TLS** → **Overview**
2. Mode: **Full** (não "Full Strict" porque Railway e Netlify têm seus próprios SSLs)
3. **Edge Certificates** → ativa **Always Use HTTPS** ✅

---

## 6. 4 Frontends (Netlify)

### 6.1 Prepara os `netlify.toml`
Cria esses 4 arquivos:

#### `apps/marketing/netlify.toml`
```toml
[build]
  base    = "apps/marketing"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### `apps/admin/netlify.toml`
```toml
[build]
  base    = "apps/admin"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### `apps/partner/netlify.toml`
```toml
[build]
  base    = "apps/partner"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### `apps/consumer/netlify.toml`
```toml
[build]
  base    = "apps/consumer"
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 6.2 Ajusta `next.config.js` de cada app
Cada `apps/*/next.config.js` deve ter:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // CRÍTICO pro Netlify
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` },
    ];
  },
};
module.exports = nextConfig;
```

### 6.3 Cria 4 sites no Netlify

**Pra cada um, repete:**

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Seleciona o repo `nextgen-assets`
3. Configura:

| Site | Site name | Base directory | Build command | Publish |
|---|---|---|---|---|
| Marketing | `nextgen-assets` | `apps/marketing` | `npm run build` | `.next` |
| Admin | `nga-admin` | `apps/admin` | `npm run build` | `.next` |
| Partner | `nga-partner` | `apps/partner` | `npm run build` | `.next` |
| Consumer | `nga-consumer` | `apps/consumer` | `npm run build` | `.next` |

### 6.4 Variáveis de ambiente (Netlify)

Em **Site settings > Environment variables**, adiciona:

**Comum a TODOS:**
| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.nextgenassets.com.br` |

**Específico Marketing:**
| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nextgenassets.com.br` |

**Específico Admin:**
| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://admin.nextgenassets.com.br` |

**Específico Partner:**
| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://painel.nextgenassets.com.br` |

**Específico Consumer:**
| Key | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://app.nextgenassets.com.br` |

### 6.5 Domínios customizados (Netlify)
Pra cada site:
1. **Domain settings** → **Add custom domain**
2. Adiciona o subdomínio (ex: `admin.nextgenassets.com.br`)
3. Netlify já tá esperando o CNAME (que você configurou no Cloudflare no passo 5.2)
4. SSL provisiona automaticamente (1-5 min)

### 6.6 Testa
- https://nextgenassets.com.br → Marketing ✅
- https://admin.nextgenassets.com.br → Admin ✅
- https://painel.nextgenassets.com.br → Partner ✅
- https://app.nextgenassets.com.br → Consumer ✅

---

## 7. APIs externas (chaves)

### 7.1 OpenAI ($5 mínimo)
1. [platform.openai.com](https://platform.openai.com) → Sign up
2. **API keys** → **+ Create new secret key**
3. Nome: `nga-production`
4. Copia: `sk-proj-xxxxx`
5. **Settings > Billing** → adiciona cartão → **Add credit** ($5 mínimo)
6. Cola no Railway como `OPENAI_API_KEY`

### 7.2 Anthropic ($5 mínimo)
1. [console.anthropic.com](https://console.anthropic.com) → Sign up
2. **Settings > API Keys** → **Create Key**
3. Copia: `sk-ant-xxxxx`
4. **Settings > Billing** → adiciona crédito
5. Cola no Railway como `ANTHROPIC_API_KEY`

### 7.3 Efí Bank
1. [sejaefi.com.br](https://sejaefi.com.br) → **Criar conta**
2. Valida email + CPF/CNPJ + selfie
3. Aguarda aprovação (1-2 dias úteis)
4. **API > Criar aplicação**:
   - Nome: `NextGen Assets`
   - Scope: `pix.read pix.write open-finance.read`
5. Copia: `Client_Id`, `Client_Secret`, `Pix Key`
6. Upload do certificado `.p12` (gerado na sua conta Efí)
7. Converte pra base64:
   ```bash
   base64 -i certificado.p12 | tr -d '\n' | pbcopy   # Mac
   base64 -i certificado.p12 | tr -d '\n' | xclip    # Linux
   ```
8. Cola no Railway como `EFI_CERTIFICATE_BASE64`

> 💡 **Pra piloto:** Efí sandbox (`https://api-hml.efi.com.br/v1`) é grátis. Pra produção, precisa homologar (30-60 dias).

### 7.4 Woovi
1. [woovi.com](https://woovi.com) → **Cadastrar**
2. **API > Suas aplicações** → **Criar aplicação**
3. Copia: `appId` e `apiKey`
4. Cola no Railway como `WOOVI_APP_ID` e `WOOVI_API_KEY`

### 7.5 Z-API (WhatsApp)
1. [z-api.io](https://z-api.io) → Assina **Starter** (R$ 60/mês)
2. Conecta teu número de WhatsApp (escaneia QR)
3. **Instâncias** → copia **ID** e **Token**
4. Cola no Railway como `WHATSAPP_INSTANCE_ID` e `WHATSAPP_TOKEN`

### 7.6 Sentry (grátis)
1. [sentry.io](https://sentry.io) → Sign up
2. **Projects > Create > Node/Express**
3. Copia o DSN
4. Cola no Railway como `SENTRY_DSN`

---

## 8. Verificação final

### 8.1 Checklist de saúde (em ordem)

```bash
# 1. DNS propagou?
dig api.nextgenassets.com.br +short
# → deve retornar IP do Railway

# 2. SSL do Railway OK?
curl -I https://api.nextgenassets.com.br/health
# → HTTP/2 200

# 3. Health check responde?
curl https://api.nextgenassets.com.br/health
# → {"status":"ok","service":"nextgen-assets-api",...}

# 4. Banco conectado?
curl https://api.nextgenassets.com.br/api/partners
# → 401 (Unauthorized) — significa que tá respondendo, só não tem token

# 5. Swagger funciona?
# Acessa no browser: https://api.nextgenassets.com.br/api/docs
# → Documentação interativa carrega

# 6. Frontends carregam?
# Abre cada um no browser:
#   - nextgenassets.com.br (marketing)
#   - admin.nextgenassets.com.br (admin)
#   - painel.nextgenassets.com.br (partner)
#   - app.nextgenassets.com.br (consumer)

# 7. Login end-to-end?
# Acessa admin → login com admin@nextgenassets.com.br / Admin@2026
# Se entrar no dashboard, TUDO tá conectado

# 8. CORS tá liberado?
# No DevTools (F12) > Network > tenta qualquer ação
# Se não aparecer erro de CORS, tá OK
```

### 8.2 UptimeRobot
Configura monitor:
- **Tipo:** HTTPS
- **URL:** `https://api.nextgenassets.com.br/health`
- **Intervalo:** 5 minutos
- **Alerta:** email + (opcional) SMS

### 8.3 Sentry
Vai em **Issues** — se tiver erro de "API key invalid" ou "CORS", vai aparecer aqui.

---

## 9. Operação contínua

### 9.1 Deploy de uma mudança
```bash
git add .
git commit -m "feat: nova feature"
git push
# Railway detecta → rebuilda API (3-5min)
# Netlify detecta → rebuilda 4 sites em paralelo (2-4min cada)
```

### 9.2 Rollback
**Railway:** Deploys > clica no deploy anterior > **Redeploy**
**Netlify:** Deploys > clica no deploy anterior > **Publish deploy**

### 9.3 Logs
**Railway:** Serviço > **Logs** (tempo real)
**Netlify:** Site > **Deploys** > log do build

### 9.4 Escalar
**Railway:** Settings > **Resources** > aumenta CPU/RAM
**Netlify:** Free aguenta até 100GB bandwidth/mês (upgrade Pro $19/mês se passar)

### 9.5 Monitoramento
- **Sentry:** erros de runtime
- **UptimeRobot:** uptime/downtime
- **Cloudflare Analytics:** tráfego
- **Railway Metrics:** CPU, RAM, requests

---

## 10. Custos e upgrade

### 10.1 Roadmap de custos

| Fase | Usuários | Custo/mês | Plano Railway |
|---|---|---|---|
| **Piloto (0-100)** | 0-100 | **$5** | Hobby |
| **MVP (100-1k)** | 100-1k | **$10-20** | Developer |
| **Growth (1k-10k)** | 1k-10k | **$50-100** | Team |
| **Scale (10k-100k)** | 10k-100k | **$200-500** | Team + réplicas |
| **Enterprise (100k+)** | 100k+ | **$1000+** | Enterprise + K8s |

### 10.2 Quando upgrade
- **Banco > 1GB** ou queries lentas → upgrade Railway
- **API > 500h/mês** (no plano Hobby) → upgrade automático
- **Mais de 1GB RAM** no service → upgrade
- **Tráfego > 100GB/mês no Netlify** → upgrade Pro

### 10.3 Backup
**Railway Postgres:** snapshots diários automáticos
**Download manual:** Railway > Postgres > **Backups** > Download

### 10.4 Cron jobs (trigger engine)
Railway tem **Cron Jobs** nativos. Pra rodar a cada minuto:
1. Clica no serviço da API
2. **Settings > Cron Schedule** (em breve)
3. OU cria um serviço worker separado com o mesmo Dockerfile mas CMD diferente:
   ```dockerfile
   CMD ["sh", "-c", "node apps/api/dist/workers/trigger-cron.js"]
   ```
4. Custo: +$5/mês (serviço extra)

> 💡 **Alternativa grátis:** cron job externo ([cron-job.org](https://cron-job.org)) que chama `/api/internal/cron/tick` a cada minuto.

---

## ✅ Checklist final (tudo numa página)

### Banco + Redis
- [ ] Conta Railway criada
- [ ] Projeto criado
- [ ] PostgreSQL provisionado
- [ ] Redis provisionado
- [ ] Migrations rodadas
- [ ] Seed executado

### API
- [ ] Código no GitHub
- [ ] `Dockerfile` e `railway.json` commitados
- [ ] Web Service criado
- [ ] 28 variáveis de ambiente configuradas
- [ ] Build passou
- [ ] Deploy OK
- [ ] Health check respondendo
- [ ] Domínio `api.nextgenassets.com.br` configurado
- [ ] DNS no Cloudflare apontando

### Domínio
- [ ] `nextgenassets.com.br` adicionado ao Cloudflare
- [ ] Nameservers trocados no Registro.br
- [ ] 6 registros CNAME configurados
- [ ] SSL/TLS em modo "Full"

### Frontends
- [ ] 4 `netlify.toml` commitados
- [ ] 4 sites criados no Netlify
- [ ] Variáveis de ambiente configuradas
- [ ] Builds passaram
- [ ] 4 domínios customizados configurados
- [ ] Todos os 4 sites carregando

### APIs externas
- [ ] OpenAI: $5 de crédito + key no Railway
- [ ] Anthropic: $5 de crédito + key no Railway
- [ ] Efí: sandbox + credenciais no Railway
- [ ] Woovi: sandbox + credenciais no Railway
- [ ] Z-API: instância ativa + credenciais no Railway
- [ ] Sentry: DSN no Railway

### Monitoramento
- [ ] UptimeRobot monitorando `/health`
- [ ] Sentry capturando erros
- [ ] Cloudflare Analytics ativo
- [ ] Railway Metrics visível

### Verificação final
- [ ] Login no admin funciona
- [ ] Login no partner funciona
- [ ] Cadastrar um parceiro de teste
- [ ] Criar um gatilho de teste
- [ ] Ver execução rodar end-to-end
- [ ] Webhook Efí recebido e processado

---

## 🎉 Pronto pra produção

Quando tudo isso tiver OK, você tem:

✅ API rodando em `https://api.nextgenassets.com.br` (Railway)
✅ Banco PostgreSQL gerenciado (Railway)
✅ Redis gerenciado (Railway)
✅ 4 sites no ar nos subdomínios (Netlify)
✅ DNS proxyado e protegido (Cloudflare)
✅ SSL em tudo (auto-renovação)
✅ Monitoramento 24/7 (Sentry + UptimeRobot)
✅ Auto-deploy em cada `git push`
✅ Custo: **~$5-40/mês** (~R$ 30-220)

**Bora?** 🚀
