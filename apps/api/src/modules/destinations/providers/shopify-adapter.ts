// ============================================
//  SHOPIFY ADAPTER — E-commerce real
// ============================================
// Integração com Shopify Storefront + Admin API
// Suporta: Shopify, Shopify Plus, headless Shopify

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class ShopifyAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'SHOPIFY';

  private readonly logger = new Logger(ShopifyAdapter.name);
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(private config: ConfigService) {
    const shop = this.config.get('SHOPIFY_SHOP_DOMAIN');  // ex: loja.myshopify.com
    const accessToken = this.config.get('SHOPIFY_ADMIN_ACCESS_TOKEN');
    const apiVersion = this.config.get('SHOPIFY_API_VERSION') || '2024-01';

    this.baseUrl = `https://${shop}/admin/api/${apiVersion}`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    };
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    try {
      // Busca customer no Shopify
      const response = await fetch(`${this.baseUrl}/customers/${externalUserId}.json`, { headers: this.headers });
      if (response.ok) {
        return { isValid: true };
      }
      return { isValid: false, reason: 'Customer não encontrado na loja' };
    } catch (err) {
      return { isValid: false, reason: err.message };
    }
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT é suportado', retryable: false };
    }

    // 1. Busca o produto pelo SKU (variant)
    const variant = await this.findVariantBySku(action.sku);
    if (!variant) {
      return { status: 'FAILED', errorCode: 'PRODUCT_NOT_FOUND', errorMessage: `SKU ${action.sku} não existe na loja`, retryable: false };
    }

    // 2. Verifica estoque
    if (variant.inventory_quantity < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${variant.inventory_quantity}`, retryable: true };
    }

    // 3. Cria order com pagamento já efetuado (vindo do Orkest)
    try {
      const orderPayload = {
        order: {
          line_items: [{ variant_id: variant.id, quantity: action.quantity }],
          customer: { id: parseInt(action.userId) },
          financial_status: 'paid',  // Pix já caiu
          fulfillment_status: null,
          note: `Compra via Orkest Trigger Engine — external: ${action.sku}`,
          tags: 'orkest,automated,pix-paid'
        }
      };

      const response = await fetch(`${this.baseUrl}/orders.json`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errBody = await response.text();
        return { status: 'FAILED', errorCode: `SHOPIFY_${response.status}`, errorMessage: errBody, retryable: response.status >= 500 };
      }

      const data = await response.json();
      const order = data.order;

      this.logger.log(`[${action.userId}] ✅ Shopify order ${order.id} created: ${order.name}`);

      return {
        status: 'COMPLETED',
        externalId: order.id.toString(),
        details: {
          orderNumber: order.name,
          orderId: order.id,
          shopifyOrderUrl: `${this.config.get('SHOPIFY_SHOP_DOMAIN')}/admin/orders/${order.id}`,
          totalBrl: parseFloat(order.total_price),
          currency: order.currency,
          customerEmail: order.customer?.email,
          lineItems: order.line_items.map((li: any) => ({
            title: li.title,
            quantity: li.quantity,
            price: parseFloat(li.price)
          })),
          createdAt: order.created_at
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}.json`, { headers: this.headers });
      if (!response.ok) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };

      const data = await response.json();
      const order = data.order;
      return {
        status: order.fulfillment_status === 'fulfilled' ? 'COMPLETED' : 'PENDING',
        externalId: order.id.toString(),
        details: {
          orderNumber: order.name,
          fulfillment: order.fulfillment_status,
          tracking: order.fulfillments?.[0]?.tracking_number
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}/cancel.json`, {
        method: 'POST',
        headers: this.headers
      });
      if (response.ok) {
        return { canceled: true };
      }
      return { canceled: false, reason: `HTTP ${response.status}` };
    } catch (err) {
      return { canceled: false, reason: err.message };
    }
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/orders.json?customer_id=${externalUserId}&updated_at_min=${since.toISOString()}&status=any`,
        { headers: this.headers }
      );
      if (!response.ok) return { externalOperations: [] };

      const data = await response.json();
      return {
        externalOperations: (data.orders || []).map((o: any) => ({
          externalId: o.id.toString(),
          type: 'BUY_PRODUCT' as const,
          amountBrl: parseFloat(o.total_price),
          executedAt: new Date(o.created_at)
        }))
      };
    } catch {
      return { externalOperations: [] };
    }
  }

  // ========== Métodos auxiliares ==========

  private async findVariantBySku(sku: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/variants.json?sku=${encodeURIComponent(sku)}`, { headers: this.headers });
    if (!response.ok) return null;
    const data = await response.json();
    return data.variants?.[0] || null;
  }
}
