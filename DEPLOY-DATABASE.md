# DEPLOY-DATABASE.md — Banco de Dados (Supabase + Upstash)

> **PostgreSQL gerenciado (Supabase) + Redis serverless (Upstash).**
> Mantém o código Prisma inalterado — só troca a connection string.

---

## 1. SUPABASE (PostgreSQL)

### 1.1 Cria conta + projeto
1. Acessa [supabase.com](https://supabase.com)
2. **Sign up** com GitHub
3. **New Project**:
   - **Name:** `nextgen-assets-prod`
   - **Database Password:** gera uma forte (você vai usar pra `DATABASE_URL`)
   - **Region:** `South America (São Paulo)` ← mais perto do Brasil
   - **Plan:** Free (piloto) ou Pro ($25/mês)
4. Espera ~2 minutos pra provisionar

### 1.2 Pega as credenciais
Vai em **Settings** (⚙️) → **Database**:

| Campo | Onde usar |
|---|---|
| **Host** | `db.xxxxxxxxxxxxx.supabase.co` |
| **Database name** | `postgres` |
| **Port** | `5432` |
| **User** | `postgres` |
| **Password** | (a que você definiu) |

**Connection string completa** (em **Connection string > URI**):
```
postgresql://postgres:SUA_SENHA@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

> 💡 **IMPORTANTE:** Troque `SUA_SENHA` pela senha real. Se sua senha tem caracteres especiais (`@`, `#`, `/`), URL-encode eles.

### 1.3 Configura SSL (obrigatório pro Supabase)
Adiciona `?sslmode=require` no final:
```
postgresql://postgres:SUA_SENHA@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?sslmode=require
```

### 1.4 Onde guardar (variável de ambiente)
- **No Render:** `DATABASE_URL=postgresql://...`
- **Local (desenvolvimento):** no seu `.env` local

### 1.5 Roda as migrations
**Opção A — Pelo terminal local (recomendado):**
```bash
# Aponta pro Supabase temporariamente
export DATABASE_URL="postgresql://postgres:SUA_SENHA@db.xxxxx.supabase.co:5432/postgres?sslmode=require"

cd /workspace/orkest/apps/api
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

**Opção B — Pelo SQL Editor do Supabase:**
1. Acessa **SQL Editor** no painel
2. Cola o conteúdo de `prisma/migrations/0_init/migration.sql`
3. Roda
4. Depois roda o seed manualmente

### 1.6 Configura Row Level Security (RLS) — segurança
Vai em **Authentication > Policies** e habilita RLS nas tabelas principais:
- `User` — usuário só vê os próprios dados
- `Execution` — usuário só vê as próprias execuções
- `Partner` — só admins/orkest veem

> ⚠️ **O Prisma acessa o banco como service_role** (bypass RLS), então suas queries funcionam normais. RLS protege se alguém acessar direto via Supabase client.

### 1.7 Backups automáticos
**Free tier:** backup diário, retido 7 dias
**Pro tier:** backup diário, retido 30 dias, point-in-time recovery

Pra download manual:
- Dashboard > Database > Backups > Download

### 1.8 Limites do free tier
- **500 MB** de armazenamento (sobra pra MVP)
- **2 GB** de transferência/mês
- **50k** MAU (monthly active users) no Auth
- **Sleep mode** após 1 semana sem atividade (acorda ao receber request — delay de ~5s no primeiro hit)

> 💡 **Pro ($25/mês):** 8 GB storage, 250 GB transfer, sem sleep mode, backups 30 dias.

---

## 2. UPSTASH REDIS (Cache + Fila)

**Por que Upstash:** Redis serverless, free tier generoso, baixa latência.

### 2.1 Cria database
1. Acessa [upstash.com](https://upstash.com)
2. **Sign up** com GitHub
3. **Console > Create Database**:
   - **Name:** `nextgen-assets-redis`
   - **Type:** Regional
   - **Region:** `us-east-1` (mais barato, ou `sa-east-1` se disponível)
   - **TLS:** Enabled
4. Espera 30 segundos

### 2.2 Pega credenciais
| Campo | Valor |
|---|---|
| **Endpoint** | `xxxxx.upstash.io` |
| **Port** | `6379` |
| **Password** | (gera automaticamente) |

**Connection string:**
```
redis://default:SUA_SENHA@xxxxx.upstash.io:6379
```

### 2.3 Onde guardar
- **No Render:** `REDIS_URL=redis://default:...`

### 2.4 Limites do free tier
- **10.000 comandos/dia** (sobra pro piloto)
- **256 MB** de armazenamento
- **1** database por conta

---

## 3. FIREBASE (opcional — só pra Auth/Storage)

Se quiser usar **Firebase Authentication** (em vez do JWT que o NestJS gera), aqui vai como integrar.

### 3.1 Cria projeto Firebase
1. Acessa [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → `nextgen-assets`
3. Ativa **Google Analytics** (opcional)
4. Espera provisionar

### 3.2 Ativa Authentication
1. **Authentication > Get started**
2. Aba **Sign-in method**:
   - ✅ **Email/Password**
   - ✅ **Google** (preencher OAuth consent screen)
   - ✅ **Magic link** (passwordless)
3. **Settings > Authorized domains** — adiciona:
   - `nextgenassets.com.br`
   - `admin.nextgenassets.com.br`
   - `app.nextgenassets.com.br`
   - `painel.nextgenassets.com.br`

### 3.3 Pega as credenciais
**Project settings > General > Your apps > Web app:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "nextgen-assets.firebaseapp.com",
  projectId: "nextgen-assets",
  storageBucket: "nextgen-assets.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};
```

### 3.4 Ativa Storage (se for usar)
1. **Storage > Get started**
2. Regras padrão liberam leitura/escrita autenticada
3. Cria pasta `partners/{partnerId}/`

### 3.5 Integra com o NestJS
Instala o SDK no admin frontend:
```bash
cd apps/admin
npm install firebase
```

```typescript
// apps/admin/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const auth = getAuth(app);
```

### 3.6 Variáveis de ambiente
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nextgen-assets.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nextgen-assets
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nextgen-assets.appspot.com
```

---

## 4. Resumo das URLs e onde colocar

| Variável | Valor | Onde colocar |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres?sslmode=require` | Render (API) + local |
| `REDIS_URL` | `redis://default:xxx@xxx.upstash.io:6379` | Render (API) + local |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` | Netlify (frontends) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `nextgen-assets.firebaseapp.com` | Netlify |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `nextgen-assets` | Netlify |
| `NEXT_PUBLIC_API_URL` | `https://api.nextgenassets.com.br` | Netlify (todos frontends) |

---

## 5. Verificação

### 5.1 Supabase
```bash
# Testa conexão
psql "postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres?sslmode=require" -c "SELECT 1;"
# → 1
```

### 5.2 Upstash
```bash
# Testa conexão
redis-cli -u "redis://default:xxx@xxx.upstash.io:6379" PING
# → PONG
```

### 5.3 Firebase
- Vai no console > Authentication > Sign-in method
- Tenta criar um usuário de teste
- Se criou, tá OK

---

## ✅ Checklist

- [ ] Conta criada no Supabase
- [ ] Projeto `nextgen-assets-prod` provisionado
- [ ] Connection string guardada (Render + local)
- [ ] Migrations rodadas no Supabase
- [ ] Seed executado
- [ ] RLS configurado
- [ ] Conta criada no Upstash
- [ ] Database Redis criado
- [ ] Connection string do Redis guardada
- [ ] (Opcional) Firebase Auth ativado
- [ ] Credenciais Firebase guardadas

Quando isso tudo tiver OK, **vai pro DEPLOY-RENDER.md** 🚀
