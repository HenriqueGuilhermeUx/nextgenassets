# Proposta Comercial & Framework Contratual
## Orquestrador de Embedded Finance com IA (B2B2C)

**Versão:** 1.0 — Junho/2026
**Status:** Draft para revisão jurídica e rodada de pricing
**Audiência:** Fintechs, Corretoras, Bancos Digitais, ERPs, Gateways de Pagamento

---

## 1. Sumário Executivo da Oferta

Você está contratando uma **infraestrutura de patrimônio autônomo white-label** que conecta Open Finance, IA e ativos globais (USDC, USDY, PAXG) ao seu aplicativo, **sem precisar homologar ITP próprio nem construir motor de regras**.

**O que está incluso no pacote:**

| Pilar | O que entregamos | O que seu cliente (B2B) economiza |
|---|---|---|
| 🧠 **IA + Motor de Regras** | Tradução de intenção em JSON, gatilhos pré-formatados, motor determinístico de execução | 6-12 meses de squad de IA/ML |
| 🏦 **BaaS (Banking-as-a-Service)** | Open Finance, Iniciação Pix, subcontas segregadas, webhooks em tempo real | R$ 1M+ de capital regulatório + 12-24 meses no BC |
| 💱 **Trilho de Liquidação Cripto** | Conversão BRL→USDC/USDY/PAXG via parceiros CaaS | Licença de corretora + integração com múltiplas exchanges |
| 🎨 **White-Label SDK** | Widgets prontos (cards de gatilhos), APIs REST, dashboards de auditoria | Design system próprio de produto financeiro |
| 🛡️ **Compliance & Segurança** | Tratativa LGPD, certificação Open Finance, criptografia de tokens | Equipe jurídica regulatória dedicada |

**Propriedade intelectual:** Todo código, lógica de IA e dados de transação do seu cliente final são seus. Nós somos operador tecnológico, não custodiante.

---

## 2. Arquitetura de Pricing (4 Camadas)

A precificação combina **4 fontes de receita** que se ajustam ao estágio e volume do parceiro:

```
┌─────────────────────────────────────────────────┐
│  1. SaaS Base (Mensalidade)        → Fixo      │
│  2. Take-Rate por Transação        → Variável  │
│  3. Spread de Conversão Cripto     → Variável  │
│  4. Setup + Customização           → Pontual   │
└─────────────────────────────────────────────────┘
```

### 2.1. Tabela de Planos

| | **Starter** | **Growth** | **Scale** | **Enterprise** |
|---|---|---|---|---|
| **Usuários Ativos (MAU)** | Até 1.000 | Até 10.000 | Até 50.000 | 50.000+ |
| **SaaS Base Mensal** | R$ 2.500 | R$ 8.000 | R$ 25.000 | Sob consulta |
| **Take-Rate por Transação Executada** | R$ 0,15 | R$ 0,12 | R$ 0,08 | R$ 0,05 – R$ 0,07 |
| **Spread na Conversão Cripto (sobre volume BRL→Token)** | 1,5% | 1,2% | 0,9% | 0,5% – 0,7% |
| **Setup + Integração** | R$ 15.000 | R$ 35.000 | R$ 60.000 | Sob consulta |
| **Suporte** | Email (D+1) | Email + Chat (D+1) | 24/7 + Slack dedicado | Account Manager |
| **SLA de Uptime** | 99,0% | 99,5% | 99,9% | 99,95% |
| **Webhooks Inclusos/mês** | 50.000 | 500.000 | 3.000.000 | Ilimitado |

> **Nota sobre MAU:** "Usuário Ativo" = usuário final que teve ao menos 1 gatilho avaliado OU 1 transação executada no mês. Avaliação não executada (gatilho bloqueado por governança) conta como 0,3 MAU.

### 2.2. Política de Volume e Desconto Progressivo

Se o parceiro cruzar de faixa no meio do ciclo, o **take-rate da faixa antiga se mantém até o fim do ciclo**, e a migração ocorre no início do próximo ciclo (pró-rata).

