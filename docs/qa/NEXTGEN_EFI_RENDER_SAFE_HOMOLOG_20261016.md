# NextGen Pix Automático — plano de homologação Efí no Render (2026-10-16)

## Inventário verificado (sem alterar produção)

**Render workspace:** Henrique's workspace (`tea-d2ebbindiees73fm160g`).

**API de produção:** `nga-api` (`srv-d8iv00l8nd3s73e0tih0`). Repo `HenriqueGuilhermeUx/nextgenassets`, branch `main`, runtime Docker `deploy/docker/api.Dockerfile`, **autoDeploy ativo**, último deploy live `dep-db62au2jnfac73c5mc2g` em 2026-10-12, commit `15bb5ed4f676ecced3976ab284c59f0a5c95b0cf`. NÃO alterar env ou fazer deploy desta API durante o teste Efí.

**Cron jobs de produção ativos:** `nextgen-recurrences-cron` e `nextgen-email-notifications-cron` apontam para `api.nextgenassets.com.br`. Os testes sandbox devem usar **exclusivamente uma nova URL staging**, sem configurar esses crons nem compartilhar os secrets de produção.

**Outro serviço de homologação existente:** `nextgen-woovi-homolog`, branch `feature/nexoffice-receiving-account-onboarding-v1`. Não reutilizar/desconfigurar sem decisão sobre o escopo Woovi.

**Banco:** nenhum Postgres chamado NextGen/NextGenAssets foi identificado na listagem Render desse workspace. O backend Prisma usa `DATABASE_URL`; isso NÃO prova que o banco seja Render. Não inferir conexão de produção nem aplicar migration até localizar e provisionar uma base staging **isolada**.

**Branch testada (não publicada):** `feature/nextgen-efi-auto-recurring-bridge` / PR #8. CI `38982552803` finalizado com sucesso: testes Efí, D+1, contrato SQL em Postgres efêmero 16, build NestJS e build Next.js marketing. Não inclui chamadas bancárias reais.

## Preparação segura de staging (a executar quando autorizado)

1. Provisionar ou identificar **Postgres staging exclusivo NextGen** sem copiar dados pessoais/reais. Criar `DATABASE_URL` privado apontando SOMENTE a esse banco. Se houver criação de recursos cobrados no Render, obter aprovação de custo/plano antes.
2. Provisionar serviço Render `nextgen-efi-auto-homolog` no **mesmo workspace**, branch `feature/nextgen-efi-auto-recurring-bridge`, **autoDeploy=no**, runtime Docker, Dockerfile `deploy/docker/api.Dockerfile`, URL distinta de produção. Não ligar domínio `api.nextgenassets.com.br`.
3. Configurar só no ambiente seguro os **certificados e credenciais de homologação Efí** (NUNCA reutilizar certificados/Client ID/Secret de produção). `EFI_OF_API_URL` e `EFI_OAUTH_URL` devem ter exclusivamente host `openfinance-h.api.efipay.com.br` conforme o contrato sandbox.
4. Primeiro deploy: `NEXTGEN_EFI_AUTOMATIC_ENABLED=false`, `NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS=false`, `NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS=false`, `NEXTGEN_CENTRALIZED_D1_ENABLED=false`. Exigir `NEXTGEN_ADMIN_TOKEN` específico da homologação, forte e nunca no browser.
5. Rodar migrations de `database/migrations/20261016_nextgen_efi_automatic_bridge.sql` e `database/migrations/20261016_nextgen_centralized_d1_payout.sql` somente no banco staging depois de backup e validação. Não executar `prisma migrate reset` em nenhum banco que contenha dados reais.
6. Primeiro executar smoke de saúde e autenticação: endpoints administrativos 401 sem token, fail-closed de webhook; DNS/TLS Efí, OAuth sandbox, escopos e mTLS. **Não solicitar Pix nem dinheiro.**
7. Habilitar **somente** `NEXTGEN_EFI_AUTOMATIC_ENABLED=true` e iniciar teste com um contrato/empresa/pagador fictício. Depois permitir `NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS=true`, gerando e consultando uma autorização apenas com identidade permitida pelo sandbox.
8. Validar status retornado pela Efí (pendente -> autorizado/rejeitado/revogado) e comparação de valor, recebedor, frequência, início e expiração. A URL de retorno do banco não autoriza mandato sozinha.
9. Confirmar idempotência: duas requisições simultâneas para mesma autorização e mesmo ciclo -> só uma instrução; consulta de eventos duplicados não pode duplicar saldo.
10. Só após etapa anterior, habilitar **na sandbox** `NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS=true`, executar um único ciclo fictício, consultar referência e resultado. **HTTP 200 não é pagamento liquidado**; nunca atualizar `PAID`, ledger ou repasses sem evidência de banco.
11. Para D+1, teste de políticas e calendário bancário com feriados; habilitar flag `NEXTGEN_CENTRALIZED_D1_ENABLED` somente para registros importados por reconciliador bancário de staging. O módulo atual apenas **agenda** repasses: não existe Pix OUT validado nessa PR.
12. Pilotar no banco e conta reais somente após aceite técnico, operacional, jurídico/regulatório e contratual da Efí para **recebimento centralizado e repasse de fundos de terceiros**.

