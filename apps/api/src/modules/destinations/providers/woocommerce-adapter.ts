// ============================================
//  WOOCOMMERCE ADAPTER — E-commerce real
// ============================================
// Integração com WooCommerce REST API v3
// Suporta: WooCommerce, lojas com WP + WC

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';
import { createHmac } from 'crypto';

@Injectable()
export class WooCommerceAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'WOOCOMMERCE';

  private readonly logger = new Logger(WooCommerceAdapter.name);
  private baseUrl: string;
  private authHeader: string;

  constructor(private config: ConfigService) {
    const siteUrl = this.config.get('WC_SITE_URL');  // ex: https://loja.com.br
    const consumerKey = this.config.get('WC_CONSUMER_KEY');
    const consumerSecret = this.config.get('WC_CONSUMER_SECRET');

    this.baseUrl = `${siteUrl}/wp-json/wc/v3`;
    this.authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/customers/${externalUserId}`, {
        headers: { 'Authorization': this.authHeader }
      });
      return { isValid: response.ok };
    } catch (err) {
      return { isValid: false, reason: err.message };
    }
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT', retryable: false };
    }

    // 1. Busca product pelo SKU
    const product = await this.findProductBySku(action.sku);
    if (!product) {
      return { status: 'FAILED', errorCode: 'PRODUCT_NOT_FOUND', errorMessage: `SKU ${action.sku} não existe`, retryable: false };
    }

    if (product.stock_quantity < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${product.stock_quantity}`, retryable: true };
    }

    // 2. Cria order
    try {
      const orderPayload = {
        payment_method: 'orkest_pix',
        payment_method_title: 'Orkest (Pix Automático)',
        status: 'processing',  // paid
        customer_id: parseInt(action.userId),
        set_paid: true,
        line_items: [{ product_id: product.id, quantity: action.quantity }],
        meta_data: [
          { key: '_orkest_trigger', value: action.sku },
          { key: '_orkest_external_id', value: action.userId }
        ]
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        return { status: 'FAILED', errorCode: `WC_${response.status}`, errorMessage: await response.text(), retryable: response.status >= 500 };
      }

      const order = await response.json();
      this.logger.log(`[${action.userId}] ✅ WooCommerce order ${order.id} created`);

      return {
        status: 'COMPLETED',
        externalId: order.id.toString(),
        details: {
          orderNumber: order.number,
          orderId: order.id,
          totalBrl: parseFloat(order.total),
          currency: order.currency,
          status: order.status,
          adminUrl: `${this.config.get('WC_SITE_URL')}/wp-admin/post.php?post=${order.id}&action=edit`,
          lineItems: order.line_items.map((li: any) => ({
            name: li.name,
            quantity: li.quantity,
            total: parseFloat(li.total)
          })),
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
        headers: { 'Authorization': this.authHeader }
      });
      if (!response.ok) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };

      const order = await response.json();
      return {
        status: order.status === 'completed' ? 'COMPLETED' : 'PENDING',
        externalId: order.id.toString(),
        details: { orderNumber: order.number, status: order.status }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${externalId}`, {
        method: 'PUT',
        headers: { 'Authorization': this.authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      return { canceled: response.ok };
    } catch (err) {
      return { canceled: false, reason: err.message };
    }
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/orders?customer=${externalUserId}&modified_after=${since.toISOString()}&per_page=100`,
        { headers: { 'Authorization': this.authHeader } }
      );
      if (!response.ok) return { externalOperations: [] };
      const orders = await response.json();
      return {
        externalOperations: orders.map((o: any) => ({
          externalId: o.id.toString(),
          type: 'BUY_PRODUCT' as const,
          amountBrl: parseFloat(o.total),
          executedAt: new Date(o.date_created)
        }))
      };
    } catch {
      return { externalOperations: [] };
    }
  }

  private async findProductBySku(sku: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/products?sku=${encodeURIComponent(sku)}`, {
      headers: { 'Authorization': this.authHeader }
    });
    if (!response.ok) return null;
    const products = await response.json();
    return products[0] || null;
  }
}
