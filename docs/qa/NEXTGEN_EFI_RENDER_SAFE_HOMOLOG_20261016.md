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
- Migrações `20261016_nextgen_efi_automatic_bridge.sql` e `20261016_nextgen_centralized_d1_payout.sql` aplicadas em transação no **mesmo banco de homologação**, criando 8 tabelas específicas. `20260910_nextgen_smart_operations.sql` também aplicada, criando 10 tabelas Smart Operations. Verificação final: **29 tabelas**, sem parceiros nem usuários reais.
- Render staging exclusivo `nextgen-efi-automatic-homolog` (`srv-db9bnsdg1s2s738485pg`), URL `https://nextgen-efi-automatic-homolog.onrender.com`, branch da PR #8, auto deploy DESLIGADO. `DATABASE_URL` apontado exclusivamente para Neon `nextgen_homolog` através de variável secreta no Render, sem expor credenciais no repositório.
- Segurança: `NEXTGEN_DISABLE_BACKGROUND_WORKERS=true`, `NEXTGEN_EFI_AUTOMATIC_ENABLED=false`, `NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS=false`, `NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS=false`, `NEXTGEN_CENTRALIZED_D1_ENABLED=false`. Variáveis existentes mescladas, não sobrescritas.
- Deploy de homologação iniciado automaticamente após alteração do ambiente: `dep-db9cjrm1egvs73eonchg` no commit `f44d26e`. A confirmação **live/health** deve ser verificada no Render; início de deploy não significa sucesso.
- CI `38989120894` concluído com sucesso: 46 testes de serviços/guards/hooks bancários, build NestJS, build marketing e contrato SQL de Efí/D+1 em Postgres efêmero. Nada disso prova uma transação bancária real.

**Operação segura futura:** NÃO rodar `prisma db push` indiscriminadamente nesse banco, porque há 18 tabelas SQL que não estão declaradas no `schema.prisma` e o Prisma poderá tentar removê-las. Não usar `--accept-data-loss`, `migrate reset`, importação de dados de produção ou credenciais produtivas. O SQL-base do Prisma foi criado em banco inicialmente isolado, somente com as oito tabelas Efí já aplicadas.

## Pendências reais de homologação bancária

- Confirmar disponibilidade de certificado e credenciais **exclusivamente Efí sandbox**, escopos Pix Automático, URL/callback mTLS, consentimento e pagamentos fictícios.
- Confirmar token administrativo exclusivo e forte para testes autenticados. Na ausência dele, endpoints internos devem falhar fechados.
- Após verificação do Render live, executar testes HTTP de saúde, isolamento, autorização, idempotência e callbacks inválidos.
- Recebimento e repasse reais D+1 seguem bloqueados: falta integração bancária Pix OUT comprovada e validação contratual/compliance pela Efí; **nenhuma operação com dinheiro**.

Produção `nga-api`, cron jobs e `main` continuam preservados. Não concluir merge enquanto as pendências acima não estiverem homologadas.