## Travas de aprovação

- Serviços, banco, credenciais, certificados e callbacks de staging devem ser exclusivos. Nenhuma variável de `nga-api` alterada.
- Não criar cron de staging que aponta para produção.
- Logs não podem conter CPF, token, assinatura, URL privada, chave Pix, payload bancário integral.
- HMAC/mTLS do webhook e anti-replay; casos de consentimento revogado antes do agendamento.
- Evidência bancária de Pix OUT e de crédito na conta da empresa ANTES de publicar oferta de repasse D+1 como disponibilidade geral.
- Migrar e liberar por feature flag e tenant piloto, preservando Pix comum e contratos legados. O estado de produção permanece separado da PR rascunho.

## Estado executado — 2026-10-17 (somente homologação)

- Neon conectado, organização Free, projeto EXCLUSIVO `nextgen-efi-automatic-homolog` (`misty-bonus-57896528`), PostgreSQL 16 em `aws-us-west-2`, branch `br-nameless-boat-arrg6x01`, banco `nextgen_homolog`. Nenhum recurso de outro produto reutilizado.
- SQL-base da API gerado pelo **Prisma CLI real** em CI `38989120894`, PR #8, commit `f44d26ea4fec22e62708db4454c43877137d069f`: 75 instruções DDL aplicadas no Neon sem comandos destrutivos, 11 tabelas Prisma e 13 tipos enum.
- Migrações `20261016_nextgen_efi_automatic_bridge.sql` e `20261016_nextgen_centralized_d1_payout.sql` aplicadas em transação no **mesmo banco de homologação**, criando 8 tabelas específicas. `20260910_nextgen_smart_operations.sql` também aplicada, criando 10 tabelas Smart Operations. Em seguida foram aplicadas, a partir do DDL aditivo original dos controllers, cinco tabelas legadas de Smart Billing (clientes, cobranças, lembretes, recorrências e notificações). **Verificação final: 34 tabelas, sem parceiros, usuários ou pagamentos reais**.
- Render staging exclusivo `nextgen-efi-automatic-homolog` (`srv-db9bnsdg1s2s738485pg`), URL `https://nextgen-efi-automatic-homolog.onrender.com`, branch da PR #8, auto deploy DESLIGADO. `DATABASE_URL` apontado exclusivamente para Neon `nextgen_homolog` através de variável secreta no Render, sem expor credenciais no repositório.
- Segurança: `NEXTGEN_DISABLE_BACKGROUND_WORKERS=true`, `NEXTGEN_EFI_AUTOMATIC_ENABLED=false`, `NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS=false`, `NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS=false`, `NEXTGEN_CENTRALIZED_D1_ENABLED=false`. Variáveis existentes mescladas, não sobrescritas.
- Deploy de homologação iniciado automaticamente após alteração do ambiente: `dep-db9cjrm1egvs73eonchg` no commit `f44d26e`. Deploy `dep-db9cjrm1egvs73eonchg` terminou **LIVE**; logs em 2026-10-17 01:08 UTC confirmaram `Nest application successfully started`, porta `10000` e **dois workers legados desativados**. O teste HTTP público do endpoint de saúde ainda não foi confirmado externamente; não confundir boot com smoke HTTP.
- CI `38989120894` concluído com sucesso: 46 testes de serviços/guards/hooks bancários, build NestJS, build marketing e contrato SQL de Efí/D+1 em Postgres efêmero. CI subsequente `38989606748` também passou, agora aplicando **Prisma SQL + Smart Operations SQL + Efí + D+1 no mesmo Postgres temporário**. Nada disso prova uma transação bancária real.

