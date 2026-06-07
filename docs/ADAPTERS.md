# Adapters Reais — Guia de Integração

> Orkest suporta 5 mock adapters (dev) + 7 real adapters (prod). Cada um é um `DestinationAdapter` plugável.

## Catálogo Completo

| Adapter | Tipo | Onde Usar | Mock? |
|---|---|---|---|
| `MOCK_STOCK_BROKER` | STOCK_BROKER | Dev/testes | ✅ |
| `MOCK_FUND_DISTRIBUTOR` | FUND_DISTRIBUTOR | Dev/testes | ✅ |
| `MOCK_CRYPTO_EXCHANGE` | CRYPTO_EXCHANGE | Dev/testes | ✅ |
| `MOCK_BANK_ACCOUNT` | BANK_ACCOUNT | Dev/testes | ✅ |
| `MOCK_RETAILER` | RETAILER | Dev/testes | ✅ |
| `SHOPIFY` | RETAILER | Lojas Shopify/Plus | ❌ |
| `WOOCOMMERCE` | RETAILER | Lojas WP+WooCommerce | ❌ |
| `MERCADO_LIVRE` | RETAILER | Lojas no Mercado Livre | ❌ |
| `MAGALU` | RETAILER | Lojas Magalu/Magazine Luiza | ❌ |
| `VTEX` | RETAILER | Lojas VTEX (enterprise) | ❌ |
| `NUBANK_OPEN_FINANCE` | BANK_ACCOUNT | Open Finance Nubank | ❌ |
| `XP_BROKER` | STOCK_BROKER | Corretora XP | ❌ |
| `ORAMA_FUND` | FUND_DISTRIBUTOR | Órama | ❌ |

## Como Configurar

### Shopify
```bash
SHOPIFY_SHOP_DOMAIN=loja.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_VERSION=2024-01
```

```json
// partner.config
{ "retailerAdapter": "SHOPIFY" }
```

### WooCommerce
```bash
WC_SITE_URL=https://loja.com.br
WC_CONSUMER_KEY=ck_xxxxx
WC_CONSUMER_SECRET=cs_xxxxx
```

### Mercado Livre
```bash
ML_API_URL=https://api.mercadolibre.com
ML_ACCESS_TOKEN=APP_USR-xxxxx
ML_USER_ID=123456789
```

### Magalu
```bash
MAGALU_API_URL=https://api.magalu.br/commerce/v1
MAGALU_API_KEY=xxxxx
MAGALU_STORE_ID=store-xxx
```

### Nubank Open Finance
```bash
NUBANK_OF_URL=https://api.nubank.com.br/open-banking/v1
NUBANK_OF_CLIENT_ID=client-xxx
NUBANK_OF_CLIENT_SECRET=secret-xxx
```

> ⚠️ Nubank OF exige homologação no diretório de Open Finance do BC.

## Capabilities por Adapter

| Adapter | Busca catálogo | Compra | Rastreio | Estorno |
|---|---|---|---|---|
| MOCK_RETAILER | ✅ | ✅ | ✅ | ✅ |
| SHOPIFY | ✅ | ✅ | ✅ | ✅ |
| WOOCOMMERCE | ✅ | ✅ | ✅ | ✅ |
| MERCADO_LIVRE | ✅ | ✅ | ✅ | ✅ |
| MAGALU | ✅ | ✅ | ✅ | ✅ |
| NUBANK_OF | — | ✅ Pix | ✅ | — |

## Adapters Customizados

Crie seu próprio seguindo o contrato:

```typescript
// src/modules/destinations/providers/meu-adapter.ts
import { DestinationAdapter } from '../destination.interface';

@Injectable()
export class MeuAdapter implements DestinationAdapter {
  readonly type: DestinationType = 'RETAILER';
  readonly adapterName = 'MEU';

  async validateUser(id: string): Promise<ValidationResult> { ... }
  async execute(action: DestinationAction): Promise<ExecutionResult> { ... }
  async checkExecution(id: string): Promise<ExecutionStatusResult> { ... }
  async cancel(id: string): Promise<CancelResult> { ... }
  async reconcile(userId: string, since: Date): Promise<ReconciliationResult> { ... }
}
```

Registre no `app.module.ts` providers + adicione no `DestinationRegistry.registerRealAdapters()`.

## Fluxo de Adoção (Mock → Real)

```
Mês 1:    MOCK_RETAILER     ← dev/demo
Mês 2-3:  SHOPIFY (1 loja)  ← piloto
Mês 4-6:  + WOOCOMMERCE     ← expansão
Mês 7+:   + MERCADO_LIVRE   ← cobertura ampla
```

**Trocar = 1 linha no config do Partner. Zero refactor.**

## Diferenças Cruciais

| Aspecto | Mock | Real |
|---|---|---|
| Estoque | In-memory | Tempo real via API |
| Latência | 50-500ms | 200-2000ms |
| Webhooks | Síncrono | Assíncrono |
| Rate limit | Ilimitado | 60-1000 req/min |
| Sandbox disponível | Sempre | Mediante credencial |
| Erros | 5% random | API real |
