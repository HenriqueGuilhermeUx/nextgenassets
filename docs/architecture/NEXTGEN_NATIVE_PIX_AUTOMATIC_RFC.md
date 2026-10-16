# NextGen Native Pix Automático — RFC 001

**Status:** arquitetura proposta, sem go-live / sem habilitação regulatória confirmada  
**Data:** 2026-10-15  
**Escopo:** NextGen atual. Não é integração Pluggy, nem produto paralelo.

## Objetivo

A NextGen será proprietária do motor de recorrência e iniciação de pagamentos: APIs para empresas, mandatos, jornadas de autorização, scheduler, conciliação, retentativas, contingência e telemetria. O objetivo de longo prazo é a atuação regulada como **prestador de serviço de iniciação (PSI/ITP) no Open Finance**, sujeita a autorização/habilitação, testes e requisitos aplicáveis.

O consentimento do pagador **não pode ser fabricado pelo backend**. Somente o banco do pagador e/ou fluxo regulamentado pode validar autorização Pix Automático. Nenhum ciclo deve ser iniciado antes da confirmação oficial.

## Modelo operacional

```text
Empresa cliente -> NextGen API -> Contrato/Recorrência
                                      |
Pagador -> Jornada bancária oficial -> Mandato AUTORIZADO
                                      |
                              NextGen Scheduler
                                      |
                             Verificar limites e mandato
                                      |
                           Iniciação regulada via Open Finance
                                      |
                            Banco pagador / liquidação
                                      |
                       Webhook assinado / consulta / conciliação
                                      |
                      Ledger NextGen / notificação / relatórios
```

## Limites institucionais

- A NextGen pode programar o domínio, UI, simulador, contratos, cobranças, conciliação e APIs independentemente.
- **Pix Automático interbancário real exige participação institucional via PSP ou PSI autorizado/habilitado**, de acordo com o Banco Central. Para autonomia de iniciação pretendida, estudar ITP/PSI próprio; a NextGen não deve se apresentar como participante antes da habilitação formal.
- A NextGen **não precisa necessariamente custodiar dinheiro** como iniciadora: o recebedor recebe na sua instituição de conta, conforme arranjo e autorização.
- Estudar as normas vigentes, inclusive alterações de capital mínimo da Resolução Conjunta 14/2025, antes de afirmar montantes, prazos ou custos regulatórios.
- Não fazer redirecionamento falso nem capturar credenciais/biometria bancárias dos pagadores.

Fontes oficiais:
- https://www.bcb.gov.br/estabilidadefinanceira/pix-automatico-participantes
- https://www.bcb.gov.br/estabilidadefinanceira/participantespix
- https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=513&tipo=Instru%C3%A7%C3%A3o+Normativa+BCB
- https://openfinancebrasil.atlassian.net/wiki/spaces/OF/pages/1217527809/Pix%2BAutom%2Btico

## Arquitetura — módulos novos (futuro)

```text
apps/api/src/modules/native-automatic-pix/
  domain/
    recurrence.ts, mandate.ts, payment-cycle.ts, state-machine.ts
  application/
    create-mandate.usecase.ts
    receive-consent-result.usecase.ts
    schedule-cycles.usecase.ts
    retry-policy.usecase.ts
    reconcile-settlement.usecase.ts
  ports/
    BankAuthorizationGateway.ts
    PaymentInitiationGateway.ts
    PaymentsEventPublisher.ts
  adapters/
    sandbox-bank.adapter.ts
    open-finance-regulated.adapter.ts    # habilitar somente após autorização
  infrastructure/
    repository.ts
    webhook-validator.ts
    job-queue.ts
  api/
    automatic-pix.controller.ts
```

Integração interna: relacionar `smart_billing_customers`, `smart_billing_recurrences` e `smart_billing_charges` por IDs explícitos, **sem alterar nem reutilizar indevidamente status atuais**. Preservar Pix, split, webhooks e repasses legados.

## Máquina de estados mínima

**Mandato**: DRAFT -> AUTHORIZATION_PENDING -> AUTHORIZED -> SUSPENDED | REVOKED | EXPIRED | REJECTED.
- `REJECTED`, `REVOKED`, `EXPIRED` não podem iniciar ciclos.
- Cancelamento/revogação a qualquer momento deve bloquear **novas** iniciações, respeitando regras oficiais sobre instruções já aceitas e agendadas.
- Uma autorização real só ocorre após confirmação verificada de evento/consulta ao participante.

