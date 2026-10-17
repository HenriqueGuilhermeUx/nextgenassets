# NextGen — Pix Automático Efí conectado à recorrência (RFC 002)
Data: 2026-10-15. Status: **plano de implementação em branch isolada, sem go-live**.

## Diretriz do produto
A NextGen NÃO implementará motor de recorrência paralelo, não integrará Pluggy e não buscará ITP próprio nesta fase. Reutilizar as estruturas existentes `smart_billing_customers`, `smart_billing_recurrences`, `smart_billing_charges`, notificações e módulos da Efí. O usuário-empresa vê: configurar contrato -> solicitar autorização bancária -> ativar cobrança automática -> acompanhar ciclos -> conciliar -> repasse.

## Duas ofertas possíveis da Efí
1. **Open Finance Efí — pagamentos automáticos:** já há tentativa de integração nos arquivos `efi-of.service.ts` e `efi-of-admin.controller.ts`, usando `POST /v1/pagamentos-automaticos/adesao` e `POST /v1/pagamentos-automaticos/pix`. Beneficiário é indicado na adesão. **Ainda confirmar contratualmente** se pode usar beneficiários diferentes da titular da aplicação Efí.
2. **API Pix Efí — recebedor:** `POST /v2/rec`, `POST /v2/solicrec`, `PUT /v2/cobr/:txid` e `POST /v2/cobr/:txid/retentativa/:data`. Precisamos confirmar conta recebedora, tarifa, eventuais limites e modalidade contratada. Não pressupor que split de `cob`/`cobv` se aplique a `cobr`.

Documentação:
- https://dev.efipay.com.br/docs/api-open-finance/pagamentos-automaticos/
- https://dev.efipay.com.br/docs/api-pix/pix-automatico/
- https://dev.efipay.com.br/docs/api-pix/split-de-pagamento-pix/
- https://www.bcb.gov.br/estabilidadefinanceira/pix-automatico-recebedores

## Decisão financeira a confirmar
**Modalidade A — recebimento centralizado**: pagador -> conta NextGen Efí -> ledger segregado por empresa -> saldo disponível -> instrução de repasse Efí -> comprovação bancária -> status processado. A NextGen não deve anunciar repasse automático até existir API bancária de execução, conciliação e critérios contratuais/regulatórios claros. O atual `settlements/mark-settled` e `payout-requests/mark-processed` mudam estado; não provam transferência real.

**Modalidade B — recebimento direto**: pagador -> conta da empresa cliente (se favorecido terceiro permitido) -> NextGen presta software e cobra assinatura. Menor fluxo de dinheiro de terceiros, mas depende de homologação e permissão Efí. Separar do modo centralizado; nunca alterar destinatário de uma autorização existente.

## GAPs confirmados no repositório
- `SmartBillingRecurrencesController.generateDue` gera Pix comum `PIX_LINK`, não chama Efí. `dryRun` default FALSE e rota `POST /generate-due` não demonstra auth em nível de controller. Scheduler precisa idempotência/lock/unique constraint em ciclo.
- `EfiOFAdminController`: existem endpoints para adesão e pagamento, mas faltam vinculação a recurrenceId, tenant auth forte, seleção segura de favorecido, agendamento, controle robusto de tentativas e confirmação de liquidação.
- `EfiOFWebhookReceiverController`: registrar `rawWebhook` e atualizar consentimento exige revisão de autenticidade, anti-replay, retenção e minimização de dados. Não tratar evento não autenticado como autorização bancária.
- `SmartBillingSettlementsController` calcula e marca liquidação administrativa, não comprova um PIX OUT real.
- `SmartBillingPayoutRequestsController` calcula saldo estimado com cobranças `PAID` e marca solicitação processada, não executa repasse bancário.
- `smart_billing_recurrences` atual suporta agenda mensal; valores por cliente, período e segmentação devem continuar no mesmo contrato, com `payment_mode` ou tabela auxiliar.

