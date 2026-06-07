# INFRA.md — Infraestrutura NextGen Assets

> **Como rodar, hospedar, escalar e manter a plataforma em produção.**
> Documento técnico-operacional. Destinado ao time de engenharia / DevOps / CTO.

**Versão:** 1.0 · **Data:** 2026-06-07 · **Status:** Pronto pra piloto

---

## 0. TL;DR (1 minuto)

| Item | Valor |
|---|---|
| **Nome do código** | NextGen Assets (NGA) |
| **Stack backend** | NestJS 10 + TypeScript 5 |
| **Banco principal** | PostgreSQL 16 (via Prisma 5 ORM) |
| **Cache/fila** | Redis 7 + BullMQ |
| **IA** | OpenAI GPT-4o (principal) + Anthropic Claude Haiku (fallback) |
| **Open Finance** | Efí Bank (sandbox/produção) + Woovi (Pix/Subcontas) |
| **Secrets** | HashiCorp Vault (dev: file mode) |
| **Hospedagem sugerida** | Hetzner Cloud (€3.79/mês inicial) ou AWS Lightsail |
| **Domínio** | `nextgenassets.com.br` |
| **Container** | Docker + Docker Compose (K8s pronto se precisar escalar) |
| **Portas locais** | API: 3001 · Admin: 3002 · Partner: 3003 · Consumer: 3004 · Marketing: 3000 |

---

## 1. Arquitetura

### 1.1 Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTENDS (Next.js 14)                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Marketing │ │  Admin   │ │ Partner  │ │ Consumer │         │
│  │  :3000   │ │  :3002   │ │  :3003   │ │  :3004   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│       ↓             ↓            ↓            ↓              │
│                    API REST (NestJS) :3001                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (NestJS)                                            │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  Modules    │ │   Workers    │ │  AI Service  │           │
│  │  (15 domínios) │  (BullMQ)   │ │  (OpenAI)    │           │
│  └─────────────┘ └──────────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  INFRAESTRUTURA LOCAL                                        │
│  ┌──────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐         │
│  │PostgreSQL│  │ Redis  │  │  Vault  │  │ MailHog  │         │
│  │   :5432  │  │  :6379 │  │  :8200  │  │  :1025   │         │
│  └──────────┘  └────────┘  └─────────┘  └──────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  INTEGRAÇÕES EXTERNAS                                        │
│  • Efí Bank (Open Finance + ITP Pix)                         │
│  • Woovi (Pix/Subcontas)                                     │
│  • OpenAI (GPT-4o-mini / GPT-4o)                             │
│  • Anthropic Claude Haiku (fallback)                         │
│  • Yahoo Finance (cotações ações BR/US — grátis)             │
│  • CoinGecko (cotações cripto — grátis)                      │
│  • WhatsApp Business / Twilio / Z-API (multi-provider)       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Pastas do monorepo

```
/workspace/orkest/
├── apps/
│   ├── api/                    # Backend NestJS (porta 3001)
│   ├── admin/                  # Painel interno (porta 3002)
│   ├── partner/                # Portal B2B (porta 3003)
│   ├── consumer/               # Portal consumidor (porta 3004)
│   └── marketing/              # Site público (porta 3000)
├── packages/                   # Bibliotecas compartilhadas
├── infrastructure/
│   └── docker-compose.yml      # Postgres + Redis + Vault + MailHog
├── deploy/
│   ├── docker/                 # Dockerfiles de produção
│   ├── docker-compose.prod.yml # Compose de produção
│   ├── k8s/                    # Manifests Kubernetes
│   └── ci/                     # GitHub Actions
├── docs/                       # Documentação técnica
└── scripts/                    # Scripts utilitários
```

---

## 2. Requisitos pra rodar

### 2.1 Hardware mínimo (1 servidor piloto)

| Recurso | Mínimo | Recomendado produção |
|---|---|---|
| **CPU** | 2 vCPU | 4-8 vCPU |
| **RAM** | 4 GB | 8-16 GB |
| **Disco** | 40 GB SSD | 100 GB SSD |
| **Tráfego** | 1 TB/mês | 5+ TB/mês |

