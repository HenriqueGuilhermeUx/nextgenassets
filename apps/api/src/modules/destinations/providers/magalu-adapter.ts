// ============================================
//  MAGAZINE LUIZA (MAGALU) ADAPTER
// ============================================
// Integração via Magalu Commerce Hub
// Docs: https://developer.magalu.com/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class MagaluAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'MAGALU';

  private readonly logger = new Logger(MagaluAdapter.name);
  private baseUrl: string;
  private apiKey: string;
  private storeId: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('MAGALU_API_URL') || 'https://api.magalu.br/commerce/v1';
    this.apiKey = this.config.get('MAGALU_API_KEY');
    this.storeId = this.config.get('MAGALU_STORE_ID');
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT', retryable: false };
    }

    // 1. Busca produto pelo SKU
    const product = await this.findProductBySku(action.sku);
    if (!product) {
      return { status: 'FAILED', errorCode: 'PRODUCT_NOT_FOUND', errorMessage: `SKU ${action.sku} não existe`, retryable: false };
    }

    if (product.stock < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${product.stock}`, retryable: true };
    }

    // 2. Cria order
    try {
      const orderPayload = {
        store_id: this.storeId,
        customer_id: action.userId,
        items: [{
          sku: action.sku,
          quantity: action.quantity
        }],
        payment: {
          method: 'pix',
          status: 'paid',  // Pix já caiu via Orkest
          transaction_id: `orkest_${Date.now()}`
        },
        shipping: {
          method: 'magalu_entregas'  // ou 'correios'
        },
        metadata: {
          source: 'orkest',
          orkest_user: action.userId
        }
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        return { status: 'FAILED', errorCode: `MAGALU_${response.status}`, errorMessage: await response.text(), retryable: response.status >= 500 };
      }

      const order = await response.json();
      this.logger.log(`[${action.userId}] ✅ Magalu order ${order.id} created`);

      return {
        status: 'COMPLETED',
        externalId: order.id.toString(),
        details: {
          orderId: order.id,
          magaluOrderUrl: `https://www.magazineluiza.com.br/conta/pedidos/${order.id}`,
          totalBrl: order.total,
          currency: 'BRL',
          status: order.status,
          estimatedDelivery: order.estimated_delivery,
          trackingCode: order.tracking_code
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}`, {
        headers: { 'X-Api-Key': this.apiKey }
      });
      if (!response.ok) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };
      const order = await response.json();
      return {
        status: order.status === 'delivered' ? 'COMPLETED' : 'PENDING',
        externalId: order.id.toString(),
        details: { status: order.status, tracking: order.tracking_code }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}/cancel`, {
        method: 'POST',
        headers: { 'X-Api-Key': this.apiKey }
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
        `${this.baseUrl}/orders?store_id=${this.storeId}&customer_id=${externalUserId}&updated_after=${sinceStr}`,
        { headers: { 'X-Api-Key': this.apiKey } }
      );
      if (!response.ok) return { externalOperations: [] };
      const data = await response.json();
      return {
        externalOperations: (data.orders || []).map((o: any) => ({
          externalId: o.id.toString(),
          type: 'BUY_PRODUCT' as const,
          amountBrl: o.total,
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

  private async findProductBySku(sku: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/products?sku=${encodeURIComponent(sku)}&store_id=${this.storeId}`,
        { headers: { 'X-Api-Key': this.apiKey } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const product = data.products?.[0];
      return product ? { sku: product.sku, price: product.price, stock: product.stock, name: product.name } : null;
    } catch {
      return null;
    }
  }
}