## Integração em etapas
### Fase 1 — segurança antes de débitos
- Autenticação JWT/tenant no servidor, controle RBAC e checks de ownership em **todos** os endpoints financeiros.
- Desabilitar endpoints antigos de teste/produção que iniciam transferências sem guardas; secrets nunca em query.
- Remover logging de payload bruto de webhook; verificar autenticidade segundo Efí, proteger replay.
- Flags `NEXTGEN_EFI_AUTOMATIC_ENABLED=false`, `NEXTGEN_EFI_AUTOMATIC_LIVE=false` default, escopo por tenant.
- Banco: criar `nextgen_recurrence_authorizations` (recurrence_id, tenant_id, efi_id, status, verified_at, beneficiary_snapshot) e `nextgen_recurrence_cycles` (tenant_id, recurrence_id, due_month, status, amount_cents, provider_ref, idempotency_key), índice unique(tenant_id, recurrence_id, due_month).
- Inbox/outbox para webhooks, eventos e auditoria.

### Fase 2 — adaptar motor atual, sem reinventar
- `efi-automatic-provider` chama client Efí **existente**; não copiar token/mTLS/OAuth.
- `activateAutomatic(recurrenceId)` -> criar adesão na Efí, salvar ID e link seguro para o pagador. Status `PENDING_BANK_AUTHORIZATION`, nunca `ACTIVE_AUTOMATIC` antes da verificação bancária.
- Scheduler de `generateDue` seleciona `payment_mode` com transação e lock:
  - `PIX_AUTOMATIC` + consentimento confirmado -> cria ciclo idempotente e instrui pagamento Efí na janela correta;
  - `PIX_LINK` -> preserva fluxo atual;
  - falhou/revogado -> aviso + alternativa de pagamento **sem iniciar segunda cobrança automaticamente**.
- Status separados: ciclo `SCHEDULED/SETTLED/FAILED`, invoice `PENDING/PAID`, mandato `PENDING/AUTHORIZED/REVOKED`. Recebido/PAID apenas depois de confirmação real de liquidação.
- Retentativas conforme política autorizada e rota Efí aplicável, sem duplicar valores/ordens.

### Fase 3 — comunicação e repasse
- Mensagens transacionais via consentimento e templates aprovados em e-mail/WhatsApp, com dedup e opt-out das mensagens não obrigatórias.
- Relatório de tentativas, taxas e inadimplência. Reconciliação Efí por E2E ID e referência do ciclo.
- Para repasse centralizado: ledger com saldos brutos, taxas, ajustes, bloqueios e disponíveis; payout queue + Pix out realmente confirmado; nunca considerar 'processed' como evidência de transferência sem comprovante bancário.

### Fase 4 — sandbox -> piloto
- Contrato de 12 meses, um pagador controlado e 1 ciclo; autorização, recusa, revogação, pagamento, falha, retry, webhook duplicado e conciliação.
- Testes negativos de tenant A versus B. Dois schedulers concorrentes não podem emitir dois Pix.
- Regressão dos antigos fluxos Woovi/Pix/Cobranças/Repasse e Smart Operations.
- Só migrar as contas reais com aceite comercial/contratual, sem alteração silenciosa de favorecido.

## UX
Painel por segmento permanece `/tipo-negocio` e `/recorrencias`. Dentro da recorrência, botão `Ativar Pix Automático`, com link para autorização no banco do pagador. Status: `Aguardando autorização`, `Ativa`, `Falhou`, `Revogada`. Resumo: contratos, ciclos pagos/pendentes, próxima cobrança e valor disponível para repasse.

## Questões para Efí
1. App Open Finance atual está com escopos `gn.opb.automatic.*` ativos em produção? A conta digital Efí Empresas está habilitada para o Pix Automático recebedor `rec/solicrec/cobr`?
2. Favorecidos PJ terceiros são permitidos na integração OF atual? Qual onboarding e contrato para cada recebedor? Há obrigação de que beneficiário corresponda ao titular?
3. Se recebimento for centralizado na NextGen: regime jurídico/contrato, identificação do cedente, guarda de recursos, conciliação, limites, Pix OUT, tarifa e SLA?
4. Quais eventos, estados finais e regras de repetição; webhook assinado/mTLS, consultas, homologação e prazos?
5. Cobranças Pix Automático `cobr` suportam split Efí? Não presumir; a documentação de split menciona `cob` e `cobv`.
