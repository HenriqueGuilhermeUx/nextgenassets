// ============================================
//  RAPPI ADAPTER — Delivery + RappiPay (gig economy)
// ============================================
// Casos de uso:
// 1. RappiPay como fonte de renda (auto-save % de cada pagamento de entregador)
// 2. Pedidos agendados no Rappi (comida, mercado, farmácia)
// 3. Recorrência com price-trigger ("quando meu produto favorito tiver cupom")

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class RappiAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'RAPPI';

  private readonly logger = new Logger(RappiAdapter.name);
  private baseUrl: string;
  private apiKey: string;
  private storeId: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('RAPPI_API_URL') || 'https://services.grability.com/rappi-pay/v1';
    this.apiKey = this.config.get('RAPPI_API_KEY');
    this.storeId = this.config.get('RAPPI_STORE_ID');
  }

  private get headers() {
    return { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type} via Rappi`);

    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT', retryable: false };
    }

    const product = await this.findProductBySku(action.sku);
    if (!product) {
      return { status: 'FAILED', errorCode: 'PRODUCT_NOT_FOUND', errorMessage: `Item ${action.sku} não está disponível`, retryable: false };
    }

    if (product.stock < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${product.stock}`, retryable: true };
    }

    try {
      const orderPayload = {
        store_id: this.storeId,
        user_id: action.userId,
        items: [{
          sku: action.sku,
          quantity: action.quantity,
          unit_price: product.price
        }],
        payment: {
          method: 'rappi_pay',
          status: 'paid',  // RappiPay prepaid
          prepaid_via: 'orkest',
          transaction_id: `orkest-${Date.now()}`
        },
        delivery: {
          type: 'rappi',  // ou 'rappi_aliados' pra mercado/farmácia
          address_id: await this.getUserAddressId(action.userId)
        },
        metadata: {
          source: 'orkest',
          trigger_type: 'automated',
          orkest_user: action.userId
        }
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        return { status: 'FAILED', errorCode: `RAPPI_${response.status}`, errorMessage: await response.text(), retryable: response.status >= 500 };
      }

      const order = await response.json();
      this.logger.log(`[${action.userId}] ✅ Rappi order ${order.id} created`);

      return {
        status: 'COMPLETED',
        externalId: order.id,
        details: {
          orderId: order.id,
          rappiOrderUrl: `https://www.rappi.com.br/orders/${order.id}`,
          totalBrl: order.total_amount,
          currency: 'BRL',
          status: order.status,
          estimatedDelivery: order.estimated_delivery,
          trackingCode: order.tracking_code,
          courier: order.courier?.name,
          items: order.items
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}`, { headers: this.headers });
      if (!response.ok) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };
      const order = await response.json();
      return {
        status: order.status === 'delivered' ? 'COMPLETED' : 'PENDING',
        externalId: order.id,
        details: { status: order.status, courier: order.courier?.name }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}/cancel`, {
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
        `${this.baseUrl}/orders?user_id=${externalUserId}&created_after=${sinceStr}`,
        { headers: this.headers }
      );
      if (!response.ok) return { externalOperations: [] };
      const data = await response.json();
      return {
        externalOperations: (data.orders || []).map((o: any) => ({
          externalId: o.id,
          type: 'BUY_PRODUCT' as const,
          amountBrl: o.total_amount,
          executedAt: new Date(o.created_at)
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

  /**
   * Helper: busca endereço padrão do usuário no Rappi
   */
  private async getUserAddressId(userId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/addresses`, { headers: this.headers });
      if (!response.ok) return 'default';
      const data = await response.json();
      return data.addresses?.[0]?.id || 'default';
    } catch {
      return 'default';
    }
  }

  private async findProductBySku(sku: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/stores/${this.storeId}/products?sku=${encodeURIComponent(sku)}`, { headers: this.headers });
      if (!response.ok) return null;
      const products = await response.json();
      const p = products[0];
      return p ? { sku: p.sku, name: p.name, price: p.price, stock: p.stock } : null;
    } catch {
      return null;
    }
  }
}
