# NextGen — Roteiro de homologação Pix Automático (Efí)

**Atualizado:** 2026-10-16  
**Status:** PR #8 (rascunho). Não implantar em produção.  
**Princípio:** aproveitar `smart_billing_recurrences`, sem Pluggy e sem débitos reais até validação.

## Componentes em PR

- Banco: `database/migrations/20261016_nextgen_efi_automatic_bridge.sql` (não aplicada).
- Backend: `efi-automatic-recurrence.{bridge,service,controller}`.
- Guards: `EfiOperationsGuard`, callback Efí protegido por HMAC.
- Billing anterior: `/company-billing/recurrences/generate-due` salta contratos com intenção de Pix Automático **somente quando feature flag está ON** (requer migration).
- Frontend preview: `/recorrencias/pix-automatico`, acessível a partir de `/recorrencias`. Demonstrativo: NÃO chama o banco e não autentica empresas.
- Efí Open Finance client: TLS com verificação do servidor, logs sem resposta bruta e `valorFixo` da autorização.

## Configuração (somente staging)

**Atenção:** não colocar nenhum segredo no GitHub, frontend, issue ou logs.

1. Criar base de homologação isolada/backup. Aplicar migration somente ali e validar todas as novas tabelas e índices.
2. Em staging, definir `NEXTGEN_EFI_AUTOMATIC_ENABLED=true`.
3. Iniciar com `NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS=false`; só mudar após teste do TLS.
4. `NEXTGEN_ADMIN_TOKEN`: segredo aleatório com pelo menos 32 caracteres, exclusivo da operação; enviar somente no header `x-nextgen-admin-token` a partir de cliente interno seguro.
5. `EFI_OF_WEBHOOK_HMAC`: hash secreto aleatório, com pelo menos 32 caracteres, idêntico ao configurado na Efí para seu webhook Open Finance. Confirmar antes de qualquer mudança no callback legado.
6. `EFI_OF_API_URL=https://openfinance-h.api.efipay.com.br` e `EFI_OAUTH_URL=https://openfinance-h.api.efipay.com.br/v1/oauth/token`. Nunca apontar flags de sandbox para produção.
7. Certificado P12 e Client ID/Secret Efí de sandbox somente no serviço seguro. Favorito/beneficiário pelas variáveis `EFI_OF_FAVORECIDO_*`, **nunca enviados pelo navegador**.
8. Conferir escopos Efí `gn.opb.automatic.consent.write` e `gn.opb.automatic.consent.read` antes de testar adesão.

## Endpoints internos na PR

Prefixo `/v1/admin/efi-auto-recurrence`. Todos exigem `x-nextgen-admin-token` e flags adequadas.

| Verbo | Caminho | Efeito |
|---|---|---|
| GET | `/health` | Exibe flags, sem segredos |
| POST | `/intents` | Vincula recorrência atual a uma intenção única (sem banco) |
| GET | `/intents?partnerSlug=...` | Lista autorizações mascaradas |
| POST | `/intents/:id/start-sandbox` | Solicita adesão somente na sandbox Efí; nenhuma cobrança |
| POST | `/intents/:id/sync-sandbox` | Consulta status oficialmente na Efí |
| POST | `/cycles/preview` | Prévia de elegibilidade, sem escrever |
| POST | `/cycles/plan` | Insere ciclo único PLANNED no banco |
| POST | `/cycles/plan-due` | Insere ciclos autorizados vencidos em lote (não envia Pix) |
| GET | `/cycles?partnerSlug=...` | Lista ciclos |

**Não existe endpoint novo para movimentação bancária** nesta PR. `plan` não é `pay`.

## Casos de teste obrigatórios

1. Flag OFF -> novas rotas de mutação devem negar. Token ausente/curto/inválido -> 401/503.
2. Adesão Efí: payload oficial com `valorFixo`, `intervalo`, `dataInicio`, favorecido server-side. Repetir simultaneamente -> uma única adesão pretendida.
3. Atualização de status: somente via consulta autenticada à Efí; `PENDING` não pode virar autorizado por retorno ao frontend.
4. Negativa, cancelamento e expiração: bloqueiam planejar cobranças.
5. Duas invocações simultâneas de `plan` para mesmo `partnerId` + `recurrenceId` + data -> apenas um registro, UNIQUE no banco.
6. Tenant A tenta acessar contrato tenant B -> erro; sem retornar CPF, documentos, tokens ou favorecido inteiro.
7. Enquanto `NEXTGEN_EFI_AUTOMATIC_ENABLED=true`, `generate-due` antigo não deve gerar `PIX_LINK` para contratos com intenção de automático, mesmo pendente ou revogada. Contas legadas continuam gerando Pix normal.
8. `EFI_OF_WEBHOOK_HMAC` ausente/divergente -> callback não atualiza consentimento. Verificar replay e idempotência (ainda pendente).
9. Bank official GET: conferir `identificadorAdesao` **e** recebedor/valor autorizados antes de avançar. **Pendente implementar checagem de recebedor/valor no bridge**; não habilitar débitos sem isso.
10. Verificar TLS Efí após `rejectUnauthorized: true`. Conexão que falha por CA/certificado não deve usar fallback inseguro.
11. Regressão de Smart Billing, cobranças Pix, webhooks Woovi/Efí, repasses e Smart Operations.
12. Repasse: exigir evidência do Pix OUT bancário, não apenas status administrativo.

## Execução de testes de código (no CI/staging)

```bash
cd apps/api
npm ci
npx prisma generate
npm test -- --runInBand efi-automatic-recurrence
npm test -- --runInBand efi-operations.guard
npm test -- --runInBand efi-of-webhook-receiver.controller
npm run build
```

Rodar build Next.js para `apps/marketing`. CI tem de ficar verde antes do merge.

## Riscos não resolvidos (bloqueiam produção)

- Endpoint de pagamento real `POST /v1/pagamentos-automaticos/pix` ainda não está conectado ao scheduler NextGen.
- Webhook legado de consentimento ainda usa associação por usuário/provider; contrato/múltiplas adesões exigem revisão e idempotência.
- Consulta de adesões Efí pode paginar; ausência de consentimento em uma página deve **falhar fechado**, sem ativar.
- Validação dos termos bancários recebedor/valor não concluída, embora fornecedor retorne esses dados no GET.
- Autenticação multiempresa real para a UI falta: não expor `NEXTGEN_ADMIN_TOKEN` no navegador.
- Formalizar com Efí contrato de recebedor centralizado NextGen e serviço de repasse para dinheiro de terceiros.
- Resiliência de scheduler (lock, deadline, retry elegível, consulta de pagamento e reconciliação) ainda não operacional.
- Não foi comprovado saldo segregado por empresa e transferência real em `settlements`/`payout-requests`.
- Não rodamos testes nem migramos banco nesta sessão.

## Referência oficial

- https://dev.efipay.com.br/docs/api-open-finance/pagamentos-automaticos/
- https://dev.efipay.com.br/docs/api-open-finance/webhooks/
- https://dev.efipay.com.br/docs/api-open-finance/configuracoes-de-aplicacao/
