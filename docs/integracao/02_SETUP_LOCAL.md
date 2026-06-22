# 🛠️ Setup Local - Rodar NextGen na sua máquina

## Pré-requisitos

- **Node.js** >= 20
- **npm** >= 10
- **PostgreSQL** >= 15 (ou conta Supabase)
- **Redis** (opcional, para jobs)
- **Git**

---

## 1. Clonar o repositório

```bash
git clone https://github.com/HenriqueGuilhermeUx/nextgenassets.git
cd nextgenassets
```

---

## 2. Instalar dependências

```bash
# Instala todas as deps do monorepo
npm install

# Se der erro de workspaces, instalar por pasta:
cd apps/api && npm install && cd ../..
cd apps/marketing && npm install && cd ../..
cd apps/consumer && npm install && cd ../..
```

---

## 3. Configurar banco de dados

### Opção A: Supabase (recomendado)

1. Criar projeto em https://supabase.com
2. Settings → Database → Connection String
3. Copiar `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`

### Opção B: PostgreSQL local

```bash
# Ubuntu/Debian
sudo apt install postgresql-15
sudo -u postgres psql
CREATE DATABASE nextgen;
CREATE USER nextgen WITH PASSWORD 'nextgen';
GRANT ALL PRIVILEGES ON DATABASE nextgen TO nextgen;
\q
```

Connection: `postgresql://nextgen:nextgen@localhost:5432/nextgen`

---

## 4. Configurar variáveis de ambiente

```bash
# Copiar .env.example
cd apps/api
cp .env.example .env
```

Editar `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/nextgen

# Auth
JWT_SECRET=qualquer-coisa-aleatoria-com-64-chars-min
API_KEY_PREFIX=nka_

# Woovi (sandbox)
WOOVI_API_URL=https://api.woovi.com
WOOVI_APP_ID=tuappid-aqui
WOOVI_ENABLED=true
WOOVI_FROM_PIX_KEY=seu-cnpj-aqui

# Pluggy (sandbox)
PLUGGY_CLIENT_ID=tuclient
PLUGGY_CLIENT_SECRET=tusecret
PLUGGY_ENABLED=true

# Klavi (sandbox - free)
KLAVI_API_URL=https://api-sandbox.klavi.ai
KLAVI_ACCESS_KEY=tuaccess
KLAVI_SECRET_KEY=tusecret
KLAVI_ENABLED=true

# OpenAI (opcional, pra AI)
OPENAI_API_KEY=sk-tuakeyaqui
```

---

## 5. Rodar migrations do Prisma

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

Isso cria todas as tabelas.

**Seed opcional** (cria partner demo + user demo):
```bash
npx prisma db seed
```

---

## 6. Iniciar a API

```bash
cd apps/api
npm run start:dev
```

API vai rodar em: **http://localhost:3000**

**Health check:**
```bash
curl http://localhost:3000/health
```

**API Docs (Swagger):**
- http://localhost:3000/api (em dev)
- https://nextgenassets.com.br/api-docs (em prod)

---

## 7. Iniciar o Marketing (opcional)

```bash
cd apps/marketing
npm run dev
```

Site roda em: **http://localhost:3001**

---

## 8. Iniciar o Consumer (opcional)

```bash
cd apps/consumer
npm run dev
```

Consumer roda em: **http://localhost:3002**

---

## 9. Testar com Postman

1. Abrir Postman
2. Import → `postman/nextgen.postman_collection.json`
3. Setar variável `apiKey` = `nka_demo_key`
4. Rodar "Criar cobrança com split"

**OU** usar SDK:

```bash
cd sdk/js
npm install
node test.js
```

---

## 🐳 Alternativa: Docker

```bash
# Subir Postgres + Redis
docker-compose up -d

# Rodar API
cd apps/api
npm run start:dev
```

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: nextgen
      POSTGRES_PASSWORD: nextgen
      POSTGRES_DB: nextgen
  
  redis:
    image: redis:7
    ports: ['6379:6379']
```

---

## 🧪 Rodar Testes

```bash
cd apps/api
npm test              # Unit tests
npm run test:e2e      # End-to-end
npm run test:scenarios  # Cenários de uso real
```

---

## 🔥 Hot Reload (dev)

```bash
cd apps/api
npm run start:dev    # nodemon + tsc watch
```

Mudanças em `.ts` recarregam automaticamente.

---

## 📊 Prisma Studio (visualizar banco)

```bash
cd apps/api
npx prisma studio
```

Abre em: **http://localhost:5555**

---

## 🛑 Troubleshooting Local

### Erro: "Cannot find module '@prisma/client'"

```bash
cd apps/api
npx prisma generate
```

### Erro: "ECONNREFUSED 127.0.0.1:5432"

PostgreSQL não tá rodando. Iniciar:
```bash
sudo service postgresql start  # Linux
brew services start postgresql  # Mac
```

### Erro: "Port 3000 is already in use"

```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erro: "Efi OF SSL alert 40"

Veja [09_TROUBLESHOOTING.md](09_TROUBLESHOOTING.md#efi-of-mtls).

---

## 📁 Estrutura de Pastas Detalhada

```
apps/api/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   ├── config/                    # Configs (env vars)
│   │   ├── woovi.config.ts
│   │   ├── pluggy.config.ts
│   │   ├── klavi.config.ts
│   │   └── efi-of.config.ts
│   ├── modules/                   # Feature modules
│   │   ├── auth/                  # Autenticação
│   │   ├── billing/               # Planos B2C
│   │   ├── partners/              # Marketplace partners
│   │   ├── users/                 # Consumer users
│   │   ├── triggers/              # Gatilhos
│   │   ├── consents/              # Open Finance consents
│   │   ├── woovi/                 # Woovi integration
│   │   ├── pluggy/                # Pluggy integration
│   │   ├── klavi/                 # Klavi integration
│   │   ├── efi-of/                # Efi OF (PISP)
│   │   ├── gatilho-compra/        # Trigger: Gatilho de Compra
│   │   ├── ai/                    # AI Orchestrator (OpenAI)
│   │   ├── webhooks/              # Admin endpoints
│   │   └── ...
│   └── common/                    # Shared code
│       ├── guards/                # Auth guards
│       ├── filters/               # Exception filters
│       ├── interceptors/          # Response interceptors
│       └── pipes/                 # Validation pipes
├── prisma/
│   ├── schema.prisma              # DB schema
│   ├── migrations/                # DB migrations
│   └── seed.ts                    # Seed data
├── test/                          # E2E tests
└── package.json
```

---

## 📞 Suporte Setup

- **Issues:** https://github.com/HenriqueGuilhermeUx/nextgenassets/issues
- **Email:** dev@nextgenassets.com.br
- **WhatsApp:** +55 11 94798-4328

---

**Próximo:** [03_API_REFERENCIA.md](03_API_REFERENCIA.md) - Todos os endpoints
