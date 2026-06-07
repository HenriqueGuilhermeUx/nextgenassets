# ADMIN.md — Manual da Área Administrativa

> **Como usar o painel `admin.nextgenassets.com.br` pra cadastrar parceiros, integrações, gatilhos, execuções e fazer gestão operacional.**

---

## 0. Visão geral

O painel admin é o **centro de comando operacional** da NextGen Assets. Por ele você:

- Cadastra e gerencia **parceiros B2B** (corretoras, fundos, bancos, varejistas)
- Configura **integrações** (Efí, Woovi, adapters externos)
- Acompanha **execuções** de gatilhos em tempo real
- Gerencia **gatilhos do catálogo** (23+ prontos)
- Visualiza **reports** e dashboards executivos
- Faz **gestão de usuários** (consumidores finais)
- Audita **logs** (LGPD compliance)
- Configura **webhooks** de entrada e saída

---

## 1. Acesso

### 1.1 URL
- **Produção:** https://admin.nextgenassets.com.br
- **Dev local:** http://localhost:3002

### 1.2 Credenciais iniciais
Quando você roda `npm run db:seed`, é criado um usuário admin padrão:

| Campo | Valor |
|---|---|
| Email | `admin@nextgenassets.com.br` |
| Senha | `Admin@2026` (MUDE IMEDIATAMENTE) |
| Role | SUPER_ADMIN |

> ⚠️ **CRÍTICO:** Mude essa senha no primeiro login. Vá em **Configurações > Usuários > Editar**.

### 1.3 Recuperação de senha
- **Esqueceu:** "Esqueci minha senha" na tela de login → email com link
- **Trancado:** Acessa o banco direto e reseta o hash bcrypt

---

## 2. Estrutura do painel (menu lateral)

```
📊 Dashboard              → Visão geral (KPIs, execuções recentes)
👥 Parceiros              → B2B (corretoras, fundos, bancos, varejistas)
   └─ Listar / Criar / Editar
   └─ Detalhe do parceiro
   └─ Adapters configurados
   └─ Webhooks
   └─ Relatórios específicos

🛒 Varejo Pipeline        → Lojistas integrados via widget
⚡ Gatilhos               → Catálogo (23+) + customizados
   └─ Catálogo
   └─ Gatilhos custom (NL)
   └─ Versões de template

📈 Execuções              → Cada execução de gatilho
   └─ Em tempo real
   └─ Histórico filtrável
   └─ Detalhe da execução
   └─ Replay / cancelar

👤 Usuários               → Consumidores finais
   └─ Listar
   └─ Detalhe (consentimentos, gatilhos, execuções)

📊 Reports                → Dashboards executivos
   └─ Volume por parceiro
   └─ Conversão
   └─ Take-rate gerado
   └─ Saldos retidos

🔌 Adapters               → Configuração de cada adapter
   └─ Mock vs Real
   └─ Credenciais
   └─ Testar conexão

🪝 Webhooks               → Entrada e saída
   └─ Webhooks out (pra parceiros)
   └─ Webhooks in (de Efí, Woovi, etc.)
   └─ Logs + retry + DLQ

🤖 IA Service             → Configuração de IA
   └─ Modelos ativos
   └─ Custos
   └─ Insights gerados

🛡️ LGPD / Auditoria      → Compliance
   └─ Logs de acesso
   └─ Consentimentos
   └─ Exportar dados (Art. 18 LGPD)

⚙️ Configurações          → Geral
   └─ Usuários do painel admin
   └─ Roles e permissões
   └─ Variáveis de ambiente (read-only)
   └─ Manutenção (modo leitura)
```

---

## 3. Tarefas comuns (passo a passo)

### 3.1 Cadastrar um NOVO parceiro B2B

**Cenário:** Acabou de fechar uma corretora nova, quer cadastrá-la.

1. **Menu lateral:** `👥 Parceiros > + Novo Parceiro`
2. **Aba "Dados básicos":**
   - **Nome:** Ex: "XP Investimentos"
   - **Tipo:** Corretora / Fundo / Banco / Varejo
   - **Tier:** Starter / Growth / Scale / Enterprise
   - **CNPJ:** 00.000.000/0001-00
   - **Email comercial:** parceiro@xp.com.br
   - **Telefone:** (11) 0000-0000
   - **Status:** Ativo (deixe inativo até homologar)
3. **Aba "Adapters":**
   - Marca quais adapters esse parceiro vai usar
   - Ex: XP usa `MOCK_STOCK_BROKER` no piloto (vira `XP_BROKER` em produção)
4. **Aba "Webhooks out":**
   - **URL:** https://api.xp.com.br/webhooks/nga
   - **Eventos:** marca quais eventos enviar (ex: `trigger.executed`, `execution.failed`)
   - **Secret:** clica em "Gerar" (vai criar um HMAC secret)
5. **Aba "Comercial":**
   - **Plano:** Growth
   - **Take-rate:** R$ 0,15 por execução
   - **MRR:** R$ 8.000
   - **Data de início:** 2026-06-15
   - **Renovação:** anual