**Desconto por comprometimento anual:** 15% off no SaaS Base se pagar 12 meses antecipados.

**Desconto por receita compartilhada (opcional):** Se o parceiro permitir co-marketing (case público + logo no site), ganha +5% off.

### 2.3. Modelo Alternativo: Revenue Share sobre AUM

Para parceiros com carteira de **ativos sob custódia** relevante (USDC/PAXG/USDY retidos por > 30 dias), oferecemos modelo alternativo:

- **0,15% a.a. sobre o AUM médio mensal** do parceiro na plataforma
- Substitui o spread de conversão (item 2.1)
- Take-rate de transação continua valendo

**Recomendado para:** Corretoras com público *holder* (compra e segura por meses).
**Não recomendado para:** Apps de cashback/arrependondamento (giro muito rápido, AUM baixo).

### 2.4. Custos que NÃO estão inclusos e são repassados (Custo Real)

| Item | Custo Estimado (BRL) | Quem paga |
|---|---|---|
| Chamadas Open Finance (Efí) | R$ 0,05 – R$ 0,20 por chamada | Operador (nós) → embutido no take-rate |
| Transação Pix (Woovi/Efí) | R$ 0,01 – R$ 0,10 por Pix | Operador (nós) → embutido no take-rate |
| Conversão cripto via CaaS | 0,3% – 0,8% (spread de mercado) | Operador (nós) → embutido no nosso spread |
| Onboarding KYC do cliente final (se aplicável) | R$ 1,50 – R$ 5,00 por usuário | Parceiro B2B (geralmente já tem stack próprio) |
| Compliance/auditoria de segurança anual | R$ 8.000 – R$ 25.000 | Operador (nós) → absorvido no P&L |

> **Transparência:** Enviamos relatório trimestral aberto com o breakdown de custo real vs receita (auditado). Isso constrói confiança e é seu argumento contra "preto no branco" que players legacy fazem.

---

## 3. Escopo do BaaS (Banking-as-a-Service) Embutido

### 3.1. O que está incluso no pacote BaaS

**Conectividade Open Finance (via Efí Bank):**
- ✅ Onboarding de consentimento (fluxo completo web/SDK)
- ✅ Consulta de saldo e extrato (qualquer banco brasileiro homologado no Open Finance)
- ✅ Renovação automática de consentimentos (12 meses)
- ✅ Gestão de revogação (webhook em tempo real quando usuário cancela)
- ✅ Suporte a Pessoa Física e Pessoa Jurídica

**Iniciação de Transação de Pagamento (ITP):**
- ✅ Pix imediato (vinda → recebimento)
- ✅ Pix Automático / Recorrente (autorização única, execuções periódicas)
- ✅ Split de pagamento nativo (subcontas Woovi para segregação por parceiro B2B)
- ✅ Webhook de confirmação em < 5 segundos (SLA)
- ✅ Retentativa automática em caso de falha transitória (3 tentativas em 24h)

**Liquidação Cripto (via CaaS parceiro):**
- ✅ Compra/venda de USDC, USDY, PAXG
- ✅ Slippage máximo garantido por ordem (configurável, default 0,5%)
- ✅ Custódia em carteira segregada por cliente final
- ✅ Histórico on-chain imutável (proof of reserves)
- ✅ Suporte a撤退 (redeem) de USDC/USDY/PAXG → BRL via Pix

### 3.2. O que NÃO está incluso (e como tratamos)

| Item | Status | Workaround |
|---|---|---|
| Custódia de ativos tradicionais (Ações, Fundos) | ❌ Fora do escopo | Parceiro usa seu próprio custodiante (B3, Genial, etc.) |
| Emissão de cartão de crédito/débito | ❌ Fora do escopo | Parceiro integra com Bin/Stone/Pismo separadamente |
| Câmbio (BRL → outras moedas fiduciárias) | ⚠️ Limitado | Disponível para USD/EUR via CaaS parceiro; não fazemos FX spot |
| KYC do cliente final | ⚠️ Opcional | Oferecemos como add-on (R$ 1,50/usuário) usando o stack da Efí |
| Conta corrente para o cliente final | ❌ Fora do escopo | Cliente usa a conta dele (modelo não-custodial por design) |

