# DEPLOY-RENDER.md — Backend NestJS no Render

> **Como fazer deploy da API NextGen Assets no Render.com — do zero ao produção.**

---

## 0. Por que Render

| Vantagem | Detalhe |
|---|---|
| **Free tier generoso** | 750h/mês, suficiente pra piloto |
| **Docker nativo** | Usa nosso Dockerfile direto |
| **Auto-deploy via Git** | Conecta o GitHub, push = deploy |
| **SSL grátis** | Let's Encrypt automático |
| **Custom domain** | Liga `api.nextgenassets.com.br` em 2 cliques |
| **$7/mês no Starter** | Sem sleep, 512 MB RAM, 0.5 CPU |

---

## 1. Pré-requisitos

- [ ] Conta no GitHub com o código do projeto
- [ ] Conta no Render (criar com GitHub: [render.com](https://render.com))
- [ ] Supabase configurado (DEPLOY-DATABASE.md) com `DATABASE_URL`
- [ ] Upstash configurado (DEPLOY-DATABASE.md) com `REDIS_URL`
- [ ] Domínio `nextgenassets.com.br` no Registro.br (ou Cloudflare)

---

## 2. Prepara o repositório

### 2.1 Sobe o código pro GitHub

**Se ainda não tem repo:**
```bash
cd /workspace/orkest
git init
git add .
git commit -m "Initial commit - NextGen Assets"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/nextgen-assets.git
git push -u origin main
```

**Se já tem repo:**
```bash
cd /workspace/orkest
git add .
git commit -m "feat: ready for Render deploy"
git push
```

### 2.2 Cria o `render.yaml` (Infrastructure as Code)

Cria `/workspace/orkest/render.yaml`:
```yaml
services:
  # ============================================
  # API NestJS
  # ============================================
  - type: web
    name: nga-api
    runtime: docker
    dockerfilePath: ./deploy/docker/api.Dockerfile
    dockerContext: .
    plan: starter
    region: oregon
    branch: main
    autoDeploy: true
    healthCheckPath: /health
    envVars:
      # === Banco (Supabase) ===
      - key: DATABASE_URL
        sync: false  # você coloca manual no painel
      # === Redis (Upstash) ===
      - key: REDIS_URL
        sync: false
      # === Aplicação ===
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      # === Domínios ===
      - key: APP_URL
        value: https://nextgenassets.com.br
      - key: API_URL
        value: https://api.nextgenassets.com.br
      - key: WIDGET_URL
        value: https://widget.nextgenassets.com.br
      # === JWT ===
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 15m
      - key: JWT_REFRESH_EXPIRES_IN
        value: 7d
      # === OpenAI ===
      - key: OPENAI_API_KEY
        sync: false
      - key: OPENAI_MODEL
        value: gpt-4o-mini
      # === Anthropic (fallback) ===
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: ANTHROPIC_MODEL
        value: claude-haiku-4-5
      # === Efí Bank ===
      - key: EFI_CLIENT_ID
        sync: false
      - key: EFI_CLIENT_SECRET
        sync: false
      - key: EFI_PIX_KEY
        sync: false
      - key: EFI_CERTIFICATE_BASE64
        sync: false  # certificado em base64
      - key: EFI_API_URL
        value: https://api.efi.com.br/v1
      # === Woovi ===
      - key: WOOVI_APP_ID
        sync: false
      - key: WOOVI_API_KEY
        sync: false
      - key: WOOVI_API_URL
        value: https://api.woovi.com/v1
      # === WhatsApp ===
      - key: WHATSAPP_PROVIDER
        value: zapi
      - key: WHATSAPP_API_URL
        value: https://api.z-api.io
      - key: WHATSAPP_INSTANCE_ID
        sync: false
      - key: WHATSAPP_TOKEN
        sync: false
      # === CORS ===
      - key: CORS_ORIGINS
        value: https://nextgenassets.com.br,https://www.nextgenassets.com.br,https://admin.nextgenassets.com.br,https://painel.nextgenassets.com.br,https://app.nextgenassets.com.br
      # === BullMQ ===
      - key: BULL_PREFIX
        value: nga
```

> 💡 **`sync: false`** significa que você vai preencher manualmente no painel (mais seguro pra secrets).
> **`generateValue: true`** faz o Render gerar um valor aleatório (bom pra JWT_SECRET).
> **`value: "..."`** é valor fixo.

### 2.3 Cria o `Dockerfile` de produção

Já existe em `/workspace/orkest/deploy/docker/api.Dockerfile`. Confirma que tem:

```dockerfile
# /workspace/orkest/deploy/docker/api.Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages ./packages
RUN npm ci
COPY apps/api ./apps/api
RUN cd apps/api && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

### 2.4 Atualiza o `main.ts` pra escutar em `0.0.0.0`

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 NextGen Assets API running on port ${port}`);
}
bootstrap();
```

### 2.5 Commit + push
```bash
git add .
git commit -m "feat: add Render deployment config"
git push
```

---

## 3. Cria o Web Service no Render

### 3.1 Conecta o GitHub
1. Acessa [dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Web Service**
3. **Connect a repository** → seleciona `nextgen-assets`
4. **Branch:** `main`

### 3.2 Configura o serviço

| Campo | Valor |
|---|---|
| **Name** | `nga-api` |
| **Region** | Oregon (US West) — mais barato que SP |
| **Branch** | `main` |
| **Runtime** | `Docker` |
| **Dockerfile Path** | `./deploy/docker/api.Dockerfile` |
| **Docker Context** | `.` (raiz) |
| **Plan** | **Starter** ($7/mês) ou **Free** (sleep após 15min inativo) |

### 3.3 Adiciona variáveis de ambiente (Secrets)

Em **Environment > Environment Variables**, clica em **Add Environment Variable**:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres?sslmode=require` |
| `REDIS_URL` | `redis://default:xxx@xxx.upstash.io:6379` |
| `OPENAI_API_KEY` | `sk-proj-xxxxx` |
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx` |
| `EFI_CLIENT_ID` | `Client_Id_xxxxx` |
| `EFI_CLIENT_SECRET` | `Client_Secret_xxxxx` |
| `EFI_PIX_KEY` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `EFI_CERTIFICATE_BASE64` | *(base64 do .p12 — veja abaixo)* |
| `WOOVI_APP_ID` | `app_xxxxx` |
| `WOOVI_API_KEY` | `xxxxx` |
| `WHATSAPP_INSTANCE_ID` | `xxxxx` |
| `WHATSAPP_TOKEN` | `xxxxx` |

> ⚠️ **Pra certificados Efí (.p12)**: converte pra base64 e cola:
> ```bash
> base64 -i certificado-efi.p12 | tr -d '\n' > cert-base64.txt
> # Copia o conteúdo do cert-base64.txt e cola no EFI_CERTIFICATE_BASE64
> ```

### 3.4 Configura health check
**Health Check Path:** `/health`

O Render vai pingar essa URL a cada 30 segundos. Se falhar 3x, reinicia o serviço.

### 3.5 Clica em **Create Web Service**
Espera 5-10 minutos pro primeiro build. Acompanhe os logs.

---

## 4. Domínio customizado

### 4.1 Adiciona o domínio
1. No painel do Render, vai em **Settings > Custom Domains**
2. **Add Custom Domain** → `api.nextgenassets.com.br`
3. Render vai te dar um **CNAME target** (ex: `nga-api.onrender.com`)

### 4.2 Configura o DNS
No **Cloudflare** (recomendado) ou Registro.br:

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| CNAME | `api` | `nga-api.onrender.com` | **DNS only** (cinza, não laranja) |

> ⚠️ **NÃO ative o proxy laranja do Cloudflare** pra `api.nextgenassets.com.br` — quebra o SSL do Render.

### 4.3 Espera propagar
DNS: 5-30 minutos
SSL do Render: até 1 hora

Quando propagar, acessa `https://api.nextgenassets.com.br/health` e deve retornar:
```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "uptime": 1234,
  "version": "1.0.0"
}
```