6. **Clica em "Criar"**
7. **Próximo passo:** Enviar as credenciais de API pro parceiro (gera em `🔌 Credenciais`)

---

### 3.2 Configurar uma NOVA integração (Ex: Efí)

**Cenário:** Acabou de homologar com a Efí, quer colocar em produção.

1. **Menu lateral:** `🔌 Adapters > Efí Bank > Editar`
2. **Status:** Mock → **Real**
3. **Credenciais (Vault):**
   - **Client ID:** `Client_Id_xxxxx_xxx`
   - **Client Secret:** `Client_Secret_xxxxx_xxx`
   - **Certificado (.p12):** upload do arquivo
   - **Senha do certificado:** `xxxxx`
4. **Ambiente:**
   - Inicia em **Sandbox** (testa com chave de homologação)
   - Depois muda pra **Produção** quando homologado pela Efí
5. **Configurações avançadas:**
   - **Webhook URL de retorno:** `https://api.nextgenassets.com.br/webhooks/efi`
   - **Timeout:** 30s
   - **Retry:** 3x com backoff exponencial
6. **Testar conexão:** clica em "Testar" → deve retornar `200 OK` e mostrar saldo da conta Efí
7. **Salvar**

> 💡 As credenciais vão automaticamente pro HashiCorp Vault, nunca ficam em texto puro no banco.

---

### 3.3 Acompanhar EXECUÇÕES em tempo real

**Cenário:** Quer ver se os gatilhos estão executando direito.

1. **Menu lateral:** `📈 Execuções > Tempo Real`
2. **Auto-refresh:** 5 segundos (configurável)
3. **Filtros:**
   - **Status:** Pendentes / Avaliando / Pix iniciado / Concluídas / Falhadas
   - **Parceiro:** XP, Rico, Genial...
   - **Período:** últimas 24h / 7 dias / 30 dias
4. **Visualização:**
   - Tabela atualiza em tempo real
   - Clicar em uma linha abre o **detalhe da execução**
5. **No detalhe você vê:**
   - JSON do gatilho original
   - Resultado da IA (confidence, explanation)
   - Status do Open Finance (consentimento, saldo, etc)
   - Status do Efí (Pix enviado, confirmado)
   - Status do destino (ação comprada, ordem criada)
   - Webhook pro parceiro (enviado? falhou?)
   - Timeline completa com timestamps

---

### 3.4 Adicionar um GATILHO novo no catálogo

**Cenário:** Um parceiro pediu um gatilho que não existe (ex: "comprar X se cotação do dólar cair").

1. **Menu lateral:** `⚡ Gatilhos > Catálogo > + Novo`
2. **Tipo:** Compra / Venda / Investimento / Utilidade / Custom
3. **Código único:** `BUY_ON_FX_DIP` (uppercase, snake_case)
4. **Nome exibido:** "Compra quando dólar cair"
5. **Descrição:** "Compra ativo X se cotação do dólar cair X% em Y dias"
6. **Schema JSON (Structured Outputs):**
   ```json
   {
     "type": "object",
     "properties": {
       "ticker": { "type": "string" },
       "fxPair": { "type": "string", "enum": ["USD-BRL", "EUR-BRL"] },
       "dipPct": { "type": "number", "minimum": 0.5, "maximum": 20 },
       "windowDays": { "type": "integer", "minimum": 1, "maximum": 90 },
       "amountBrl": { "type": "number", "minimum": 10 }
     },
     "required": ["ticker", "fxPair", "dipPct", "windowDays", "amountBrl"]
   }
   ```
7. **Destinos compatíveis:** MOCK_STOCK_BROKER, SHOPIFY, etc.
8. **Safety limits:**
   - Valor máximo: R$ 50.000
   - Janela mínima: 1 dia
   - Janela máxima: 90 dias
9. **Clica em "Salvar"** → entra no catálogo, disponível pra todos os parceiros

---

### 3.5 Gerenciar WEBHOOKS

**Cenário:** Um parceiro reportou que não tá recebendo webhooks.

1. **Menu lateral:** `🪝 Webhooks > Out`
2. **Filtro:** Parceiro = XP, Status = Falhados, Período = últimas 24h
3. **Tabela mostra:** URL, evento, response code, tentativas
4. **Clica em uma linha** → vê o payload enviado, response recebido, motivo da falha
5. **Ações:**
   - **Reenviar:** dispara manualmente
   - **Ver histórico:** todas as tentativas dessa entrega
   - **Pausar:** para de enviar pra esse endpoint (útil se a API do parceiro tá fora)
6. **DLQ (Dead Letter Queue):** webhooks com 5+ falhas vão pra cá automaticamente

---

### 3.6 Auditar (LGPD)

**Cenário:** Usuário pediu exclusão dos dados (Art. 18 LGPD).

1. **Menu lateral:** `🛡️ LGPD > Solicitações`
2. **Tipo:** Exclusão / Portabilidade / Acesso
3. **Buscar usuário:** por email ou CPF
4. **Confirmar solicitação:** exige dupla aprovação (compliance + DPO)
5. **Executar:**
   - **Exclusão:** remove PII (criptografa ou deleta), mantém logs anônimos pra auditoria
   - **Portabilidade:** gera JSON com todos os dados do usuário
   - **Acesso:** lista tudo que temos sobre ele