### 3.3. SLAs de Execução BaaS

| Métrica | Starter | Growth | Scale | Enterprise |
|---|---|---|---|---|
| **Uptime mensal da API** | 99,0% | 99,5% | 99,9% | 99,95% |
| **Latência de confirmação de Pix recebido (webhook)** | < 30s | < 15s | < 5s | < 3s |
| **Latência de execução de gatilho (mercado → ordem enviada)** | < 60s | < 30s | < 10s | < 5s |
| **Janela de manutenção programada** | 8h/mês | 4h/mês | 2h/mês | Janela negociada |
| **Tempo de resposta suporte (P1 - produção parada)** | 8h | 4h | 1h | 15 min |
| **Tempo de resposta suporte (P2 - feature degradada)** | 24h | 12h | 4h | 2h |
| **Tempo de resposta suporte (P3 - dúvida)** | 72h | 48h | 24h | 8h |

> **Crédito por SLA não cumprido:** Se uptime mensal < SLA, crédito de 5% do SaaS Base por cada 0,5% abaixo (até 100% do mês). Não monetizamos falha.

---

## 4. Catálogo de Gatilhos (O Produto-Embutido)

O parceiro B2B recebe um **cardápio de gatilhos prontos** que ele cola no app dele. A customização é em **valores e parâmetros** — não em código.

### 4.1. Gatilhos Standard (inclusos em todos os planos)

| Código | Nome Comercial | Lógica | Ativos Suportados | Parâmetros Customizáveis |
|---|---|---|---|---|
| `TRC` | 💰 **Modo Poupança Invisível** | Arredondamento de gastos via Open Finance | USDC, USDY | Valor de arredondamento (R$ 5/10/50), limite semanal, ativo destino |
| `BTD` | 📉 **Modo Caçador de Descontos** | Compra quando ativo cai X% em janela Y | USDC, PAXG | % de queda, janela (24h/7d/30d), valor BRL, saldo mínimo segurança |
| `RSC` | 🛡️ **Modo Conta Blindada** | Move excedente de caixa pós-salário para USDY | USDY | Saldo mínimo de caixa, dia do mês, teto de transferência |
| `AIF` | 📊 **Modo Escudo Anti-Inflação** | DCA com trava de despesa | USDC, USDY | Valor, frequência, % de aumento de despesa que dispara redução |
| `RBC` | 🥇 **Modo Porto Seguro** | Migração para ouro em estresse cambial | PAXG | % de alta do dólar em janela, valor, gatilho automático vs alerta |

### 4.2. Gatilhos Premium (planos Scale+ ou add-on R$ 3.000/mês)

| Código | Nome Comercial | Lógica |
|---|---|---|
| `DCA-AI` | DCA Inteligente com IA | LLM analisa gasto do mês e ajusta valor do aporte |
| `STP-LOSS` | Stop-Loss Programático | Venda automática se ativo cair X% do pico |
| `REB-SMART` | Rebalanceamento Dinâmico | Mantém % alvo entre USDC/PAXG/USDY automaticamente |
| `TGT-PRICE` | Target Price (Ordem Limit) | Compra se ativo tocar preço-alvo (não só % de queda) |
| `CUSTOM-NL` | Regra em Linguagem Natural | Cliente final dita a regra em texto; IA estrutura |

### 4.3. Customização White-Label

O parceiro pode **renomear todos os gatilhos**, customizar:
- Ícone e cor do card
- Texto de descrição (com variáveis dinâmicas tipo "seu limite de R$ X")
- Ordem de exibição
- Pré-preenchimento de parâmetros (default onboarding)

**Restrição:** Gatilhos não podem ser **rebautizados de forma que induza a erro** (ex: chamar "Stop-Loss" de "Renda Garantida"). Compliance review em 48h para qualquer customização de copy.

