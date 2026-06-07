// ============================================
//  MERCADO LIVRE ADAPTER — Marketplace BR
// ============================================
// Integração com Mercado Livre API
// Docs: https://developers.mercadolivre.com.br/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class MercadoLivreAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'MERCADO_LIVRE';

  private readonly logger = new Logger(MercadoLivreAdapter.name);
  private baseUrl: string;
  private accessToken: string;
  private userId: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('ML_API_URL') || 'https://api.mercadolibre.com';
    this.accessToken = this.config.get('ML_ACCESS_TOKEN');
    this.userId = this.config.get('ML_USER_ID');
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT', retryable: false };
    }

    // 1. Busca item pelo SKU
    const item = await this.findItemBySku(action.sku);
    if (!item) {
      return { status: 'FAILED', errorCode: 'ITEM_NOT_FOUND', errorMessage: `SKU ${action.sku} não existe no ML`, retryable: false };
    }

    // 2. Verifica estoque
    if (item.available_quantity < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${item.available_quantity}`, retryable: true };
    }

    // 3. Cria order via ML Orders API
    try {
      const orderPayload = {
        items: [{
          id: item.id,
          quantity: action.quantity,
          unit_price: item.price
        }],
        buyer: { id: parseInt(action.userId) },
        payment_method_id: 'orkest_pix',
        payment_status: 'paid',
        shipping: { mode: 'me2' },  // Mercado Envios
        metadata: {
          source: 'orkest',
          trigger_id: action.userId
        }
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        return { status: 'FAILED', errorCode: `ML_${response.status}`, errorMessage: await response.text(), retryable: response.status >= 500 };
      }

      const order = await response.json();
      this.logger.log(`[${action.userId}] ✅ ML order ${order.id} created`);

      return {
        status: 'COMPLETED',
        externalId: order.id.toString(),
        details: {
          orderId: order.id,
          mlOrderUrl: `https://www.mercadolivre.com.br/orders/${order.id}`,
          totalBrl: order.total_amount,
          currency: 'BRL',
          items: order.items,
          status: order.status,
          shippingId: order.shipping?.id,
          createdAt: order.date_created
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (!response.ok) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };
      const order = await response.json();
      return {
        status: order.status === 'delivered' ? 'COMPLETED' : 'PENDING',
        externalId: order.id.toString(),
        details: { status: order.status, shippingStatus: order.shipping?.status }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
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
        `${this.baseUrl}/orders/search?seller=${this.userId}&buyer=${externalUserId}&updated_after=${sinceStr}`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      if (!response.ok) return { externalOperations: [] };
      const data = await response.json();
      return {
        externalOperations: (data.results || []).map((o: any) => ({
          externalId: o.id.toString(),
          type: 'BUY_PRODUCT' as const,
          amountBrl: o.total_amount,
          executedAt: new Date(o.date_created)
        }))
      };
    } catch {
      return { externalOperations: [] };
    }
  }

  async listSupportedAssets(): Promise<string[]> {
    // ML tem catálogo enorme; aqui só listaria os SKUs configurados
    return [];
  }

  async getQuote(sku: string) {
    const item = await this.findItemBySku(sku);
    return { price: item?.price || 0, currency: 'BRL', timestamp: new Date() };
  }

  private async findItemBySku(sku: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/users/${this.userId}/items/search?sku=${encodeURIComponent(sku)}`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const itemId = data.results?.[0];
      if (!itemId) return null;

      const itemResponse = await fetch(`${this.baseUrl}/items/${itemId}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (!itemResponse.ok) return null;
      const item = await itemResponse.json();
      return {
        id: item.id,
        price: item.price,
        available_quantity: item.available_quantity,
        title: item.title
      };
    } catch {
      return null;
    }
  }
}
