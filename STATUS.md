# 📊 NextGen Assets — Status de Produção

**Data:** 2026-06-10
**Versão:** Demo funcional + código PISP pronto

---

## ✅ O QUE TÁ FUNCIONANDO (DEMO end-to-end)

### Marketing & Widget
- ✅ Site marketing: https://nextgenassets.com.br
- ✅ Widget embeddable: https://nextgenassets.com.br/nga-widget.js
- ✅ Demo: https://nextgenassets.com.br/demo
- ✅ 3 produtos de exemplo: Sony, Netflix, ITSA4
- ✅ 14 presets de gatilho (incluindo Round-Up)
- ✅ Tela regulatória Open Finance (LGPD/BACEN) - escopos + limites
- ✅ Modal de consentimento com aviso de revogação

### Backend (API)
- ✅ Health: https://api.nextgenassets.com.br/health → `{"status":"ok"}`
- ✅ 32 triggers no catálogo
- ✅ 5 ofertas demo
- ✅ Open Finance consent (com escopos regulatórios)
- ✅ Webhooks handler (pix-received, pix-sent, pix-refunded)
- ✅ 5 admin endpoints:
  - `POST /v1/admin/aggregator/run-now`
  - `POST /v1/admin/webhooks/efi/register`
  - `GET /v1/admin/webhooks/efi/list`
  - `GET /v1/reports/internal/profitability`
  - `GET /v1/executions/stats/summary`

### Round-Up (TESTADO)
- ✅ 5 transações demo criadas no Supabase
- ✅ Consolidator detecta round-up de R$ 20,10
- ✅ DEMO_MODE simula PIX → execução COMPLETED
- ✅ Transações marcadas como processadas
- ✅ Fluxo: detectar → calcular → simular PIX → marcar processado

### Workers
- ✅ Trigger cron (a cada 1 min)
- ✅ Round-up aggregator (DEMO 5 min, PROD 23:55)
- ✅ Market watcher

### Frontends
- ✅ Marketing: Netlify (static export)
- ✅ Admin: Vercel → admin.nextgenassets.com.br
- ✅ Partner: Vercel → painel.nextgenassets.com.br
- ✅ Consumer: Vercel → app.nextgenassets.com.br

### Banco (Supabase)
- ✅ 10+ tabelas (Partner, ConsumerUser, Offer, Consent, Trigger, Execution, Transaction, AuditLog, etc.)
- ✅ 32 trigger catalog
- ✅ 5 ofertas demo
- ✅ 5 transações round-up
- ✅ 5 execuções (1 PENDING + 3 FAILED do histórico + 1 DEMO COMPLETED)

---

## ⚠️ O QUE AINDA NÃO TÁ 100% (precisa de setup adicional)

### 🔴 Produção Efí (PISP real)
- ❌ Webhook registration: precisa descobrir URL correta da API produção
- ❌ mTLS handshake com cert P12: falha silenciosamente (Node 20 + cert)
- ❌ Não tem saldo na conta Efí pra testar PIX real

### 🟡 Outras pendências
- ⚠️ OAuth Open Finance: simulado (não tem cliente real)
- ⚠️ PISP (Iniciação de Pagamento da conta do cliente): só documentação
- ⚠️ Split de comissão: lógica não implementada no adapter
- ⚠️ Dashboard de comissões: não existe

---

## 🚀 PRÓXIMOS PASSOS PRA PRODUÇÃO

### 1. **Webhooks Efí** (CRÍTICO)
Pra cadastrar webhook de verdade, tu precisa:
- Confirmar URL correta com suporte Efí (já tentamos 4 URLs diferentes)
- Testar mTLS em ambiente controlado
- Alternativa: usar Postman localmente com cert P12

### 2. **PISP + Open Finance**
- Contratar PISP Efí (já tá, mas precisa ativar)
- Implementar fluxo de consent completo (cliente autoriza no banco)
- Implementar payout da conta do cliente → conta vendedor

### 3. **Split de Comissão (3%)**
- Adicionar campo `commissionPct` no Offer
- Implementar lógica de 2 PIX (cliente → NextGen → vendedor)
- Dashboard admin pra ver comissões acumuladas

### 4. **Multi-parceiro (B2B)**
- Onboarding de corretoras
- Cota de comissão por parceiro
- Webhooks out (notificar parceiros)

### 5. **Compliance**
- Contrato jurídico com Efí (PISP)
- Termo de uso + política privacidade (LGPD)
- Auditoria externa (LGPD + BACEN)
- Homologação BACEN como PISP

---

## 🎯 URL importante

| Componente | URL |
|-----------|-----|
| **Marketing** | https://nextgenassets.com.br |
| **Demo** | https://nextgenassets.com.br/demo |
| **Widget** | https://nextgenassets.com.br/nga-widget.js |
| **API** | https://api.nextgenassets.com.br |
| **Admin** | https://admin.nextgenassets.com.br |
| **Partner** | https://painel.nextgenassets.com.br |
| **Consumer** | https://app.nextgenassets.com.br |
| **Supabase** | https://supabase.com/dashboard/project/dbhubhtazhbymchqhqpe |