---

## 5. Verificação

### 5.1 Logs
No painel do Render: **Logs** → acompanha em tempo real.

Procura por:
- ✅ `🚀 NextGen Assets API running on port 3001`
- ✅ `Prisma Client initialized`
- ✅ `Redis connected`
- ✅ `OpenAI client ready`

### 5.2 Swagger
Acessa: `https://api.nextgenassets.com.br/api/docs`
- Deve aparecer a documentação interativa

### 5.3 Testa endpoint
```bash
# Health check
curl https://api.nextgenassets.com.br/health

# Lista parceiros (vai dar 401 sem token, mas o endpoint responde)
curl https://api.nextgenassets.com.br/api/partners
# → {"message":"Unauthorized","statusCode":401}
```

### 5.4 Roda migrations (se ainda não rodou)
Se você **não** rodou as migrations antes (passo 1.5 do DEPLOY-DATABASE.md), o Render vai rodar automaticamente no `CMD` do Dockerfile (`npx prisma migrate deploy`).

Pra rodar manualmente via Shell do Render:
1. Painel do Render > **Shell** (acima dos logs)
2. Executa: `npx prisma migrate deploy`
3. Executa: `npx ts-node prisma/seed.ts`

---

## 6. Atualizações futuras (CI/CD)

Render faz **auto-deploy** a cada push na branch `main`:
```bash
git add .
git commit -m "feat: nova feature"
git push origin main
# Render detecta, builda, deploya automaticamente
```