**Ciclo**: PLANNED -> ELIGIBLE -> SUBMITTED -> SCHEDULED -> SETTLED | FAILED | CANCELLED.
- `SETTLED` somente mediante prova verificável da liquidação (não somente HTTP 200 ao criar instrução).
- `FAILED` pode gerar retentativa somente se permitida pelo mandato, regras do arranjo e janela regulatória.
- IDs externos e chaves de idempotência por `tenant + mandate + competência + tentativa`.

## Modelo de dados (planejamento de migrations)

- `ng_auto_mandates`: tenant_id, payer_ref, recipient_ref, external_mandate_id, consent_evidence_ref, amount_cap, frequency, start_at, end_at, status, provider_metadata_redacted.
- `ng_auto_cycles`: tenant_id, mandate_id, competence, due_at, amount_cents, retry_count, attempt_limit, status, settlement_ref; unique(tenant_id, mandate_id, competence).
- `ng_auto_attempts`: tenant_id, cycle_id, attempt_no, request_id, bank_ref, status, error_code; unique(tenant_id, cycle_id, attempt_no).
- `ng_auto_webhook_inbox`: tenant_id, source, event_id, signature_verified_at, received_at, processed_at, processing_status; unique(source, event_id).
- `ng_auto_outbox`: tenant_id, event_type, entity_id, payload_redacted, published_at.
- `ng_auto_audit`: tenant_id, actor_id, action, entity_id, previous_state, next_state, timestamp; sem documentos, CPF, token ou consentimento bruto nos logs.

Chaves estrangeiras, restrições de unicidade, RLS e testes de isolamento devem ser entregues **antes** do go-live. Evitar `partnerSlug` controlado pelo cliente como identidade/autorização.

## APIs alvo (nenhuma confirmada como implantada)

- `POST /v1/automatic-pix/mandates` — cria intenção; jamais autoriza por conta própria
- `GET /v1/automatic-pix/mandates/:id`
- `POST /v1/automatic-pix/mandates/:id/cancel`
- `GET /v1/automatic-pix/mandates/:id/cycles`
- `GET /v1/automatic-pix/dashboard`
- `POST /v1/automatic-pix/sandbox/events` — **somente sandbox isolado**
- Webhook regulado: autenticação mTLS/assinatura conforme especificação, replay-protection, inbox idempotente; não publicar endpoint operacional sem validações.

## Segurança obrigatória

- Autenticação e autorização reais (RBAC + tenant derivado da sessão, não de query/body).
- Segredos em cofre/Render env, certificados e chaves privadas protegidos, rotação, zero frontend.
- Assinatura verificável dos eventos, controles anti-replay, reconciliação de inconsistências.
- Scheduler com fencing lock, transação, unique index, retry backoff, circuit breaker, DLQ e alarmes.
- Dados pessoais mínimos, criptografia em repouso, retenção e descarte documentados, auditoria LGPD.
- Consentimentos, limites, status e finalidade exibidos com transparência.
- Canary/feature flag default OFF; proibir produção enquanto autorização/homologação pendentes.

## Fases

1. **Engine independente e sandbox bancário**: domínio, migrations, UI, endpoints autenticados, testes de contrato e de estados, sem débitos.
2. **Operação NextGen**: comunicação, agendador, reconciliação, inadimplência, portal empresa/pagador, SDK/API B2B.
3. **Habilitação institucional**: análise societária, regulatória, capital, segurança, Open Finance/Pix, certificações/homologação e contrato/participação aplicável.
4. **Conexão regulamentada direta**: habilitar adapter só após documentação regulatória e teste formal; piloto limitado, observabilidade, rollback.
5. **Escala**: múltiplos CNPJs recebedores, rate limits, SLA, suporte e precificação por conta/contrato/ciclo.

## Acceptance gates

- Sem segredo em Git ou frontend; secret scanning contínuo.
- Não pode autorizar mandato a partir de confirmação manual de operador.
- Não pode criar duas cobranças para o mesmo ciclo; concorrência e webhook duplicado testados.
- Estado `SETTLED` exige evidência de liquidação.
- Isolamento por tenant comprovado com testes negativos.
- Cancelamentos, falhas, limites e tentativas respeitados.
- Regressões Pix/Smart Billing/Smart Operations passando no CI.
- Migração reversível e rollout por preview/staging, sem deploy automático em produção.

**Bloqueios atuais:** não há evidência de habilitação NextGen como PSI/ITP nem de infraestrutura regulada direta validada. Módulos existentes da NextGen (Pluggy/Efí/recorrências) são legados de implementação, não comprovam tal condição.
