# DEPLOY-GUIDE.md — Deploy Completo NextGen Assets

> **Stack:** Render (API) + Netlify (Frontends) + Supabase (PostgreSQL) + Firebase (Auth + Storage) + Cloudflare (DNS) + Upstash (Redis)
>
> Domínio: `nextgenassets.com.br`

---

## 🎯 Decisão importante sobre "SQL Firebase"

**Firebase puro NÃO tem SQL.** O que o Google chama de "Firebase" tem 2 produtos principais:

| Produto | Tipo | Funciona com Prisma? | Custo inicial |
|---|---|---|---|
| **Firestore** | NoSQL (documentos) | ❌ Não — Prisma é só SQL | Grátis até 1GB |
| **Cloud SQL for PostgreSQL** | SQL | ✅ Sim, Prisma conecta direto | ~$10/mês |
| **Firebase Auth + Firestore** | NoSQL | ❌ Não | Grátis até 10k usuários |
| **Firebase Auth + Cloud SQL** | SQL | ✅ Sim | ~$10/mês |

### 🚀 Recomendação: **Supabase** (melhor dos dois mundos)

**Por quê Supabase:**
- ✅ **PostgreSQL gerenciado** (igual o que o código já usa)
- ✅ **Auth** tipo Firebase (email, OAuth, magic link)
- ✅ **Storage** tipo Firebase Storage
- ✅ **Realtime** (subscriptions tipo Firestore)
- ✅ **REST + GraphQL automático** (gera API do banco)
- ✅ **Free tier generoso** (500 MB, 50k MAU)
- ✅ **Sai do Google** (Postgres open source, sem vendor lock-in)
- ✅ **Compatível com Prisma** sem mudar nada no código

> 💡 **TL;DR:** Mantém o código como tá (Prisma + PostgreSQL), aponta pro Supabase. Se quiser usar **Firebase Auth** de fato, dá pra integrar via JWT.

### Tabela de decisão

| Se você quer... | Use |
|---|---|
| **SQL puro, igual o código já espera** | **Supabase** ✅ (recomendado) |
| **Firebase de verdade (NoSQL)** | Migrar schema inteiro (3-4 semanas de trabalho) |
| **Cloud SQL no Google** | Cloud SQL for PostgreSQL + Firebase Auth (custo ~$15/mês) |
| **Postgres na AWS** | RDS PostgreSQL + Firebase Auth (custo ~$15/mês) |

---

## 📐 Arquitetura final recomendada

```
                        ┌──────────────────────┐
                        │   SEU DOMÍNIO        │
                        │ nextgenassets.com.br │
                        └──────────┬───────────┘
                                   │ DNS (Cloudflare)
                                   ↓
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ↓                          ↓                          ↓
┌───────────────┐         ┌─────────────────┐         ┌──────────────┐
│  NETLIFY      │         │  NETLIFY        │         │  NETLIFY     │
│  Marketing    │         │  Admin          │         │  Partner +   │
│  (3000)       │         │  (3002)         │         │  Consumer    │
│  nextgen...   │         │  admin.nextgen  │         │  (3003/3004) │
└───────┬───────┘         └────────┬────────┘         └──────┬───────┘
        │                           │                         │
        └───────────────────────────┼─────────────────────────┘
                                    │ HTTPS
                                    ↓
                        ┌───────────────────────┐
                        │      RENDER           │
                        │  NestJS API (3001)    │
                        │  api.nextgenassets... │
                        │  Web Service          │
                        └───────────┬───────────┘
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        │                           │                            │
        ↓                           ↓                            ↓
┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  SUPABASE    │         │  UPSTASH REDIS   │         │  FIREBASE        │
│  PostgreSQL  │         │  (serverless)    │         │  Auth + Storage  │
│  (Prisma)    │         │  Cache + BullMQ  │         │  (opcional)      │
└──────────────┘         └──────────────────┘         └──────────────────┘
        ↑                           ↑                            ↑
        └───────────────┬───────────┘                            │
                        │                                          │
                ┌───────┴────────┐                                 │
                │  APIs Externas │←────────────────────────────────┘
                │  • OpenAI      │  (webhooks Firebase → Render)
                │  • Efí Bank    │
                │  • Woovi       │
                │  • WhatsApp    │
                └────────────────┘
```

---

## 💰 Custos estimados (por mês)

| Serviço | Free Tier | Custo produção |
|---|---|---|
| **Render** | 750h/mês free (Web Service) | **$7/mês** (Starter) |
| **Netlify** | 100 GB bandwidth, 300 build min | **Grátis** (até 100k visitas) |
| **Supabase** | 500 MB, 50k MAU | **$25/mês** (Pro) ou grátis no piloto |
| **Upstash Redis** | 10k comandos/dia | **$0.20/mês** (Pay-as-you-go) |
| **Cloudflare DNS** | Ilimitado | **Grátis** |
| **Total** | **$0/mês** (piloto) | **~$33/mês** (produção pequena) |

---

## 🛠️ Como vamos deployar (ordem)

1. **Banco (Supabase)** — primeiro, pra ter a `DATABASE_URL`
2. **Redis (Upstash)** — segundo, pra fila assíncrona
3. **API (Render)** — backend NestJS
4. **Frontends (Netlify)** — 4 apps Next.js
5. **DNS (Cloudflare)** — aponta domínios
6. **Webhook Efí** — aponta pra URL do Render
7. **Verificação final** — tudo funcionando

Vamos por cada um. 📖
