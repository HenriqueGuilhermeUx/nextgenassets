# NextGen Assets

> **A infraestrutura de IA Agêntica e Open Finance que automatiza a vida financeira do usuário enquanto maximiza a retenção de saldo e a conversão de transações pra sua plataforma.**

Plataforma B2B2C que adiciona "Comprar por Gatilho" em qualquer e-commerce, corretora, fundo ou banco. O usuário dita uma regra em português, a IA estrutura, e o agente NGA executa via Open Finance quando a condição bater.

---

## 🚀 Quickstart (5 min)

```bash
# 1. Instala dependências
npm install --legacy-peer-deps

# 2. Sobe a infra local (Postgres + Redis + Vault)
npm run infra:up

# 3. Roda migrations + seed
npm run db:migrate
npm run db:seed

# 4. Sobe API
npm run dev:api

# 5. Em outro terminal, sobe o admin
npm run dev:admin

# 6. Acessa
# - API:    http://localhost:3001/api/docs
# - Admin:  http://localhost:3002
```

---

## 📦 Stack

| Camada | Tecnologia |
|---|---|
| **Backend** | NestJS 10 + TypeScript 5 |
| **Banco** | PostgreSQL 16 + Prisma 5 |
| **Cache/Queue** | Redis 7 + BullMQ |
| **IA Principal** | OpenAI GPT-4o (Structured Outputs) |
| **IA Fallback** | Anthropic Claude Haiku 4.5 |
| **Open Finance** | Efí Bank (sandbox/produção) |
| **Pix** | Woovi (subcontas) |
| **WhatsApp** | Z-API / Twilio / Evolution |
| **Frontends** | 4× Next.js 14 (Marketing, Admin, Partner, Consumer) |
| **Secrets** | HashiCorp Vault |
| **Container** | Docker + Docker Compose |
| **Orquestração** | Kubernetes (manifests prontos) |

---

## 🏗️ Arquitetura

```
apps/
├── api/          # Backend NestJS (porta 3001)
├── admin/        # Painel interno NextGen (porta 3002)
├── partner/      # Portal do parceiro B2B (porta 3003)
├── consumer/     # Portal do consumidor final (porta 3004)
└── marketing/    # Site público (porta 3000)
```

Ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) para detalhes.

---

## 🎯 Funcionalidades

- **23+ gatilhos** prontos (consumo contextual, investimento, bancário, utilidades, custom)
- **15 adapters** plug-and-play (5 mock + 8 reais + 2 em breve)
- **Widget embeddable** (1 linha de código)
- **Open Finance** via Efí (sandbox/produção)
- **IA estruturada** (linguagem natural → JSON determinístico)
- **Webhooks** in/out com HMAC + retry + DLQ
- **WhatsApp** multi-provider
- **Painel admin** completo (KPIs, execuções, gatilhos, partners, LGPD)
- **Reports** em 3 visões (parceiro, admin, usuário)
- **6 specs de testes E2E** com ~30 cenários

---

## 🚀 Deploy

| Plataforma | Custo | Docs |
|---|---|---|
| **Railway** (API + Postgres + Redis) | $5/mês | [`DEPLOY-RAILWAY-FINAL.md`](./DEPLOY-RAILWAY-FINAL.md) |
| **Netlify** (4 frontends) | Grátis | [`DEPLOY-NETLIFY.md`](./DEPLOY-NETLIFY.md) |
| **Cloudflare** (DNS) | Grátis | [`DOMAIN.md`](./DOMAIN.md) |

Total inicial: **~$15-40/mês** (~R$ 80-220)

---

## 📚 Documentação

- [`INFRA.md`](./INFRA.md) — Infraestrutura completa
- [`DEPLOY-RAILWAY-FINAL.md`](./DEPLOY-RAILWAY-FINAL.md) — Deploy definitivo Railway + Netlify + Cloudflare
- [`DEPLOY-ENV.md`](./DEPLOY-ENV.md) — Mapa de variáveis de ambiente
- [`DOMAIN.md`](./DOMAIN.md) — Como plugar `nextgenassets.com.br`
- [`ADMIN.md`](./ADMIN.md) — Manual da área administrativa
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Arquitetura técnica
- [`docs/API.md`](./docs/API.md) — API reference
- [`docs/ADAPTERS.md`](./docs/ADAPTERS.md) — Catálogo de adapters
- [`docs/TRIGGERS.md`](./docs/TRIGGERS.md) — Catálogo de gatilhos
- [`docs/AI.md`](./docs/AI.md) — Como funciona a IA
- [`docs/WIDGET.md`](./docs/WIDGET.md) — Widget embeddable
- [`docs/COMMERCIAL-FULL.md`](./docs/COMMERCIAL-FULL.md) — Material comercial

---

## 🔐 Segurança

- TLS/SSL obrigatório
- JWT com rotação (15min access + 7d refresh)
- HMAC em webhooks out
- Rate limiting por IP e usuário
- Vault pra secrets
- Criptografia AES-256-GCM em dados sensíveis
- LGPD compliance (DPO, política, consentimento)
- Auditoria completa (5 anos de retenção)

---

## 🌍 Contato

- **Site:** https://nextgenassets.com.br
- **Email:** contato@nextgenassets.com.br
- **Documentação:** https://docs.nextgenassets.com.br
- **API:** https://api.nextgenassets.com.br/api/docs

---

## 📄 Licença

Proprietary © 2026 NextGen Assets. Todos os direitos reservados.