**Tempo de deploy:** 3-5 minutos.

### 6.1 Rollback
Se quebrar em produção:
1. Painel do Render > **Events**
2. Clica no deploy anterior (que funcionava)
3. **Rollback to this deploy**

---

## 7. Custos Render

| Plano | RAM | CPU | Preço | Pra quê |
|---|---|---|---|---|
| **Free** | 512 MB | 0.1 | $0 | Piloto / teste (dorme após 15min) |
| **Starter** | 512 MB | 0.5 | **$7/mês** | MVP em produção |
| **Standard** | 2 GB | 1 | $25/mês | Crescimento |
| **Pro** | 4 GB | 2 | $85/mês | 100k+ usuários |

> 💡 **Recomendação:** começa no **Free** (valida), upgrade pra **Starter** ($7/mês) quando tiver 1 cliente real.

---

## 8. Troubleshooting

### Build falhou
- **Erro de dependência:** confere que `package-lock.json` tá commitado
- **Erro de Prisma:** adiciona `RUN npx prisma generate` no Dockerfile antes do `npm run build`
- **Timeout no build:** plano Free tem timeout de 15min. Upgrade pra Starter se passar.

### API não responde
- **Health check falhando:** vai em **Shell** e roda `curl localhost:3001/health`
- **Erro 502 Bad Gateway:** logs vão mostrar (provavelmente env var faltando)

### SSL não funciona
- Espera 1 hora após adicionar domínio
- Confere DNS com `dig api.nextgenassets.com.br`
- Cloudflare proxy deve estar **DESLIGADO** (cinza) pro subdomínio `api`

### Banco não conecta
- Testa a connection string local: `psql "$DATABASE_URL" -c "SELECT 1;"`
- Confere que tem `?sslmode=require` no final da URL do Supabase

---

## ✅ Checklist

- [ ] Código commitado no GitHub
- [ ] `render.yaml` criado
- [ ] Dockerfile de produção OK
- [ ] Web Service criado no Render
- [ ] Todas as 13 variáveis de ambiente preenchidas
- [ ] Health check respondendo em `https://nga-api.onrender.com/health`
- [ ] Domínio `api.nextgenassets.com.br` configurado
- [ ] DNS apontando (CNAME)
- [ ] SSL ativo (ícone de cadeado no browser)
- [ ] Migrations rodadas
- [ ] Seed rodado
- [ ] Swagger acessível em `/api/docs`

Quando isso tudo tiver OK, **vai pro DEPLOY-NETLIFY.md** 🚀
