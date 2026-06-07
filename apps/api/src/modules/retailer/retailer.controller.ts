// ============================================
//  RETAILER CONTROLLER — Pre-order flow completo
// ============================================
// Endpoints pra lojista gerenciar:
// - Pipeline de pre-orders
// - Confirmação de pagamento
// - Despacho com rastreio
// - Inventário
// - Restocks programados

import { Controller, Get, Post, Param, Body, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MockRetailer, PreOrderReservation } from '../destinations/mock-providers/mock-retailer';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

@Controller('retailer')
export class RetailerController {
  constructor(private mockRetailer: MockRetailer) {}

  // ========== PRE-ORDERS (Pipeline do Lojista) ==========

  // Cria pre-order (chamado pelo Trigger Engine quando gatilho de varejo é ativado)
  @Post('pre-orders')
  async createPreOrder(@Body() body: {
    userId: string;
    sku: string;
    quantity: number;
    scheduledFor?: string;  // ISO date, default: hoje
    triggerId?: string;
  }): Promise<PreOrderReservation> {
    if (!body.userId || !body.sku) {
      throw new BadRequestException('userId e sku são obrigatórios');
    }
    return this.mockRetailer.createPreOrder({
      userId: body.userId,
      sku: body.sku,
      quantity: body.quantity || 1,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : new Date()
    });
  }

  // Confirma pre-order (Pix caiu, produto reservado)
  @Post('pre-orders/:id/confirm')
  async confirmPreOrder(@Param('id') id: string): Promise<PreOrderReservation> {
    const reservation = await this.mockRetailer.confirmPreOrder(id);
    // Atualiza execution no banco
    await prisma.execution.updateMany({
      where: { externalId: id },
      data: {
        status: 'COMPLETED',
        result: reservation as any,
        executionCompletedAt: new Date()
      }
    });
    return reservation;
  }

  // Despacha pre-order (cria tracking, notifica cliente)
  @Post('pre-orders/:id/ship')
  async shipPreOrder(@Param('id') id: string): Promise<PreOrderReservation> {
    return this.mockRetailer.shipPreOrder(id);
  }

  // Lista todas as pre-orders
  @Get('pre-orders')
  async listPreOrders(@Query() q: { status?: string; userId?: string; sku?: string }): Promise<PreOrderReservation[]> {
    const pipeline = this.mockRetailer.getPipeline();
    let reservations: PreOrderReservation[] = [];

    if (q.status === 'PENDING') reservations = pipeline.pending;
    else if (q.status === 'CONFIRMED') reservations = pipeline.confirmed;
    else if (q.status === 'FULFILLED') reservations = pipeline.fulfilled;
    else reservations = [...pipeline.pending, ...pipeline.confirmed, ...pipeline.fulfilled];

    if (q.userId) reservations = reservations.filter(r => r.userId === q.userId);
    if (q.sku) reservations = reservations.filter(r => r.sku === q.sku);

    return reservations;
  }

  // Resumo do pipeline (KPIs pra dashboard)
  @Get('pipeline/summary')
  async getPipelineSummary() {
    return this.mockRetailer.getPipeline().summary;
  }

  // ========== INVENTÁRIO ==========

  @Get('inventory')
  async getInventory() {
    return this.mockRetailer.getInventory();
  }

  // Produtos que voltam ao estoque hoje
  @Get('restocks/today')
  async getRestocksToday() {
    return this.mockRetailer.getRestocksToday();
  }

  // ========== ESTATÍSTICAS ==========

  // Previsão de receita por horizonte
  @Get('forecast')
  async getForecast() {
    const pipeline = this.mockRetailer.getPipeline();
    const summary = pipeline.summary;

    return {
      pipeline: summary,
      forecast: {
        conservative: summary.totalPendingValue * 0.20,  // 20% chance de conversão
        realistic: summary.totalPendingValue * 0.40,     // 40% chance
        optimistic: summary.totalPendingValue * 0.65      // 65% chance
      },
      insights: {
        avgValuePerReservation: summary.totalPendingCount > 0
          ? summary.totalPendingValue / summary.totalPendingCount
          : 0,
        confirmationRate: summary.totalPendingCount > 0
          ? (summary.totalConfirmedCount / (summary.totalPendingCount + summary.totalConfirmedCount)) * 100
          : 0,
        topProduct: summary.bySku[0] || null
      }
    };
  }
}