---

## 5. Estrutura Contratual — Cláusulas-Chave

Esta seção é o esqueleto das cláusulas que seu advogado vai validar. **Não é texto contratual final** — é um framework de negociação.

### 5.1. Partes e Papéis

- **CONTRATANTE (Parceiro B2B):** Controlador dos dados do cliente final. Responsável pela relação comercial e pelo uso do produto dentro do app dele.
- **CONTRATADA (Operador):** Enabler tecnológico. Processa dados como operador (LGPD Art. 39). Fornece a infraestrutura e responde pela execução técnica.
- **Subcontratados autorizados:** Efí Bank (Open Finance/ITP), Woovi (Pix), Parceiro CaaS (Liquidação cripto). Todos com DPA (Data Processing Agreement) vigente.

### 5.2. Propriedade e Uso de Dados

| Quem | O que |
|---|---|
| Cliente Final (usuário do app do parceiro) | Dono dos dados pessoais e financeiros |
| Parceiro B2B | Controlador — define finalidade e uso |
| Operador (nós) | Operador — processa exclusivamente para executar o serviço contratado |
| Dados agregados/anonimizados | Podem ser usados pelo Operador para melhoria do produto, **desde que** não permitam re-identificação |

> **Portabilidade:** Ao final do contrato, parceiro recebe export completo em JSON + CSV dos dados dele, dos usuários dele e do histórico de transações (formato legível por máquina, prazo de 30 dias após solicitação).

### 5.3. Responsabilidade e Indenização

**Operador é responsável por:**
- Falha técnica na execução de ordem validada pela governança
- Indisponibilidade acima do SLA sem justificativa
- Vazamento de dados por falha de segurança nossa
- Não-cumprimento de obrigação operacional (subcontratado falhar = nosso problema com o parceiro)

**Parceiro B2B é responsável por:**
- Uso do produto fora do escopo contratado
- Comunicação enganosa ao cliente final sobre a natureza da operação
- Não-cumprimento de obrigação regulatória própria (ex: CVM se for corretora)
- Onboarding inadequado do cliente final (KYC, suitability)

**Limite de indenização mútua (cap):** 12 meses de SaaS Base efetivamente pago, exceto em casos de dolo, fraude ou violação de confidencialidade (sem cap).

### 5.4. Compliance e Regulação

- **Open Finance:** Operador mantém homologação ativa junto ao BC e arca com custo de auditoria anual
- **LGPD:** Operador mantém DPO nomeado, RIPD atualizado, política de privacidade pública
- **PLD/FT:** Operador aplica controles de detecção de transações suspeitas (threshold + velocity check) e reporta ao parceiro
- **CVM/Banco Central:** Parceiro declara sua adequação regulatória e mantém licenças necessárias para seu modelo de negócio

### 5.5. Níveis de Serviço (SLA) e Créditos

- SLA conforme tabela da Seção 3.3
- Créditos por SLA não cumprido: automáticos no ciclo seguinte, sem necessidade de solicitação
- Parceiro pode solicitar **auditoria técnica** (1x ao ano) com custo de R$ 15.000 (cobertura de até 5 dias de engenheiro sênior) — abatível em SaaS futuro se não houver findings materiais

### 5.6. Vigência, Renovação e Rescisão

- **Vigência inicial:** 12 meses
- **Renovação:** Automática por iguais períodos, salvo notificação de não-renovação com 60 dias de antecedência
- **Rescisão sem justa causa:** Após 12 meses, qualquer parte pode rescindir com 90 dias de aviso
- **Rescisão por justa causa:** Inadimplência > 30 dias, violação material de confidencialidade, falência, mudança de controle sem aviso prévio
- **Período de transição pós-rescisão:** 90 dias com tarifas normais, durante os quais parceiro migra usuários para outra solução

### 5.7. Confidencialidade e Não-Solicitação

