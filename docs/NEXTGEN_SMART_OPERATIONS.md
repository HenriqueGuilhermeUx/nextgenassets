# NextGen Smart Operations

## Visão

NextGen Smart Operations é uma camada do NextGen atual. Não é produto paralelo.

A proposta é transformar:

```txt
foto / PDF / nota / recibo / comprovante / código de barras
```

em:

```txt
dado estruturado + ação operacional confirmável
```

Princípio central: nenhuma ação operacional sensível deve ser executada sem confirmação humana.

---

## Arquitetura encontrada

Backend atual:

- NestJS;
- prefixo global `/v1`;
- PrismaClient usado diretamente em controllers/services;
- módulos registrados no `AppModule`;
- Smart Billing existente em `/company-billing`;
- tabelas operacionais criadas por SQL/`ensureTables()`.

Frontend atual:

- Next.js App Router;
- páginas em `apps/marketing/src/app`;
- telas operacionais por rota.

A nova camada foi adicionada em módulo próprio:

```txt
apps/api/src/modules/smart-operations
```

E registrada no `AppModule`.

---

## Backend criado

Arquivos principais:

```txt
apps/api/src/modules/smart-operations/smart-operations.module.ts
apps/api/src/modules/smart-operations/smart-operations.controller.ts
apps/api/src/modules/smart-operations/smart-operations-read.controller.ts
apps/api/src/modules/smart-operations/smart-operations.service.ts
apps/api/src/modules/smart-operations/smart-operations.types.ts
apps/api/src/modules/smart-operations/providers/mock-av-document.provider.ts
apps/api/src/modules/smart-operations/providers/mock-product-lookup.provider.ts
```

Providers desacoplados:

```txt
AvDocumentIntelligenceProvider
ProductLookupProvider
```

Fallbacks iniciais:

```txt
MockAvDocumentProvider
MockProductLookupProvider
```

A integração futura com AV Document Intelligence deve substituir o mock por provider real sem duplicar OCR/parsing dentro do NextGen.

---

## Endpoints

Base:

```txt
https://api.nextgenassets.com.br/v1
```

Rotas:

```txt
GET  /smart-operations/health
GET  /smart-operations/templates
POST /smart-operations/inbox
GET  /smart-operations/inbox?partnerSlug=nextgen-assets
POST /smart-operations/documents/:id/confirm-action
GET  /smart-operations/products/lookup?code=789...
POST /smart-operations/products
GET  /smart-operations/products?partnerSlug=nextgen-assets
GET  /smart-operations/purchases?partnerSlug=nextgen-assets
GET  /smart-operations/expenses?partnerSlug=nextgen-assets
GET  /smart-operations/payables?partnerSlug=nextgen-assets
GET  /smart-operations/inventory?partnerSlug=nextgen-assets
GET  /smart-operations/events?partnerSlug=nextgen-assets
GET  /smart-operations/dashboard?partnerSlug=nextgen-assets
POST /smart-operations/ask
```

---

## Ações confirmáveis

Documentos podem sugerir:

```txt
REGISTER_PURCHASE
UPDATE_INVENTORY
CREATE_SUPPLIER
CREATE_ACCOUNT_PAYABLE
CREATE_EXPENSE
ARCHIVE_DOCUMENT
CREATE_PRODUCT
RECONCILE_DOCUMENT
```

No MVP, as ações principais implementadas são:

```txt
REGISTER_PURCHASE
UPDATE_INVENTORY
CREATE_ACCOUNT_PAYABLE
CREATE_EXPENSE
ARCHIVE_DOCUMENT
CREATE_PRODUCT
RECONCILE_DOCUMENT
```

`CREATE_SUPPLIER` está previsto na interface e no fluxo, mas a entidade dedicada de fornecedor deve ser consolidada na próxima etapa para evitar duplicar dados de fornecedor entre compras, despesas e contas a pagar.

---

## Tabelas / migration

Migration criada:

```txt
database/migrations/20260910_nextgen_smart_operations.sql
```

Tabelas:

```txt
smart_ops_documents
smart_ops_products
smart_ops_purchases
smart_ops_purchase_items
smart_ops_expenses
smart_ops_accounts_payable
smart_ops_inventory_movements
smart_ops_reconciliations
smart_ops_expense_reports
smart_ops_events
```

Duplicate detection inicial:

```txt
partner_id + tenant_slug + content_hash
```

Inventário evita duplicação operacional checando documento/movement_group antes de lançar nova entrada.

---

## Frontend criado

Telas:

```txt
/smart-operations
/smart-inbox
/product-scan
/produtos
/compras
/estoque
/despesas
/contas-a-pagar
/prestacao-contas
```

Entrada principal adicionada em:

```txt
/operacao
```

Botão principal:

```txt
📷 Escanear / enviar
```

---

## Feature flags e env vars

Adicionadas em `apps/api/.env.example`:

```txt
NEXTGEN_SMART_OPERATIONS_ENABLED=true
AV_DOCUMENT_PROVIDER=mock
AV_DOCUMENT_INTELLIGENCE_URL=https://av-document-intelligence.example.com
AV_DOCUMENT_INTELLIGENCE_TOKEN=token_xxxxx
NEXTGEN_PRODUCT_PROVIDER=mock
NEXTGEN_PRODUCT_SCAN_ENABLED=true
SMART_INBOX_SIGNED_URL_TTL_SECONDS=900
```

Nenhuma chave real deve ir para o frontend ou para arquivos versionados.

---

## Eventos para AV OS

Eventos previstos/registrados:

```txt
document.received
purchase.extracted
purchase.confirmed
expense.created
payable.created
product.scanned
product.created
inventory.updated
document.reconciled
```

---

## Testes

Criados testes unitários para providers:

```txt
apps/api/src/modules/smart-operations/providers/mock-av-document.provider.spec.ts
apps/api/src/modules/smart-operations/providers/mock-product-lookup.provider.spec.ts
```

Rodar:

```bash
cd apps/api
npm test -- smart-operations
```

---

## Segurança

Regras da camada:

- documentos privados;
- isolamento por `partner_id` e `tenant_slug`;
- futura entrada de arquivos por signed URL;
- nenhuma chave no frontend;
- logs sem documento completo;
- texto longo truncado em `raw_data`;
- confirmação humana antes de compra, estoque, despesa ou conta a pagar;
- eventos/auditoria;
- LGPD.

---

## Próximos passos

1. Implementar provider real `AvDocumentProvider` consumindo AV Document Intelligence.
2. Implementar upload real com signed URLs e storage privado.
3. Criar entidade dedicada `smart_ops_suppliers` e ação completa `CREATE_SUPPLIER`.
4. Melhorar vínculo nota ↔ produto por EAN/SKU.
5. Adicionar geração de contas a pagar em lote por vencimentos extraídos.
6. Conectar canal de WhatsApp/e-mail via n8n ou provider oficial.
7. Criar tela de perguntas operacionais com respostas agregadas.
8. Adicionar autenticação/tenant isolation real nas rotas antes de produção multiempresa.
