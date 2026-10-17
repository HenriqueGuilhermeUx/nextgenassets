# NextGen Assets — Efí real: correção de exposição e checklist de lançamento (2026-10-17)

## Contexto e limites
Foi solicitada reutilização da **aplicação Efí de produção já existente** para Pix Automático. Esta mudança **não** cria adesão, cobrança, débito, repasse, PIX OUT, atualiza webhook Efí ou altera configurações bancárias. A produção Render `nga-api`, branch `main`, tem auto deploy; **NÃO mesclar este PR sem preparar o consumidor das rotas administrativas.**

## Riscos confirmados no código legado
1. `WebhooksAdminController`, prefixo `/v1/admin/webhooks`, era publicamente alcançável sem um guard local, inclusive `POST /migrate` (SQL arbitrário), testes financeiros, saques, atualizações e diagnósticos de certificado. Esta PR adiciona `@UseGuards(EfiOperationsGuard)` à classe inteira, recusando sem `NEXTGEN_ADMIN_TOKEN` forte (mínimo 32 caracteres) em cabeçalho `x-nextgen-admin-token`.
2. `scripts/efi/teste_efi.js` continha **Client_Id e Client_Secret embutidos** em fallback e imprimia prefixo de token OAuth. Esta PR remove os valores embutidos e não registra tokens. **O histórico Git público ainda os contém.** Ambas as credenciais precisam ser **rotacionadas/revogadas na Efí**, com atualização do secret no Render de produção pelo responsável, antes de considerá-las seguras. Não copiar os valores expostos.
3. `/v1/webhooks/efi-public` é um receptor legado cuja origem não é validada no controller. Antes de qualquer Pix real adicional, confirmar exigência Efí para assinatura/mTLS, proteger callback e reduzir dados bancários gravados em logs/auditoria. Evitar trocar o endpoint de webhook atual antes de homologar e fazer plano de rollback.
4. As rotas administrativas existentes podem ser chamadas por painéis/crons sem cabeçalho. Inventariar tais consumidores e migrá-los para um canal autenticado seguro, sem pôr o segredo no browser ou URL.

## Critérios anteriores ao merge
- Definir `NEXTGEN_ADMIN_TOKEN` específico para **produção** no Render, de alta entropia, fora de Git/cliente web; assegurar secret diferente no staging.
- Auditar os consumidores de `/v1/admin/webhooks/**`, atualizar cada automação, testar 401/503 sem segredo e operações autorizadas com token no cabeçalho.
- Rotacionar na Efí os segredos historicamente expostos; avaliar também a rotação do certificado, se um P12 tiver sido publicado. Examinar logs/uso indevido.
- Bloquear SQL arbitrário mesmo com token por política de privilégio mínimo em um hardening posterior; o token administrativo sozinho não é modelo final de segurança.
- Corrigir o webhook público legado e executar testes end-to-end (eventos não autenticados, replays, duplicidade de pagamento, conciliação bancária, observabilidade sem dados pessoais).
- Revisar contrato de recebimento centralizado e repasse D+1 pela conta Efí Empresas, segregação patrimonial e responsabilidades de compliance.

## Escopos oficiais Efí que devem existir na aplicação de PRODUÇÃO
`gn.opb.automatic.consent.read`, `gn.opb.automatic.consent.write`, `gn.opb.automatic.payment.read`, `gn.opb.automatic.payment.write`; para consultas de configuração/participantes, `gn.opb.config.read`, `gn.opb.participants.read`. Efí exige certificado mTLS e conta Digital Efí Empresas para pagamentos automáticos. Confirmar os escopos no painel antes de chamadas.

Fontes: https://dev.efipay.com.br/docs/api-open-finance/credenciais/ e https://dev.efipay.com.br/docs/api-open-finance/pagamentos-automaticos/

## Status
A PR é exclusivamente uma **proposta de segurança**. Não foi realizado GET autenticado de banco, OAuth com credenciais de produção, criação de mandato, pagamento ou transferência real. A `NEXTGEN_EFI_AUTOMATIC_ENABLED` deve permanecer DESLIGADA no ambiente de testes e o estado da produção deve ser preservado.