- Confidencialidade recíproca por 5 anos pós-término
- Não-solicitação de funcionários: 12 meses pós-término (mútuo)
- Exceção:招聘 via anúncio público ou indicação de headhunter não viola

### 5.8. LGPD — Cláusulas Específicas

- Operador Designado (DPO) com contato direto
- Encarregado de tratamento de incidentes com SLA de notificação de 24h ao parceiro
- Bases legais de tratamento: execução de contrato (Art. 7º, V) e legítimo interesse para melhoria de produto (Art. 7º, IX), sempre com possibilidade de opt-out
- Transferência internacional (se houver) apenas para países com nível adequado ou com cláusulas-padrão contratuais

---

## 6. Go-to-Market: Como Vender Esse Pacote

### 6.1. ICP (Ideal Customer Profile) — Em Ordem de Prioridade

| Prioridade | Tipo de Parceiro | Por que comprar de você |
|---|---|---|
| 🥇 **P0** | **Corretoras de cripto com app próprio** | Já têm cliente cripto, precisam de automação + fiat onboarding |
| 🥇 **P0** | **Gateways de pagamento (Pix)** | Querem diferenciar de Mercado Pago/PagSeguro com IA |
| 🥈 **P1** | **Fintechs de gestão financeira pessoal** | Já falam com o cliente sobre dinheiro; agregam produto de proteção |
| 🥈 **P1** | **ERPs e SaaS de gestão PJ** | Oferecem rendimento automático no caixa — diferencial competitivo absurdo |
| 🥉 **P2** | **Bancos digitais e neobanks** | Mais burocráticos, mas ticket alto; vender via casos de uso de mercado |
| 🥉 **P2** | **Plataformas de fidelidade e cashback** | Volume alto, ticket baixo; bom pra Scale tier |

### 6.2. Argumentos de Venda (Por Dor)

**Dor: "Levaria 1 ano pra homologar Open Finance próprio"**
> *Você não precisa. A gente já tem a homologação rodando. Seu app entra em produção em 2 semanas. Você economiza R$ 1M de capital regulatório e 12 meses de timeline.*

**Dor: "Não tenho squad de IA/ML"**
> *Você não precisa. A IA que traduz intenção em regra é nossa. Você só pluga os gatilhos no app. Em 1 sprint, você tem feature de IA rodando.*

**Dor: "Já tentei integrar com Efí/Woovi e foi um parto"**
> *A gente já fez essa integração. Você não vai brigar com documentação bancária. Você consome nossa API, a gente consome a deles.*

**Dor: "Meu cliente quer investir mas não confia em cripto"**
> *O sandbox de finanças espelhadas (incluído no Growth+) deixa ele testar no fictício antes. Sem risco, sem custódia, sem rejeição.*

**Dor: "Tenho medo de problema regulatório"**
> *A gente arca com a homologação Open Finance e a auditoria de segurança. Você fica com o que importa: o relacionamento com seu cliente.*

### 6.3. Ciclo de Venda — Típico

| Fase | Duração | Atividade |
|---|---|---|
| Descoberta | 1 semana | Reunião com CTO/CPO, demo de 30min |
| Avaliação técnica | 2-3 semanas | Parceiro testa em sandbox (acesso grátis por 30 dias) |
| Negociação comercial | 1-2 semanas | Alinhamento de tier, take-rate, customizações |
| Jurídico | 2-4 semanas | Contrato + DPA + termos de uso específicos |
| Setup + Integração | 4-8 semanas | Onboarding técnico, white-label, go-live em produção |
| **Total típico** | **10-18 semanas** | Até primeira transação real |

### 6.4. Modelo de Receita Projetada (Próximo Ano)

Cenário conservador (3 parceiros Growth + 1 Scale):

