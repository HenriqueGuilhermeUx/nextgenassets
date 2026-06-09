// ============================================
//  OFFERS CONTROLLER — CRUD de produtos/ofertas
// ============================================

import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('offers')
export class OffersController {
  private readonly logger = new Logger(OffersController.name);

  // Lista ofertas de um partner
  @Get()
  async list(
    @Query('partnerId') partnerId?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string
  ) {
    const where: any = {};
    if (partnerId) where.partnerId = partnerId;
    if (type) where.type = type;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    return prisma.offer.findMany({
      where,
      take: limit ? parseInt(limit) : 50,
      orderBy: { updatedAt: 'desc' }
    });
  }

  // Busca uma oferta específica
  @Get(':id')
  async get(@Param('id') id: string) {
    return prisma.offer.findUnique({ where: { id } });
  }

  // Cria/atualiza oferta (idempotente via partnerId+externalId)
  @Post()
  async create(@Body() body: any) {
    return prisma.offer.upsert({
      where: {
        partnerId_externalId: {
          partnerId: body.partnerId,
          externalId: body.externalId
        }
      },
      create: {
        partnerId: body.partnerId,
        externalId: body.externalId,
        externalUrl: body.externalUrl,
        sku: body.sku,
        type: body.type,
        category: body.category,
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        brand: body.brand,
        priceBrl: body.priceBrl,
        inStock: body.inStock ?? true,
        stockQuantity: body.stockQuantity,
        metadata: body.metadata
      },
      update: {
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        priceBrl: body.priceBrl,
        lastPriceUpdate: new Date(),
        inStock: body.inStock,
        stockQuantity: body.stockQuantity,
        metadata: body.metadata
      }
    });
  }

  // Atualização em massa de preço/estoque
  @Post('sync-prices')
  async syncPrices(@Body() body: { partnerId: string; offers: any[] }) {
    const results = [];
    for (const o of body.offers) {
      const updated = await prisma.offer.updateMany({
        where: { partnerId: body.partnerId, externalId: o.externalId },
        data: {
          priceBrl: o.priceBrl,
          inStock: o.inStock,
          stockQuantity: o.stockQuantity,
          lastPriceUpdate: new Date()
        }
      });
      results.push({ externalId: o.externalId, updated: updated.count });
    }
    return { synced: results.length, results };
  }

  // Deleta oferta
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await prisma.offer.delete({ where: { id } });
    return { deleted: true };
  }
}