### 2.2 Software necessário

- **Node.js 20.x LTS** ([nodejs.org](https://nodejs.org))
- **Docker 24+** + **Docker Compose v2**
- **Git 2.30+**
- **PostgreSQL 16** (opcional se usar Docker)
- **Redis 7** (opcional se usar Docker)

### 2.3 APIs externas que você precisa contratar

| Serviço | Pra quê | Onde conseguir | Custo |
|---|---|---|---|
| **OpenAI API** | Traduzir linguagem natural → JSON estruturado | [platform.openai.com](https://platform.openai.com) | ~$0.15/1M tokens (gpt-4o-mini) |
| **Anthropic Claude** | Fallback de IA | [console.anthropic.com](https://console.anthropic.com) | ~$0.25/1M tokens (haiku) |
| **Efí Bank** | Open Finance + ITP Pix | [sejaefi.com.br](https://sejaefi.com.br) | Sandbox grátis, produção: ~R$ 0,01/Pix |
| **Woovi** | Pix + subcontas | [woovi.com](https://woovi.com) | Sandbox grátis, produção: ~R$ 0,01/Pix |
| **Domínio .com.br** | URL pública | [registro.br](https://registro.br) | R$ 40/ano |
| **Hospedagem cloud** | Onde roda o backend | [Hetzner](https://hetzner.com/cloud) | €3.79/mês (CX22) |

> 💡 **Total mensal inicial:** ~R$ 50 (Hetzner) + R$ 30 (APIs IA) + ~R$ 0,05/Pix = **~R$ 100/mês pra começar**.

---

## 3. Como rodar LOCAL (desenvolvimento)

### 3.1 Clone + setup
```bash
cd /workspace/orkest
npm install                    # instala tudo (workspaces)
```

### 3.2 Sobe a infra (Postgres, Redis, Vault, MailHog)
```bash
npm run infra:up
# Espera 30 segundos pra inicializar tudo
```

### 3.3 Configura o banco
```bash
npm run db:migrate             # roda migrations do Prisma
npm run db:seed                # popula com dados de exemplo
```

### 3.4 Sobe os 5 apps em terminais separados
```bash
# Terminal 1
npm run dev:api                # API na porta 3001

# Terminal 2
npm run dev:admin              # Painel admin na porta 3002

# Terminal 3
npm run dev:partner            # Portal parceiro na porta 3003

# Terminal 4
npm run dev:consumer           # Portal consumidor na porta 3004

# Terminal 5
npm run dev:marketing          # Site público na porta 3000
```

### 3.5 Acessa
- **API**: http://localhost:3001/api/docs (Swagger)
- **Admin**: http://localhost:3002
- **Partner**: http://localhost:3003
- **Consumer**: http://localhost:3004
- **Marketing**: http://localhost:3000
- **MailHog (emails de teste)**: http://localhost:8025
- **Vault UI**: http://localhost:8200 (token: `orkest-dev-token`)

---

## 4. Como fazer DEPLOY EM PRODUÇÃO

### 4.1 Opção A — Hetzner Cloud (recomendado pra MVP)

**Por quê:** melhor custo-benefício Brasil-Europa, €3.79/mês, fácil.

#### Passo 1: Cria servidor
- Tipo: **CX22** (2 vCPU, 4GB RAM, 40GB SSD) — €3.79/mês
- OS: **Ubuntu 22.04 LTS**
- Datacenter: **Falkenstein (Alemanha)** ou **Helsinki (Finlândia)**
- SSH key: adiciona tua chave pública

#### Passo 2: Aponta domínio
No painel do Registro.br:
```
A     @               IP_DO_SERVIDOR
A     www             IP_DO_SERVIDOR
A     api             IP_DO_SERVIDOR
A     admin           IP_DO_SERVIDOR
A     partner         IP_DO_SERVIDOR
CNAME widget          nextgenassets.com.br
```

#### Passo 3: Instala Docker no servidor
```bash
ssh root@SEU_IP
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin certbot python3-certbot-nginx nginx
```

#### Passo 4: Sobe a stack
```bash
cd /opt
git clone https://github.com/seu-usuario/nextgen-assets.git
cd nextgen-assets
cp apps/api/.env.example apps/api/.env
# edita o .env com as chaves reais (OpenAI, Efí, etc.)
docker compose -f deploy/docker-compose.prod.yml up -d
```

#### Passo 5: SSL grátis (Let's Encrypt)
```bash
certbot --nginx -d nextgenassets.com.br -d www.nextgenassets.com.br
certbot --nginx -d api.nextgenassets.com.br
certbot --nginx -d admin.nextgenassets.com.br
certbot --nginx -d partner.nextgenassets.com.br
```

#### Passo 6: Configura o nginx (proxy reverso)
Arquivo `/etc/nginx/sites-available/nextgenassets.com.br`:
```nginx
server {
    listen 443 ssl http2;
    server_name nextgenassets.com.br www.nextgenassets.com.br;
    
    ssl_certificate /etc/letsencrypt/live/nextgenassets.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nextgenassets.com.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;  # marketing
    }
}

server {
    listen 443 ssl http2;
    server_name admin.nextgenassets.com.br;
    # ... mesmo SSL ...
    location / {
        proxy_pass http://localhost:3002;  # admin
    }
}

server {
    listen 443 ssl http2;
    server_name api.nextgenassets.com.br;
    # ... mesmo SSL ...
    location / {
        proxy_pass http://localhost:3001;  # api
    }
}
```

### 4.2 Opção B — AWS Lightsail (se precisa AWS)
- Plano: `$5/mês` (1 GB RAM, 1 vCPU, 40 GB)
- Mesma lógica do Hetzner
- Domínio: mesma config no Route 53

### 4.3 Opção C — Kubernetes (escala >100k usuários)
Já tem manifests prontos em `/workspace/orkest/deploy/k8s/`:
```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/postgres.yaml
kubectl apply -f deploy/k8s/redis.yaml
kubectl apply -f deploy/k8s/api.yaml
kubectl apply -f deploy/k8s/admin.yaml
```

---

## 5. Banco de Dados

### 5.1 Schema principal (Prisma)

Modelos:
- **User** (consumidor final)
- **Partner** (corretora, fundo, banco, varejo)
- **Trigger** (regra do gatilho)
- **Execution** (cada tentativa de execução)
- **Destination** (config dos adapters)
- **Webhook** (entrada e saída)
- **AuditLog** (LGPD compliance)

### 5.2 Comandos úteis
```bash
# Visualizar o banco
npx prisma studio

# Criar migration nova
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em produção
npx prisma migrate deploy

# Backup diário
pg_dump -U orkest orkest > backup_$(date +%Y%m%d).sql

# Restore
psql -U orkest orkest < backup_20260607.sql
```

### 5.3 Backups automáticos (cron)
```bash
# Adiciona isso no crontab
0 3 * * * /opt/nextgen-assets/scripts/backup.sh
```

---

## 6. Inteligência Artificial (Agentic AI)

### 6.1 Modelos usados

| Modelo | Uso | Custo estimado |
|---|---|---|
| **gpt-4o-mini** (principal) | Tradução de linguagem natural → JSON | ~$0.15/1M tokens input |
| **gpt-4o** (complexo) | Sugestões personalizadas, insights | ~$2.50/1M tokens input |
| **claude-haiku-4-5** (fallback) | Backup se OpenAI cair | ~$0.25/1M tokens input |

### 6.2 Como funciona (arquitetura)

```
Cliente dita: "Compra R$ 500 de ITUB4 se cair 2%"
    ↓
NGA AI Service (apps/api/src/modules/ai/ai.service.ts)
    ↓
Prompt + Schema JSON (Structured Outputs)
    ↓
GPT-4o-mini retorna JSON determinístico
    ↓
{
  "ruleType": "BUY_DIP_STOCK",
  "destinationType": "STOCK_BROKER",
  "params": { "ticker": "ITUB4", "dipPct": 2, "amountBrl": 500 },
  "safetyLimits": { "maxAmountBrl": 500 },
  "explanation": "Compra R$ 500 de ITUB4 quando cair pelo menos 2%",
  "confidence": 0.97
}
    ↓
Trigger Engine valida + cria trigger
```

### 6.3 Configuração (.env da API)
```bash
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000

# Anthropic (fallback)
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-haiku-4-5

# Limites
AI_CONFIDENCE_THRESHOLD=0.7
AI_MAX_MONTHLY_REQUESTS=10000
```

### 6.4 Por que é "Agentic AI" (não só automação)

| Aspecto | Automação script | Agentic AI (NGA) |
|---|---|---|
| **Observa contexto** | ❌ Não | ✅ Saldo, salário, histórico, perfil |
| **Decisão** | ❌ Hard-coded | ✅ IA decide |
| **Executa** | ✅ Sim | ✅ Sim (via Open Finance) |
| **Aprende** | ❌ Não | ✅ Confiança do modelo + feedback |
| **Lida com ambiguidade** | ❌ Não | ✅ Pede confirmação |
| **Fallback** | ❌ Não | ✅ Claude se OpenAI falhar |

---

## 7. Integrações Externas

### 7.1 Efí Bank (Open Finance + ITP)

**Pra quê:** recebe Pix instantâneo, Open Finance pra ler saldo/transações

**Como contratar:**
1. Cria conta em [sejaefi.com.br](https://sejaefi.com.br)
2. Solicita acesso ao **sandbox** (1-2 dias úteis)
3. Testa em homologação (15-30 dias)
4. Aprovado, vai pra **produção** com chave real

**Config (.env):**
```bash
EFI_API_URL=https://api.efi.com.br/v1
EFI_CLIENT_ID=Client_Id_xxxxx
EFI_CLIENT_SECRET=Client_Secret_xxxxx
EFI_PIX_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EFI_CERTIFICATE_PATH=/opt/nextgen-assets/certs/efi.p12
```

**Endpoints usados:**
- `POST /oauth/token` (autenticação)
- `POST /pix` (criar cobrança)
- `GET /pix/{txid}` (consultar status)
- `POST /open-finance/authorize` (consentimento)

### 7.2 Woovi (Pix + Subcontas)

**Pra quê:** subcontas por parceiro (cada parceiro recebe na sua subconta), split de pagamento

**Como contratar:**
1. Cadastra em [woovi.com](https://woovi.com)
2. Recebe `appId` no email
3. Sandbox grátis, produção com contrato comercial

**Config (.env):**
```bash
WOOVI_API_URL=https://api.woovi.com/v1
WOOVI_APP_ID=app_xxxxx
WOOVI_API_KEY=xxxxx
```

### 7.3 Yahoo Finance (cotações grátis)

**Pra quê:** preço de ações BR (PETR4, VALE3, ITUB4) e US (AAPL, MSFT)

**Endpoint:** `https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}`

**Sem autenticação, sem custo.** Rate limit: 100 req/hora.

### 7.4 CoinGecko (cripto grátis)

**Pra quê:** preço de BTC, ETH, USDC, SOL

**Endpoint:** `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl`

**Sem autenticação, sem custo.** Rate limit: 10-30 req/min.

### 7.5 WhatsApp (multi-provider)

**Providers suportados:**
- **WhatsApp Business API oficial** (Meta) — produção
- **Twilio** — produção internacional
- **Z-API** — Brasil, mais fácil de homologar
- **Evolution API** — open source, self-hosted

**Config (.env):**
```bash
WHATSAPP_PROVIDER=zapi
WHATSAPP_API_URL=https://api.z-api.io
WHATSAPP_INSTANCE_ID=xxxxx
WHATSAPP_TOKEN=xxxxx
```

---

## 8. Segurança

### 8.1 Camadas
- **TLS/SSL** obrigatório (Let's Encrypt grátis)
- **JWT** com rotação de chave (15 min access, 7 dias refresh)
- **HMAC** em webhooks out (header `X-NGA-Signature`)
- **Rate limiting** por IP (100 req/min) e por usuário (1000 req/h)
- **Vault** pra secrets (credenciais Open Finance, chaves API)
- **Criptografia** AES-256-GCM em dados sensíveis (CPF, conta)
- **LGPD**: DPO, política de privacidade, consentimento explícito

### 8.2 Vault — secrets
```bash
# Dev (file mode, sem autenticação)
vault server -dev -dev-root-token-id=orkest-dev-token

# Produção (HCP Vault ou self-hosted com autenticação)
# Tokens rotacionados a cada 24h
```

### 8.3 Auditoria
- Toda execução loga em `AuditLog` (LGPD Art. 37)
- Logs retidos por 5 anos
- Webhooks assinados com HMAC-SHA256

---

## 9. Monitoramento

### 9.1 Stack sugerido
- **Sentry** — error tracking (grátis até 5k eventos/mês)
- **Grafana + Prometheus** — métricas
- **UptimeRobot** — health check (grátis)
- **Papertrail** — log aggregation (US$ 5/mês)

### 9.2 Health checks
```bash
# Liveness
curl https://api.nextgenassets.com.br/health
# → 200 OK

# Readiness
curl https://api.nextgenassets.com.br/health/ready
# → 200 OK se Postgres, Redis, Vault OK
```

### 9.3 Alertas críticos
- API down > 2 min → SMS pro CTO
- Fila BullMQ travada > 5 min → email
- Erro 5xx > 1% em 5 min → Slack
- Open Finance falhou > 3x seguidas → alerta urgente

---

## 10. CI/CD

Já tem pipeline em `/workspace/orkest/deploy/ci/`:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: docker build -f deploy/docker/api.Dockerfile -t nga-api:${{ github.sha }} .
      - run: docker push registry.nextgenassets.com.br/nga-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/nextgen-assets
            git pull
            docker compose -f deploy/docker-compose.prod.yml pull
            docker compose -f deploy/docker-compose.prod.yml up -d
            docker system prune -f
```

---

## 11. Custos mensais estimados (por fase)

| Fase | Usuários | Custo/mês |
|---|---|---|
| **Piloto (3 parceiros)** | 0-1k | R$ 100 (Hetzner + APIs + domínio) |
| **MVP (10 clientes)** | 1-10k | R$ 800 (Hetzner CX32 + 2x réplicas) |
| **Growth (50 clientes)** | 10-50k | R$ 3.500 (Hetzner + AWS p/IA) |
| **Scale (200+ clientes)** | 50-500k | R$ 15.000 (K8s + load balancer + CDN) |
| **Enterprise** | 500k+ | R$ 50.000+ (multi-region + SLA) |

---

## 12. Checklist de "ir pra produção"

- [ ] Servidor contratado (Hetzner CX22)
- [ ] Domínio registrado (nextgenassets.com.br)
- [ ] DNS apontando pro servidor
- [ ] Docker instalado
- [ ] SSL configurado (Let's Encrypt)
- [ ] Nginx reverse proxy OK
- [ ] Postgres + Redis rodando
- [ ] Migration aplicada
- [ ] Seeds rodados
- [ ] Variáveis de ambiente configuradas
- [ ] OpenAI API key válida
- [ ] Efí sandbox configurado
- [ ] Woovi sandbox configurado
- [ ] Backups automáticos (cron)
- [ ] Monitoramento ativo (Sentry + UptimeRobot)
- [ ] CI/CD deployando
- [ ] Admin acessível em admin.nextgenassets.com.br
- [ ] Primeiro parceiro-piloto cadastrado

---

## Próximos passos

- **DOMAIN.md** — Como plugar nextgenassets.com.br (subdomínios, DNS, SSL)
- **ADMIN.md** — Manual da área administrativa
- **DEPLOY.md** — Passo a passo detalhado de deploy
