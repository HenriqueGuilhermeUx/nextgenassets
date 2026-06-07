# Destinations — Como Criar Adapters

> Guia pra plugar corretoras, fundos, bancos, varejistas reais.

## A Interface Universal

Todo adapter — mock ou real — implementa `DestinationAdapter`:

```typescript
// src/modules/destinations/destination.interface.ts

export interface DestinationAdapter {
  readonly type: DestinationType;
  readonly partnerId: string;
  readonly adapterName: string;

  validateUser(externalUserId: string): Promise<ValidationResult>;
  execute(action: DestinationAction): Promise<ExecutionResult>;
  checkExecution(externalId: string): Promise<ExecutionStatusResult>;
  cancel(externalId: string): Promise<CancelResult>;
  reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult>;
}
```

## Como Criar um Adapter Real

### Exemplo: Adapter XP Investimentos

**1. Criar arquivo `xp-broker.ts`:**

```typescript
// src/modules/destinations/providers/xp-broker.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DestinationAdapter, DestinationAction, ExecutionResult } from '../destination.interface';

@Injectable()
export class XpBrokerAdapter implements DestinationAdapter {
  readonly type = 'STOCK_BROKER' as const;
  readonly adapterName = 'XP_BROKER';
  private readonly logger = new Logger(XpBrokerAdapter.name);
  private api: any;

  constructor(private config: ConfigService) {
    this.api = axios.create({
      baseURL: this.config.get('XP_API_URL'),
      headers: { 'Authorization': `Bearer ${this.config.get('XP_API_TOKEN')}` }
    });
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    const { data } = await this.api.get(`/users/${externalUserId}`);
    return { isValid: data.active };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'BUY_STOCK' && action.type !== 'SELL_STOCK') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: '...', retryable: false };
    }

    try {
      const { data } = await this.api.post('/orders', {
        account: action.userId,
        symbol: action.ticker,
        side: action.type === 'BUY_STOCK' ? 'buy' : 'sell',
        quantity: action.type === 'BUY_STOCK' ? null : action.quantity,
        amount: action.type === 'BUY_STOCK' ? action.amountBrl : null,
        orderType: 'market'
      });

      return {
        status: 'COMPLETED',
        externalId: data.orderId,
        details: { ticker: action.ticker, quantity: data.quantity, price: data.price, totalBrl: data.total }
      };
    } catch (err) {
      return {
        status: 'FAILED',
        errorCode: err.response?.data?.code || 'BROKER_ERROR',
        errorMessage: err.response?.data?.message || err.message,
        retryable: err.response?.status >= 500
      };
    }
  }

  // ... checkExecution, cancel, reconcile
}
```

**2. Registrar no módulo:**

```typescript
// src/app.module.ts
providers: [
  // ...
  XpBrokerAdapter
]
```

**3. Configurar no Partner:**

```typescript
// No Partner.config (JSON):
{
  "stockAdapter": "XP_BROKER"  // ← trocou de MOCK_STOCK_BROKER
}
```

**Pronto. O Trigger Engine passa a usar a XP real.**

## Sandbox vs Produção

Cada adapter tem 2 ambientes:

| Ambiente | URL XP | Como ativar |
|---|---|---|
| Sandbox | `https://api-sandbox.xpi.com.br/v1` | `process.env.XP_API_URL` |
| Produção | `https://api.xpi.com.br/v1` | Mudar env var |

## Credenciais

Todas as credenciais ficam no **HashiCorp Vault**, nunca hardcoded:

```typescript
// Errado:
this.apiKey = 'sk_live_xxxxxx';

// Correto:
this.apiKey = await this.vault.read('secret/data/xp/api_key');
```

## Checklist pra um adapter estar production-ready

- [ ] Implementa toda a interface `DestinationAdapter`
- [ ] Trata todos os `DestinationAction` suportados
- [ ] Retorna `ExecutionResult` com status correto
- [ ] Mapeia erros da API externa pra `errorCode` Orkest padronizado
- [ ] `retryable: true` apenas pra erros transientes (5xx, timeout)
- [ ] Idempotência: se receber mesma ordem 2x, não duplica
- [ ] Logs estruturados (`this.logger.log/warn/error`)
- [ ] Credenciais via Vault
- [ ] Sandbox homologado com 100+ execuções
- [ ] Testes unitários + integração
- [ ] Documentação do parceiro
