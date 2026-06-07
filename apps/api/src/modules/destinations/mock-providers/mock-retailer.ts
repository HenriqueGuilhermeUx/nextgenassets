// ============================================
//  MOCK RETAILER v2 — Pre-order + Restock + Pipeline
// ============================================
// Simula varejista com:
// - Catálogo completo
// - Modo pre-order (reserva sem pagamento imediato)
// - Detecção de restock (produto volta ao estoque)
// - Tracking de envio realista
// - Reservas de inventário (visível no dashboard)

import { Injectable, Logger } from '@nestjs/common';
import {
  DestinationAdapter, DestinationAction, ExecutionResult, ExecutionStatusResult,
  ValidationResult, CancelResult, ReconciliationResult
} from '../destination.interface';

export interface PreOrderReservation {
  externalId: string;
  userId: string;
  sku: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalBrl: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'FULFILLED';
  scheduledFor: Date;
  createdAt: Date;
  reservedAt?: Date;
  paidAt?: Date;
  shippedAt?: Date;
  trackingCode?: string;
  estimatedDeliveryDays?: number;
}

@Injectable()
export class MockRetailer implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'MOCK_RETAILER';

  private readonly logger = new Logger(MockRetailer.name);

  // Catálogo de produtos (com campo opcional "restockDate" pra simular volta)
  private catalog: Record<string, {
    name: string;
    priceBrl: number;
    stock: number;
    initialStock: number;
    category: string;
    restockDate?: Date;  // se setado, produto está fora de estoque até essa data
  }> = {
    'BISCOITO_Z_150G':   { name: 'Biscoito Z 150g',         priceBrl: 6.20,  stock: 500, initialStock: 500, category: 'Snack' },
    'CAFE_X_500G':       { name: 'Café X 500g Torrado',     priceBrl: 18.90, stock: 200, initialStock: 200, category: 'Bebida' },
    'LEITE_INTEGRAL_1L': { name: 'Leite Integral 1L',       priceBrl: 5.80,  stock: 350, initialStock: 350, category: 'Laticínio' },
    'TV_50_4K_SAMSUNG':  { name: 'TV Samsung 50" 4K',       priceBrl: 2499.00, stock: 15,  initialStock: 15,  category: 'Eletrônico' },
    'NOTEBOOK_GAMER_X':  { name: 'Notebook Gamer X',        priceBrl: 5499.00, stock: 8,   initialStock: 8,   category: 'Eletrônico' },
    'LIVRO_X':           { name: 'Livro "X" — Bestseller',  priceBrl: 49.90,  stock: 100, initialStock: 100, category: 'Livro' },
    // Produtos de exemplo do novo caso de uso (perfumaria):
    'PERFUME_IMPORTADO_X': { name: 'Perfume Importado X 100ml', priceBrl: 489.00, stock: 30, initialStock: 30, category: 'Perfumaria' },
    'PERFUME_Y':         { name: 'Perfume Y Eau de Toilette',   priceBrl: 350.00, stock: 45, initialStock: 45, category: 'Perfumaria' },
    'PERFUME_Z':         { name: 'Perfume Z Premium',           priceBrl: 650.00, stock: 12, initialStock: 12, category: 'Perfumaria' },
    'PERFUME_RARO_V':    {
      name: 'Perfume Raro V — Edição Limitada',
      priceBrl: 550.00,
      stock: 0,  // ESGOTADO
      initialStock: 8,
      category: 'Perfumaria',
      restockDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)  // volta em 15 dias
    }
  };

  private orders = new Map<string, any>();
  private reservations = new Map<string, PreOrderReservation>();  // pre-orders

  // ========== Destinations Adapter Interface ==========

  async validateUser(externalUserId: string): Promise<ValidationResult> {
    return { isValid: true };
  }

  async execute(action: DestinationAction): Promise<ExecutionResult> {
    this.logger.log(`[${action.userId}] Executing ${action.type}`);

    if (action.type !== 'BUY_PRODUCT') {
      return {
        status: 'FAILED', errorCode: 'UNSUPPORTED_ACTION',
        errorMessage: `Action ${action.type} not supported`, retryable: false
      };
    }

    await new Promise(r => setTimeout(r, 300 + Math.random() * 1200));

    const product = this.catalog[action.sku];
    if (!product) {
      return {
        status: 'FAILED', errorCode: 'PRODUCT_NOT_FOUND',
        errorMessage: `Produto ${action.sku} não encontrado`, retryable: false
      };
    }

    // Verifica se produto voltou ao estoque (caso restockDate já passou)
    if (product.stock === 0 && product.restockDate && new Date() >= product.restockDate) {
      product.stock = product.initialStock;
      product.restockDate = undefined;
      this.logger.log(`📦 ${action.sku} voltou ao estoque: ${product.stock} unidades`);
    }

    if (product.stock < action.quantity) {
      return {
        status: 'FAILED', errorCode: 'OUT_OF_STOCK',
        errorMessage: `Estoque insuficiente: ${product.stock} disponíveis, ${action.quantity} solicitados`,
        retryable: true  // pode resolver com restock
      };
    }

    const totalBrl = product.priceBrl * action.quantity;
    product.stock -= action.quantity;

    const externalId = `MOCK-ECOMM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const deliveryDays = 2 + Math.floor(Math.random() * 5);
    const result = {
      status: 'COMPLETED',
      externalId,
      details: {
        sku: action.sku,
        productName: product.name,
        category: product.category,
        quantity: action.quantity,
        pricePerUnit: product.priceBrl,
        totalBrl,
        retailer: 'Mock Retailer',
        estimatedDeliveryDays: deliveryDays,
        trackingCode: `BR${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        carrier: ['Correios', 'Mercado Envios', 'Magalu Entregas', 'Loggi'][Math.floor(Math.random() * 4)],
        orderPlacedAt: new Date().toISOString(),
        inventoryReserved: true,
        remainingStock: product.stock
      }
    };

    this.orders.set(externalId, { action, status: 'COMPLETED', result });
    this.logger.log(`[${action.userId}] ✅ Pedido ${externalId}: ${action.quantity}x ${product.name} = R$ ${totalBrl.toFixed(2)} (estoque: ${product.stock})`);
    return result;
  }

  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    const order = this.orders.get(externalId);
    if (!order) return { status: 'FAILED', errorCode: 'NOT_FOUND', errorMessage: 'Pedido não encontrado' };
    return order.result;
  }

  async cancel(externalId: string): Promise<CancelResult> {
    const order = this.orders.get(externalId);
    if (order) {
      const product = this.catalog[order.action.sku];
      if (product) product.stock += order.action.quantity;
    }
    this.orders.delete(externalId);
    return { canceled: true };
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    const userOrders = Array.from(this.orders.entries())
      .filter(([_, order]) => order.action.userId === externalUserId)
      .map(([externalId, order]) => ({
        externalId,
        type: order.action.type,
        amountBrl: order.result.details?.totalBrl,
        quantity: order.result.details?.quantity,
        asset: order.result.details?.sku,
        executedAt: new Date(order.result.details?.orderPlacedAt || Date.now())
      }));
    return { externalOperations: userOrders };
  }

  async listSupportedAssets(): Promise<string[]> {
    return Object.keys(this.catalog);
  }

  async getQuote(sku: string) {
    const product = this.catalog[sku];
    return { price: product?.priceBrl || 0, currency: 'BRL', timestamp: new Date() };
  }

  // ========== NOVOS MÉTODOS: Pre-order + Restock + Pipeline ==========

  /**
   * Cria uma reserva/pre-order (sem pagamento imediato)
   * Usado pelos gatilhos BALANCE_TRIGGER_BUY, GOAL_ACCUMULATION_BUY, etc.
   */
  async createPreOrder(params: {
    userId: string;
    sku: string;
    quantity: number;
    scheduledFor: Date;
  }): Promise<PreOrderReservation> {
    const product = this.catalog[params.sku];
    if (!product) throw new Error(`Produto ${params.sku} não encontrado`);

    const externalId = `PRE-ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const reservation: PreOrderReservation = {
      externalId,
      userId: params.userId,
      sku: params.sku,
      productName: product.name,
      quantity: params.quantity,
      pricePerUnit: product.priceBrl,
      totalBrl: product.priceBrl * params.quantity,
      status: 'PENDING',
      scheduledFor: params.scheduledFor,
      createdAt: new Date()
    };

    this.reservations.set(externalId, reservation);
    this.logger.log(`📋 Pre-order criado: ${reservation.externalId} - ${params.sku} (dispara em ${params.scheduledFor.toLocaleDateString('pt-BR')})`);
    return reservation;
  }

  /**
   * Confirma uma reserva (Pix caiu, produto reservado no estoque)
   */
  async confirmPreOrder(externalId: string): Promise<PreOrderReservation> {
    const reservation = this.reservations.get(externalId);
    if (!reservation) throw new Error('Reserva não encontrada');
    if (reservation.status !== 'PENDING') {
      throw new Error(`Reserva já está ${reservation.status}`);
    }

    // Verifica se produto tem estoque
    const product = this.catalog[reservation.sku];
    if (product.stock < reservation.quantity) {
      throw new Error(`Estoque insuficiente pra confirmar reserva`);
    }

    // Reserva no inventário (decrementa estoque virtual)
    product.stock -= reservation.quantity;
    reservation.status = 'CONFIRMED';
    reservation.reservedAt = new Date();

    this.logger.log(`✅ Reserva confirmada: ${externalId} - ${reservation.productName} (estoque: ${product.stock})`);
    return reservation;
  }

  /**
   * Despacha o produto (cria tracking code + notifica)
   */
  async shipPreOrder(externalId: string): Promise<PreOrderReservation> {
    const reservation = this.reservations.get(externalId);
    if (!reservation || reservation.status !== 'CONFIRMED') {
      throw new Error('Reserva não está confirmada');
    }

    const deliveryDays = 2 + Math.floor(Math.random() * 5);
    reservation.status = 'FULFILLED';
    reservation.shippedAt = new Date();
    reservation.trackingCode = `BR${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    reservation.estimatedDeliveryDays = deliveryDays;

    this.logger.log(`🚚 Despachado: ${externalId} - rastreio ${reservation.trackingCode}`);
    return reservation;
  }

  /**
   * Lista todas as reservas pendentes (pipeline de vendas pro lojista)
   */
  getPipeline(): {
    pending: PreOrderReservation[];
    confirmed: PreOrderReservation[];
    fulfilled: PreOrderReservation[];
    summary: {
      totalPendingValue: number;
      totalPendingCount: number;
      totalConfirmedValue: number;
      totalConfirmedCount: number;
      bySku: { sku: string; name: string; count: number; value: number }[];
    };
  } {
    const all = Array.from(this.reservations.values());
    const pending = all.filter(r => r.status === 'PENDING');
    const confirmed = all.filter(r => r.status === 'CONFIRMED');
    const fulfilled = all.filter(r => r.status === 'FULFILLED');

    const bySku = new Map<string, { sku: string; name: string; count: number; value: number }>();
    [...pending, ...confirmed].forEach(r => {
      const existing = bySku.get(r.sku);
      if (existing) {
        existing.count++;
        existing.value += r.totalBrl;
      } else {
        bySku.set(r.sku, { sku: r.sku, name: r.productName, count: 1, value: r.totalBrl });
      }
    });

    return {
      pending,
      confirmed,
      fulfilled,
      summary: {
        totalPendingValue: pending.reduce((sum, r) => sum + r.totalBrl, 0),
        totalPendingCount: pending.length,
        totalConfirmedValue: confirmed.reduce((sum, r) => sum + r.totalBrl, 0),
        totalConfirmedCount: confirmed.length,
        bySku: Array.from(bySku.values()).sort((a, b) => b.value - a.value)
      }
    };
  }

  /**
   * Lista reservas por SKU
   */
  getReservationsBySku(sku: string): PreOrderReservation[] {
    return Array.from(this.reservations.values()).filter(r => r.sku === sku);
  }

  /**
   * Lista reservas por usuário
   */
  getReservationsByUser(userId: string): PreOrderReservation[] {
    return Array.from(this.reservations.values()).filter(r => r.userId === userId);
  }

  /**
   * Detecta produtos que voltam ao estoque hoje
   */
  getRestocksToday(): { sku: string; name: string; restockQuantity: number }[] {
    const today = new Date();
    return Object.entries(this.catalog)
      .filter(([_, p]) => p.stock === 0 && p.restockDate && new Date(p.restockDate) <= today)
      .map(([sku, p]) => ({
        sku,
        name: p.name,
        restockQuantity: p.initialStock
      }));
  }

  /**
   * Inventário atual (pra dashboard do lojista)
   */
  getInventory(): { sku: string; name: string; category: string; priceBrl: number; stock: number; initialStock: number; restockDate?: Date; lowStock: boolean }[] {
    return Object.entries(this.catalog).map(([sku, p]) => ({
      sku,
      name: p.name,
      category: p.category,
      priceBrl: p.priceBrl,
      stock: p.stock,
      initialStock: p.initialStock,
      restockDate: p.restockDate,
      lowStock: p.stock < p.initialStock * 0.2
    }));
  }
}