**Operação segura futura:** NÃO rodar `prisma db push` indiscriminadamente nesse banco, porque há 18 tabelas SQL que não estão declaradas no `schema.prisma` e o Prisma poderá tentar removê-las. Não usar `--accept-data-loss`, `migrate reset`, importação de dados de produção ou credenciais produtivas. O SQL-base do Prisma foi criado em banco inicialmente isolado, somente com as oito tabelas Efí já aplicadas.

## Pendências reais de homologação bancária

- Confirmar disponibilidade de certificado e credenciais **exclusivamente Efí sandbox**, escopos Pix Automático, URL/callback mTLS, consentimento e pagamentos fictícios.
- Confirmar token administrativo exclusivo e forte para testes autenticados. Na ausência dele, endpoints internos devem falhar fechados.
- Após verificação do Render live, executar testes HTTP de saúde, isolamento, autorização, idempotência e callbacks inválidos.
- Recebimento e repasse reais D+1 seguem bloqueados: falta integração bancária Pix OUT comprovada e validação contratual/compliance pela Efí; **nenhuma operação com dinheiro**.

Produção `nga-api`, cron jobs e `main` continuam preservados. Não concluir merge enquanto as pendências acima não estiverem homologadas.

## Decisão atualizada pelo proprietário (2026-10-19) — Efí REAL existente

O usuário confirmou: **conta Efí Empresas**, aplicação Open Finance em **produção com os 4 escopos `gn.opb.automatic.{consent,payment}.{read,write}` ativos**. A mesma aplicação NÃO fornece rotação com convivência de chaves antigas/novas. Portanto não regenerar credenciais atuais, não revogar, não copiar certificados/segredos de `nga-api` para homologação e não reconfigurar os webhooks ativos. A documentação oficial permite outras aplicações independentes na mesma conta Efí, caso precise de troca com sobreposição: https://dev.efipay.com.br/docs/api-open-finance/credenciais/ . A criação desta segunda aplicação depende da escolha de credenciais e do painel Efí; nada foi criado automaticamente.

Para preparar integração sem tocar clientes, adicionamos modo **PRODUCTION READ ONLY (opt-in)** em `/v1/admin/efi-production-read-only` (guardado por `EfiOperationsGuard`): `GET /preflight` valida configuração local sem rede e `POST /lookup-adhesion` permite consultar a Efí através do **GET /v1/pagamentos-automaticos/adesao** usando token OAuth mTLS, sem mutations e sem dados pessoais na resposta. Consulta de autorização bancária NÃO marca contrato interno autorizado. Nenhum Pix, status de pagamento, crédito ou payout é modificado.

A consulta começa desabilitada (`NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED=false`) e **não deverá ser habilitada enquanto o staging estiver sem credenciais próprias ou enquanto o código não tiver sido homologado**. Requer `NEXTGEN_DISABLE_BACKGROUND_WORKERS=true`, todas as flags de débito/D+1 OFF, host HTTPS de produção exato, certificado e credenciais previamente instalados por canal secreto. O serviço de produção `nga-api` NÃO deve ser alterado nesta sprint. A consulta somente será exercida após aprovar origem das credenciais e definir um ambiente de leitura independente.

Antes de qualquer corte de chaves: preparar segunda aplicação na mesma conta para manter a primeira íntegra; definir janela e monitoramento, validar saldo/rotas/callbacks, somente então revogar material comprometido. Quando uma segunda aplicação não for opção, obter suporte Efí para janela assistida — não prometer zero downtime para rotação direta da mesma aplicação.

## Resultado técnico da etapa Efí real — 2026-10-19/20