6. **Prazo legal:** 15 dias (LGPD)
7. **Notificação:** email automático quando concluído

---

## 4. Permissões e roles

| Role | O que pode fazer |
|---|---|
| **SUPER_ADMIN** | Tudo, incluindo gestão de usuários admin |
| **ADMIN** | Tudo EXCETO gestão de usuários admin e configs críticas |
| **OPS** | Operações do dia-a-dia (parceiros, execuções, webhooks) |
| **SUPPORT** | Apenas leitura + ações limitadas (ver detalhe, reenviar webhook) |
| **VIEWER** | Apenas leitura (dashboards, reports) |
| **COMPLIANCE** | Auditoria + LGPD + reports de compliance |

**Criar novo usuário admin:**
1. **Configurações > Usuários > + Novo**
2. Define email, role, password temporária
3. Sistema envia email com link pra primeiro acesso

---

## 5. Atalhos e dicas

### 5.1 Busca global
`Ctrl + K` (ou `Cmd + K` no Mac) — busca em **parceiros, execuções, usuários, gatilhos, adapters**.

### 5.2 Dark mode
🌙 no canto superior direito.

### 5.3 Filtros salvos
Salva combinações de filtros (ex: "Execuções falhadas hoje" + "Parceiro XP" + "Ação XP_BROKER"). Compartilha com o time.

### 5.4 Export
- **CSV** / **Excel** / **PDF** em qualquer tabela
- **API:** `GET /api/admin/export?type=executions&from=...&to=...&partner=...`

### 5.5 Manutenção
- **Modo leitura** (em `Configurações`): desabilita todas as ações de escrita. Usar em deploys.
- **Logs ao vivo** (em `🛡️ Auditoria > Logs`): tail -f dos logs estruturados do backend.

---

## 6. Integrações da área admin

### 6.1 Com Slack
- Alertas críticos vão pra `#nga-alertas` (execuções falhadas, fila travada, Open Finance offline)
- Comandos slash:
  - `/nga stats` — KPIs do dia
  - `/nga executions failed 24h` — lista de falhas
  - `/nga pause partner XP` — pausa envios de webhook

### 6.2 Com PagerDuty
- On-call rota para CTO
- Acorda às 3h da manhã se API down > 5 min

### 6.3 Com Datadog/Grafana
- Métricas: latência, throughput, fila, erros
- Dashboards prontos em `/workspace/orkest/deploy/grafana-dashboards/`

---

## 7. Próximas evoluções da área admin

- [ ] **Editor visual de gatilhos** (drag-and-drop, sem código)
- [ ] **Marketplace de adapters** (parceiros publicam adapters próprios)
- [ ] **Test sandbox** integrado (criar gatilho e testar com conta demo)
- [ ] **A/B testing** de versões de widget
- [ ] **Insights de IA** pro time de produto (quais gatilhos mais convertem)
- [ ] **Multi-tenant** (cada parceiro com seu sub-admin)

---

## 8. Em caso de emergência 🚨

### 8.1 API caiu
1. Verifica health: `curl https://api.nextgenassets.com.br/health`
2. SSH no servidor: `ssh root@SEU_IP`
3. Verifica containers: `docker ps -a`
4. Restart: `cd /opt/nextgen-assets && docker compose -f deploy/docker-compose.prod.yml restart api`
5. Logs: `docker logs --tail=100 nga-api`

### 8.2 Banco de dados corrompeu
1. SSH no servidor
2. Lista backups: `ls /opt/backups/`
3. Pega o mais recente: `cp /opt/backups/nga_2026-06-07.sql /tmp/`
4. Restore: `docker exec -i nga-postgres psql -U orkest orkest < /tmp/nga_2026-06-07.sql`
5. Restart API: `docker compose -f deploy/docker-compose.prod.yml restart api`

### 8.3 Parceiro reportou problema
1. Busca pelo nome: `Ctrl+K` → "XP Investimentos"
2. Vai em **Execuções** filtrando por parceiro
3. Identifica padrão (sempre falha? qual step?)
4. Ações: pausar, reenviar, escalar pro time de engenharia

### 8.4 Open Finance caiu (Efí offline)
- Painel mostra banner amarelo: "Open Finance indisponível"
- Execuções entram em fila e retentam automaticamente quando Efí volta
- Acompanhe em `📈 Execuções > Pendentes`

---

## 9. Contatos

- **CTO:** [definir]
- **Head de Operações:** [definir]
- **Suporte Efí:** 0800 000 0000 / suporte@efi.com.br
- **Suporte Woovi:** ajuda@woovi.com
- **Suporte OpenAI:** help.openai.com
- **Suporte Hetzner:** support@hetzner.com

---

**Última atualização:** 2026-06-07
**Versão do painel:** 1.0
**Próxima release:** 1.1 (com editor visual de gatilhos)