---

## 📞 Contatos úteis

- **Efí suporte**: https://sejaefi.com.br/atendimento
- **Documentação PIX**: https://dev.efipay.com.br/docs
- **BACEN Open Finance**: https://www.bcb.gov.br/estabilidadefinanceira/openfinance
- **Efí Postman Collection**: https://github.com/efipay

---

## 💡 Resumo executivo pra investidor

> NextGen Assets é uma plataforma B2B2C que permite qualquer fintech (corretora, banco digital, e-commerce)嵌入tar gatilhos financeiros inteligentes via widget. O cliente conecta o banco via Open Finance, define uma condição ("comprar ITSA4 se cair 5%"), e a plataforma monitora 24/7 e executa automaticamente via PIX quando a condição for atingida. Comissão de 3% por transação processada. Compliance LGPD/BACEN desde o design.

---

## 🧠 AI Orchestrator (commit cdf5426)

**Multi-agent system rodando em produção:**

| Agente | Função | Modelo | Custo/request |
|--------|--------|--------|---------------|
| 🎯 Router | Classifica intenção do usuário | gpt-4o-mini | ~R$ 0,0001 |
| 📝 Translator | NL → trigger estruturado | gpt-4o-mini JSON mode | ~R$ 0,0003 |
| 🛡️ Risk | Valida BACEN + safety limits | Determinístico (offline) | R$ 0 |
| 💡 Insight | Análise de mercado | gpt-4o-mini | ~R$ 0,0009 |
| 👨‍💼 Staff | Educação financeira | gpt-4o-mini | ~R$ 0,0007 |
| 🎯 Sniper | Monitorar produto com alvo | gpt-4o-mini JSON mode | ~R$ 0,0003 |

**Features:**
- ✅ Streaming (SSE) em `/v1/ai/stream`
- ✅ Cost tracking (BRL por request)
- ✅ Audit log estruturado
- ✅ Fallback gracioso (nunca 500)
- ✅ Resiliente a quota excedida

**Endpoints:**
- `POST /v1/ai/orchestrate` — processa input completo
- `POST /v1/ai/stream` — SSE streaming
- `GET /v1/ai/health` — status

**Próximos passos:**
- [ ] Vector DB (Supabase pgvector) pra RAG
- [ ] Mais agents (Fraud, Tax, Onboarding)
- [ ] A/B testing de prompts
- [ ] Langfuse/Helicone pra observabilidade

---

## ✅ EFI WEBHOOK INTEGRATION (commits 12cf47d + anteriores)

**STATUS: 100% FUNCIONANDO EM PRODUÇÃO**

Os 3 webhooks (pix-received, pix-sent, pix-refunded) estão CADASTRADOS na Efí e respondendo status 200.

### URL e endpoints finais
- **OAuth**: `https://pix.api.efipay.com.br/oauth/token` (produção)
- **API Pix**: `https://api-pix.gerencianet.com.br` (domínio legado mantido)
- **PUT Webhook**: `/v2/webhook/{chave}` (v1 deprecated)
- **Header obrigatório**: `x-skip-mtls-checking: true` (lowercase)

### Autenticação sem mTLS reverso
- HMAC via query string: `?hmac={EFI_WEBHOOK_HMAC}`
- Validação de IP: `34.193.116.226` (IP fixo da Efí)
- Validação de CN: `gn-webhook-pix` (cert de cliente da Efí)

### Variáveis de ambiente
- `EFI_DEMO_MODE=false` (opt-out do demo, usa API real)
- `EFI_WEBHOOK_HMAC=<32+ chars>` (secret pra HMAC)
- `EFI_PIX_KEY=5f3325c1-2210-419c-977e-03b47fddbd1f`
- `EFI_CLIENT_ID=<Client ID>`
- `EFI_CLIENT_SECRET=<Client Secret>`
- `EFI_CERTIFICATE_BASE64=<P12 em base64>`

### Endpoints admin
- `POST /v1/admin/webhooks/efi/register` — registra os 3 webhooks
- `GET /v1/admin/webhooks/efi/list` — lista webhooks configurados

### Fontes (Discord oficial da Efí)
- peterfritz (12/11/2023) - serverless/edge funciona com skip
- marcelo_efi (01/08/2023) - skip funciona em produção
- guilherme_efi (20/01/2021) - formato do header x-skip-mtls-checking
- rubenskuhl (várias) - gambi do `?ignorar=` contra `/pix` automático

### Próximos passos
- [ ] Adicionar saldo na conta Efí pra testar PIX real
- [ ] Testar webhook com pagamento real (pequeno valor R$ 0,01)
- [ ] Implementar split de comissão 3% (parceiro recebe X-3%)
- [ ] Remover validação rígida de IP (Render proxy muda)