- Implementação da consulta Efí REAL em **modo somente leitura, desabilitado por padrão** na PR #8, commits `7ab141da` e `c46e3e9`. Rotas internas `/v1/admin/efi-production-read-only/preflight` e `/lookup-adhesion`, protegidas por `EfiOperationsGuard`. Exige opt-in estrito, host oficial, OAuth mTLS e todos os workers e módulos que movem dinheiro OFF. Só consulta parâmetros de uma adesão identificada; não confirma contrato interno nem altera status/saldo.
- CI `39346200323` finalizado com **sucesso**, 9 suites / **54 testes aprovados**; Prisma SQL, Smart Operations, Efí e D+1 verificados em PG16 efêmero, compilação NestJS e marketing sem erro.
- Render homolog `srv-db9bnsdg1s2s738485pg` deploy `dep-dbbb4mbrjlhs73dk2430` no commit `c46e3e9` **LIVE** em 2026-10-20 00:16 UTC. Logs confirmam `Nest application successfully started`, porta 10000 e **workers legados desabilitados**. Health via HTTP público não pôde ser consultado desta execução (não usar isso como prova de smoke HTTP).
- Render produção `nga-api` permanece em `15bb5ed4f676ecced3976ab284c59f0a5c95b0cf`. PR #8 e PR #9 permanecem draft/não mescladas; sem deploy ou atualização de credenciais em produção.
- Neon exclusivo `nextgen_homolog` ainda tem zero parceiros, clientes, autorizações e repasses reais. Nenhuma credencial Efí REAL foi usada para chamadas bancárias por estes testes.
- Próximo passo sob controle do proprietário: criar **nova aplicação Efí na mesma conta Efí Empresas**, com **somente escopos de leitura inicialmente** e sem desativar a aplicação atual; cadastrar credenciais/certificado dessa aplicação diretamente em segredos isolados do Render e fazer preflight + OAuth/GET após revisão de segurança. Se outra aplicação não puder coexistir, solicitar rotação assistida Efí com janela de manutenção planejada, nunca revogar chaves já em uso sem migração. **Não realizar débito ou Pix OUT** antes de homologar reconciliação e requisitos operacionais.

## Situação da credencial histórica da Efí — esclarecimento do proprietário (2026-10-19)

O proprietário confirmou que a aplicação cujo Client ID exposto no script antigo terminava em `401e95e` **não existe mais** na conta Efí. Não revogar nem regenerar as outras aplicações por causa desse achado histórico; validar que a aplicação excluída não está mais ativa antes de encerrar o risco. A PR #9 permanece como correção de código/histórico e outros pontos de segurança, mas sem merge. **Usar somente a aplicação Efí Empresas existente e ativa para o desenvolvimento futuro, sem copiar segredos de produção para staging.**

## Próxima camada de conciliação somente leitura (não executa dinheiro)

- Novo `POST /v1/admin/efi-production-read-only/lookup-payment` autenticado por guard: consulta exclusivamente `GET /v1/pagamentos-automaticos/pix` da Efí Open Finance de produção, via OAuth mTLS, com match exato de `identificadorAdesao`, `endToEndId`, `valor` e data informada; somente quando explicitamente habilitado em ambiente isolado e todos os workers e métodos de pagamento desligados. <https://dev.efipay.com.br/docs/api-open-finance/pagamentos-automaticos/>
- A resposta redige identificadores/dados bancários e sempre retorna `settlementVerified:false`, `bankCreditReconciled:false`, `payoutExecuted:false`. Status `aceito` NÃO confirma entrada de dinheiro na conta recebedora. Duplicidades, reembolso e status desconhecidos levam a revisão.
- A operação ainda NÃO implementa conciliação de extrato Pix no banco recebedor, deduplicação definitiva de notificações ou Pix OUT real. Sem credenciais de produção no staging, os testes desta camada são apenas unitários e sem rede. Todos os flags bancários devem permanecer desabilitados na homologação.

## Política de prova bancária dupla (branch, ainda sem integração bancária real)

A consulta Efí Pix `GET /v2/pix/:e2eId` exige **`pix.read`**, que NÃO é igual aos quatro escopos de Pix Automático Open Finance. Referência: https://dev.efipay.com.br/docs/api-pix/gestao-de-pix/. A função `parseVerifiedIncomingPix` somente poderá consumir resultado de HTTPS mTLS GET oficial, nunca dados de UI/webhook. Exige E2E e valor exatos, chave Pix de recebimento comprovada, horário válido e nenhuma devolução; redige prova em SHA256. Se a Efí omitir a chave no GET, falha fechada e exige outra evidência autenticada antes de liberar baixa.

O segundo fator `assertIncomingPixMatchesAutomaticPayment` exige consulta oficial OF do mesmo E2E e valor com status `aceito` e sem devoluções, **sem inferir liquidação por esse status isolado**. Migração adicional `20261019_nextgen_efi_receipt_cycle_uniqueness.sql` cria índice único por `(partner_id,cycle_id)`, para impedir duas entradas de recebimento para uma única cobrança mesmo com E2Es diferentes. Novos testes unitários e SQL no CI efêmero. **Nenhum adapter Pix mTLS foi habilitado, nenhum dado de produção ou dinheiro foi tocado.** Antes da operação real: conta Efí com `pix.read`, prova de recebedor, importador transacional idempotente, apuração de tarifas, retenções/compliance, calendário bancário e Pix OUT verificado.