| Fonte | Q1 | Q2 | Q3 | Q4 | Anual |
|---|---|---|---|---|---|
| SaaS Base | R$ 51k | R$ 66k | R$ 99k | R$ 116k | R$ 332k |
| Take-Rate (volume) | R$ 28k | R$ 45k | R$ 82k | R$ 130k | R$ 285k |
| Spread Cripto | R$ 35k | R$ 58k | R$ 95k | R$ 140k | R$ 328k |
| Setup (one-time) | R$ 110k | R$ 35k | R$ 60k | R$ 0 | R$ 205k |
| **Total** | **R$ 224k** | **R$ 204k** | **R$ 336k** | **R$ 386k** | **R$ 1.150k** |

> ARR projetado fim de ano 1: **~R$ 1,1M** (cenário conservador com 1 cliente perdido/renegociado).

---

## 7. Próximos Passos Operacionais

### 7.1. Antes de Vender (Você precisa ter pronto)

- [ ] Sandbox self-service público (URL com playground pros prospects testarem)
- [ ] Documentação da API (OpenAPI/Swagger) — mínimo 80% coberto
- [ ] Contrato modelo + DPA revisados por advogado de Open Finance
- [ ] Política de Privacidade e Termos de Uso no ar
- [ ] Estudo de caso real (sua própria carteira de USDC) com números públicos
- [ ] Equipe de suporte P1/P2 treinada (mínimo 1 SRE + 1 CS)

### 7.2. Primeiros 90 Dias de Comercialização

1. **Semana 1-2:** Listar 30 prospects P0 (corretoras + gateways), outreach direto via LinkedIn do CEO/CTO
2. **Semana 3-4:** 10 reuniões de descoberta, 3 demos agendadas
3. **Semana 5-8:** 2-3 prospects em sandbox, 1 em negociação comercial
4. **Semana 9-12:** Fechar 1º contrato + iniciar setup do 1º cliente pago

### 7.3. Riscos a Mitigar Imediatamente

| Risco | Mitigação |
|---|---|
| Efí mudar pricing ou API quebrar | Contrato plurianual com a Efí + redundância técnica (manter adapter pra Matera/Celcoin) |
| Parceiro B2B usar nossos dados pra clonar | Cláusula de não-reengenharia + auditoria anual |
| Volatilidade cripto prejudicar o take-rate | Spread dinâmico ajustado por oráculo + seguro de custódia |
| Regulação do BC mudar regras de ITP | Comitê jurídico consultivo + participar ativamente das consultas públicas |

---

## 8. Anexo — Glossário de Termos do Contrato

- **MAU (Monthly Active User):** Usuário final único que executou ou teve ao menos 1 gatilho avaliado no mês
- **Trigger Avaliado:** Gatilho cujas condições de mercado foram checadas, independentemente de ter executado
- **Transação Executada:** Operação financeira completa (Pix enviado + cripto liquidada) com sucesso
- **Take-Rate:** Valor variável cobrado por transação executada
- **Spread de Conversão:** Diferença entre taxa de mercado e taxa cobrada do cliente final na conversão BRL↔Token
- **AUM (Assets Under Management):** Volume total de ativos (USDC/PAXG/USDY) custodiados em nome dos clientes finais do parceiro
- **DPA (Data Processing Agreement):** Contrato de tratamento de dados pessoais conforme LGPD
- **CaaS (Crypto-as-a-Service):** Provedor de liquidez e custódia de ativos digitais
- **BaaS (Banking-as-a-Service):** Provedor de infraestrutura bancária (Open Finance, ITP, contas)
- **TEE (Trusted Execution Environment):** Ambiente de execução isolado de software (referência para futuras evoluções de segurança)

---

**Documento preparado para revisão e ajuste de pricing com base em:**
- Benchmarking Efí Bank B2B, Woovi/OpenPix, Matera, Celcoin (preços praticados em 2025-2026)
- Padrão de mercado de BaaS latino-americano (Belvo, Pomelo, Dock)
- Custo real de Open Finance + ITP + spread CaaS no Brasil
- Margem mínima de 35% sobre custo operacional (meta de contribution margin)

**Versão 1.0 — pronto para rodada de feedback com:**
- Sócios / co-fundador
- Advogado especializado em Open Finance
- 2-3 prospects âncora (entrevistas de discovery, não venda)
