// ============================================
//  VTEX ADAPTER — E-commerce enterprise BR
// ============================================
// Integração com VTEX IO Master Data + Orders API
// Docs: https://developers.vtex.com/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

@Injectable()
export class VtexAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'VTEX';

  private readonly logger = new Logger(VtexAdapter.name);
  private baseUrl: string;
  private appKey: string;
  private appToken: string;
  private accountName: string;
  private environment: string;

  constructor(private config: ConfigService) {
    this.accountName = this.config.get('VTEX_ACCOUNT') || '';
    this.environment = this.config.get('VTEX_ENV') || 'vtexcommercestable';
    this.appKey = this.config.get('VTEX_APP_KEY');
    this.appToken = this.config.get('VTEX_APP_TOKEN');
    this.baseUrl = `https://${this.accountName}.${this.environment}.com.br`;
  }

  /**
   * Headers padrão pra chamadas VTEX
   */
  private get headers() {
    return {
      'X-VTEX-API-AppKey': this.appKey,
      'X-VTEX-API-AppToken': this.appToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    try {
      // VTEX Master Data — busca cliente
      const response = await fetch(
        `${this.baseUrl}/api/dataentities/CL/search?_where=documentId=${externalUserId}&_fields=documentId,email`,
        { headers: this.headers }
      );
      if (!response.ok) return { isValid: false, reason: 'Cliente não encontrado na VTEX' };
      return { isValid: true };
    } catch (err) {
      return { isValid: false, reason: err.message };
    }
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type !== 'BUY_PRODUCT') {
      return { status: 'FAILED', errorCode: 'UNSUPPORTED', errorMessage: 'Apenas BUY_PRODUCT', retryable: false };
    }

    // 1. Busca SKU
    const sku = await this.findSkuByRefId(action.sku);
    if (!sku) {
      return { status: 'FAILED', errorCode: 'SKU_NOT_FOUND', errorMessage: `RefId ${action.sku} não existe`, retryable: false };
    }

    // 2. Verifica estoque
    const stock = await this.getStock(sku.Id);
    if (stock < action.quantity) {
      return { status: 'FAILED', errorCode: 'OUT_OF_STOCK', errorMessage: `Estoque: ${stock}`, retryable: true };
    }

    // 3. Cria order via VTEX Orders API
    try {
      const orderPayload = {
        items: [{
          id: sku.Id,
          quantity: action.quantity,
          seller: '1',
          price: Math.round(action.amountBrl / action.quantity * 100)  // VTEX usa centavos
        }],
        client: {
          id: action.userId,
          // Em produção, o email viria de lookup no Master Data
          email: `user-${action.userId}@orkest.com.br`
        },
        paymentData: {
          transactions: [{
            payments: [{
              paymentSystem: '47',  // Pix
              paymentSystemName: 'Pix',
              value: Math.round(action.amountBrl * 100),
              status: 'approved',
              authorizationId: `orkest-pix-${Date.now()}`
            }]
          }]
        },
        status: 'ready-for-handling',
        statusDescription: 'Pago via Orkest',
        customData: {
          customApps: [{
            id: 'orkest-trigger',
            major: 1,
            fields: {
              triggerSource: 'orkest',
              orkestUser: action.userId,
              orkestSku: action.sku
            }
          }]
        }
      };

      const response = await fetch(`${this.baseUrl}/api/oms/pvt/orders`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errBody = await response.text();
        return { status: 'FAILED', errorCode: `VTEX_${response.status}`, errorMessage: errBody, retryable: response.status >= 500 };
      }

      const order = await response.json();
      this.logger.log(`[${action.userId}] ✅ VTEX order ${order.orderId} created`);

      // 4. Recupera detalhes completos
      const orderDetails = await this.getOrderDetails(order.orderId);

      return {
        status: 'COMPLETED',
        externalId: order.orderId,
        details: {
          orderId: order.orderId,
          vtexOrderUrl: `https://${this.accountName}.myvtex.com/admin/orders/${order.orderId}`,
          totalBrl: action.amountBrl,
          currency: 'BRL',
          status: 'ready-for-handling',
          items: orderDetails.items,
          createdAt: new Date().toISOString()
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message, retryable: true };
    }
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const order = await this.getOrderDetails(externalId);
      return {
        status: order.status === 'invoiced' || order.status === 'completed' ? 'COMPLETED' : 'PENDING',
        externalId: order.orderId,
        details: {
          status: order.status,
          trackingCode: order.shippingData?.trackingHints?.[0]?.trackingId
        }
      };
    } catch (err) {
      return { status: 'FAILED', errorCode: 'NETWORK_ERROR', errorMessage: err.message };
    }
  }

  async cancel(externalId: string): Promise<CancelResult> {
    try {
      // VTEX usa POST pra cancelar com body específico
      const response = await fetch(`${this.baseUrl}/api/oms/pvt/orders/${externalId}/cancel`, {
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
      // VTEX List Orders API
      const sinceStr = since.toISOString();
      const response = await fetch(
        `${this.baseUrl}/api/oms/pvt/orders?clientId=${externalUserId}&f_creationDate=creationDate:[${sinceStr} TO *]`,
        { headers: this.headers }
      );
      if (!response.ok) return { externalOperations: [] };
      const data = await response.json();
      return {
        externalOperations: (data.list || []).map((o: any) => ({
          externalId: o.orderId,
          type: 'BUY_PRODUCT' as const,
          amountBrl: o.value / 100,
          executedAt: new Date(o.creationDate)
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
    const product = await this.findSkuByRefId(sku);
    if (!product) return { price: 0, currency: 'BRL', timestamp: new Date() };
    return { price: product.ListPrice || 0, currency: 'BRL', timestamp: new Date() };
  }

  // ========== Métodos auxiliares VTEX ==========

  private async findSkuByRefId(refId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/catalog_system/pvt/sku/stockkeepingunitbyrefid/${encodeURIComponent(refId)}`,
        { headers: this.headers }
      );
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private async getStock(skuId: number): Promise<number> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/logistics/pvt/inventory/skus/${skuId}`,
        { headers: this.headers }
      );
      if (!response.ok) return 0;
      const data = await response.json();
      return data.balance?.[0]?.totalQuantity || 0;
    } catch {
      return 0;
    }
  }

  private async getOrderDetails(orderId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/oms/pvt/orders/${orderId}`, { headers: this.headers });
      if (!response.ok) return { orderId, status: 'unknown' };
      return await response.json();
    } catch {
      return { orderId, status: 'unknown' };
    }
  }
}