## Segurança Pix API real — leitor mTLS estritamente opt-in

Adicionado `EfiPixIncomingReadService` para **somente leitura** de `GET /v2/pix/:e2eId`, com endpoint de OAuth client_credentials e certificado P12 através do `https.request` nativo com `rejectUnauthorized=true`, sem redirects e sem logs de token ou corpo bancário. Usa credenciais próprias `EFI_PIX_READ_*` (NÃO extrair da produção), escopo oficial `pix.read`, URL exata `https://pix.api.efipay.com.br`, flag `NEXTGEN_EFI_PIX_READ_ENABLED` e workers/pagamentos desligados. O controller interno `POST /v1/admin/efi-production-read-only/preview-incoming` só retorna prévia após a consulta OF + Pix com E2E/valor/chave exatos; nada grava no ledger nem habilita D+1.

Esse cliente e rota continuam SEM credenciais em homologação. A aplicação Efí ativa pode necessitar marcar `pix.read` **na seção API Pix** — os 4 escopos Pix Automático não substituem `pix.read`. Não ativar sem confirmação e sem passar pelo checklist de segurança. Nenhum credencial real ou GET bancário usado nos testes CI.

## Gate de importação de recebimento (nova etapa)

Confirmação do proprietário em 19/10/2026: a aplicação Efí existente possui **`pix.read`**, além dos quatro escopos Open Finance de Pix Automático. Isso é informação confirmada no painel Efí, mas ainda não prova conectividade OAuth/mTLS no serviço de homologação; nenhuma credencial produtiva foi importada para o Neon/Render de testes.

Importação privada `POST /v1/admin/efi-central-receipts/import-verified-cycle`, guardada por `EfiOperationsGuard`, aceita **somente partnerSlug e cycleId**, nunca comprovante financeiro enviado pelo cliente. Com `NEXTGEN_EFI_RECEIPT_IMPORT_ENABLED=true` E `NEXTGEN_EFI_RECEIPT_IMPORT_ENV=isolated-homolog`, workers OFF, funções financeiras OFF e dois leitores Efí explicitamente habilitados com credenciais via secrets isolados, ela:

1. Busca ciclo existente SCHEDULED e autorização AUTHORIZED verificada, tenant correto e E2E/valor bancários previamente registrados; chama **GET** Efí Open Finance e Efí Pix fora da transação, confirma E2E, valor e chave recebedora, ausência de devoluções.
2. Bloqueia/serializa mesmo ciclo com `SELECT ... FOR UPDATE`, revalida autorização, valor, referência e vencimento; usa restrições UNIQUE(E2E), UNIQUE(partner,cycle), `ON CONFLICT DO NOTHING` + revisão.
3. Grava apenas comprovante redigido `BANK_RECEIVED` com `compliance_hold=true`, `reconciliation_verified_at=NULL`, `reconciled_reference=NULL` e sem validar tarifas (campos de taxas provisoriamente zero; **nunca calcular repasse a partir deles**). Auditoria e comprovante são atômicos. Repasse D+1 não é criado nem executado.

A segunda reconciliação independente de extrato com taxas, titularidade bancária/compliance ainda é necessária para liberar `RECONCILED` e desbloquear retenções; ainda NÃO há endpoint para isso nem execução Pix OUT real. **Não habilitar a flag acima nem mesclar enquanto não houver comprovação de bank host/certificados, origem das permissões e testes ponta a ponta.**

## Segurança D+1: extrato de conciliação independente (2026-10-20)
Pesquisa oficial: https://dev.efipay.com.br/docs/api-pix/endpoints-exclusivos-efi/
Efí gera relatório de conciliação por `POST /v2/gn/relatorios/extrato-conciliacao`
(`gn.reports.write`) e entrega por `GET /v2/gn/relatorios/:id` (`gn.reports.read`).
O arquivo CSV tem legenda oficial específica; **não assumir layout, CPF, E2E nem colunas de tarifa** sem o parser validado a partir dessa legenda. Os escopos adicionais NÃO foram confirmados para a aplicação NextGen. Não foi requisitado nenhum relatório real.

