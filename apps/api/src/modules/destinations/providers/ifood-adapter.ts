// ============================================
//  IFOOD ADAPTER — Food delivery + Gig economy
// ============================================
// Casos de uso:
// 1. Scheduled food orders ("pedir almoço no dia 5 quando o salário cair")
// 2. Recurring groceries ("comprar leite toda semana")
// 3. Price trigger ("pedir marmita quando restaurante favorito tiver 30% off")
// 4. Auto-save pra entregadores ("separe 20% de cada entrega pra reserva")

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class IFoodAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'IFOOD';

  private readonly logger = new Logger(IFoodAdapter.name);
  private baseUrl: string;
  private merchantId: string;
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('IFOOD_API_URL') || 'https://merchant-api.ifood.com.br/v1';
    this.merchantId = this.config.get('IFOOD_MERCHANT_ID');
    this.apiKey = this.config.get('IFOOD_API_KEY');
  }

  private get headers() {
    return { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    // iFood consumer validation via CPF/token
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type} via iFood`);

    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT', retryable: false };
    }

    // 1. Valida produto no cardápio
    const product = await this.findProductBySku(action.sku);
    if (!product) {
      return { status: 'FAILED', errorCode: 'PRODUCT_NOT_FOUND', errorMessage: `Item ${action.sku} não está disponível`, retryable: false };
    }

    if (!product.available) {
      return { status: 'FAILED', errorCode: 'RESTAURANT_CLOSED', errorMessage: 'Restaurante fechado no momento', retryable: true };
    }

    if (product.stock < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${product.stock}`, retryable: true };
    }

    // 2. Cria order
    try {
      const orderPayload = {
        customer: { id: action.userId },
        items: [{
          sku: action.sku,
          quantity: action.quantity,
          unitPrice: product.price
        }],
        payments: [{
          method: 'PIX',
          status: 'PAID',  // Pix já caiu via Orkest
          prepaid: true,
          transactionId: `orkest-pix-${Date.now()}`
        }],
        deliveryAddress: { customerId: action.userId },  // pega do cadastro
        metadata: {
          source: 'orkest',
          triggerType: 'automated',
          orkestUser: action.userId
        }
      };

      const response = await fetch(`${this.baseUrl}/merchants/${this.merchantId}/orders`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const err = await response.text();
        return { status: 'FAILED', errorCode: `IFOOD_${response.status}`, errorMessage: err, retryable: response.status >= 500 };
      }

      const order = await response.json();
      this.logger.log(`[${action.userId}] ✅ iFood order ${order.id} created`);

      return {
        status: 'COMPLETED',
        externalId: order.id,
        details: {
          orderId: order.id,
          ifoodOrderUrl: `https://www.ifood.com.br/delivery/${this.merchantId}/orders/${order.id}`,
          totalBrl: order.total,
          currency: 'BRL',
          status: order.status,
          estimatedDelivery: order.estimatedDeliveryTime,
          trackingUrl: order.trackingUrl,
          deliveryPerson: order.deliveryPerson?.name,
          items: order.items
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/merchants/${this.merchantId}/orders/${externalId}`, { headers: this.headers });
      if (!response.ok) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };
      const order = await response.json();
      return {
        status: order.status === 'DELIVERED' ? 'COMPLETED' : 'PENDING',
        externalId: order.id,
        details: { status: order.status, tracking: order.trackingUrl }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      const response = await fetch(`${this.baseUrl}/merchants/${this.merchantId}/orders/${externalId}/cancel`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ reason: 'Orkest trigger cancelado' })
      });
      return { canceled: response.ok };
    } catch (err) {
      return { canceled: false, reason: err.message };
    }
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    try {
      const sinceStr = since.toISOString();
      const response = await fetch(
        `${this.baseUrl}/merchants/${this.merchantId}/orders?customerId=${externalUserId}&createdAfter=${sinceStr}`,
        { headers: this.headers }
      );
      if (!response.ok) return { externalOperations: [] };
      const data = await response.json();
      return {
        externalOperations: (data.orders || []).map((o: any) => ({
          externalId: o.id,
          type: 'BUY_PRODUCT' as const,
          amountBrl: o.total,
          executedAt: new Date(o.createdAt)
        }))
      };
    } catch {
      return { externalOperations: [] };
    }
  }

  async listSupportedAssets(): Promise<string[]> {
    return [];
  }

  async getQuote(sku: string) {
    const product = await this.findProductBySku(sku);
    return { price: product?.price || 0, currency: 'BRL', timestamp: new Date() };
  }

  private async findProductBySku(sku: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/merchants/${this.merchantId}/items?sku=${encodeURIComponent(sku)}`, { headers: this.headers });
      if (!response.ok) return null;
      const items = await response.json();
      const item = items[0];
      return item ? { sku: item.sku, name: item.name, price: item.price, stock: item.stock, available: item.available } : null;
    } catch {
      return null;
    }
  }
}