Migração `20261020_nextgen_efi_reconciliation_proof_gate.sql`, aplicada só em banco isolado após análise: exige para estado `RECONCILED` identificação UUID do relatório, SHA-256 do arquivo, evidência de validação de tarifas, titularidade bancária, devoluções, referência autenticada e data de verificação. Remover `compliance_hold` de um recebimento conciliado requer carimbo de liberação e evidência SHA-256. O agendador D+1 exige os mesmos campos, além das condições já existentes, para não confiar apenas em uma atualização manual `RECONCILED`. Não existe fluxo automático que preencha estas colunas com prova real, portanto nenhum repasse será liberado nesta etapa.

Passos reais ainda bloqueadores: confirmar `gn.reports.write/read`; validar conta Efí exata e chave Pix recebedora por leitura autenticada; documentar e testar o parser CSV de extrato e dedupe de linhas/tarifas/devoluções; adicionar verificador transacional de extrato, aprovação de compliance; validar contrato Efí de centralização e Pix OUT. Flags de pagamentos e D+1 permanecem OFF.

## Relatório oficial Efí de conciliação Pix — implementação preparada 2026-10-20

O usuário confirmou na aplicação Efí atual: escopos `gn.reports.read`, `gn.reports.write` e `pix.read`. Documentação: https://dev.efipay.com.br/docs/api-pix/endpoints-exclusivos-efi/ e manual layout CSV v5.0 (maio de 2026) https://gerencianet-pub-prod-1.s3.us-east-1.amazonaws.com/Extrato_conciliacao_API_Pix_v5.0.pdf .

Nova camada interna `/v1/admin/efi-statement-read` com `EfiOperationsGuard`, **flag `NEXTGEN_EFI_STATEMENT_READ_ENABLED` OFF por padrão**, trabalhadores e funcionalidades monetárias OFF, Efí Pix host HTTPS exato, certificado mTLS e TLS verificado. Solicita apenas geração de EXTRATO por POST `/v2/gn/relatorios/extrato-conciliacao`, e faz GET `/v2/gn/relatorios/:id` para resposta 202 pendente ou CSV completo (200), sem expor CSV/dados pessoais.

Parser `efi-statement-v5-parser.ts` verifica data de movimento, banco/agência/conta da CA, E2E e valor PR, TPR/ETPR, devoluções PDE/PDR/SPDE, conta registros com trailer T, SHA-256 e recusa duplicidades e reembolsos. O valor líquido é **apenas simulação**, não uma autorização financeira. Layout desconhecido/faltante falha fechado.

**É expressamente vedado preencher automaticamente** `statement_verified_at`, `provider_fee_verified_at`, `account_ownership_verified_at`, `compliance_cleared_at`, ou retirar compliance_hold com base só nesse parser. A liberação final ainda precisa correlacionar extrato, tarifa contratada, relatórios de múltiplos dias (devoluções tardias), conta recebedora autenticada e revisão compliance; não existe adaptador Pix OUT homologado. Sem credenciais reais em Render homolog, testes são mockados e nenhum banco Efí foi chamado.

## Conferência adicional de segurança — layout oficial, 20/10/2026

Auditoria cruzada com o PDF Efí oficial `Extrato_conciliacao_API_Pix_v5.0.pdf` (Maio/2026) confirma que o trailer `T` tem **13 campos**: tipo; total de movimentos; e 11 subtotais para Pix recebido, Pix enviado, devoluções, estornos Pix, tarifas Pix, estornos tarifas Pix, transferências recebidas/enviadas, tarifas transferência, estornos transferência e estornos tarifas transferência. A validação anterior só conferia `T.total`, permitindo totais por família incorretos. Este commit exige todos os campos e compara todos os subtotais efetivos contra os registros individuais, ignorando `SD0`/`SD1` (saldos) como descrito no manual. Arquivo com trailer truncado ou subtotal divergente falha fechado. Referência: https://dev.efipay.com.br/docs/api-pix/endpoints-exclusivos-efi/#solicitar-download-extrato-conciliação

A prévia `POST /v1/admin/efi-statement-read/preview` não pode mais escolher uma conta bancária por payload; banco, agência e conta vêm **exclusivamente** das variáveis seguras `EFI_STATEMENT_BANK_CODE`, `EFI_STATEMENT_AGENCY`, `EFI_STATEMENT_ACCOUNT` no processo backend. A ausência destas variáveis ou tentativa de sobrescrita no JSON falha antes de OAuth. Como antes, nenhuma resposta com `payoutAuthorized:true` é possível, e nenhuma conciliação ou Pix OUT real foi acionado.
