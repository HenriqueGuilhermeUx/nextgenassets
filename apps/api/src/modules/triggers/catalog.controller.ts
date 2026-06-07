// Catalog controller — expõe o catálogo de gatilhos
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('catalog')
export class CatalogController {
  @Get('triggers')
  async listTriggers(@Query() query: { category?: string; destinationType?: string }) {
    return prisma.triggerCatalog.findMany({
      where: {
        isActive: true,
        category: query.category as any,
        destinationType: query.destinationType
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
  }

  @Get('triggers/:code')
  async getTrigger(@Param('code') code: string) {
    return prisma.triggerCatalog.findUnique({ where: { code } });
  }

  @Get('categories')
  async getCategories() {
    return [
      { id: 'INVESTMENT_AUTO',    name: 'Investimento Automático', icon: '📈' },
      { id: 'INVESTMENT_PASSIVE', name: 'Aportes Programados',     icon: '📊' },
      { id: 'BANKING',            name: 'Bancário',                icon: '🏦' },
      { id: 'CONSUMPTION',        name: 'Consumo',                 icon: '🛒' },
      { id: 'UTILITY',            name: 'Contas e Serviços',       icon: '💡' },
      { id: 'INSURANCE',          name: 'Seguros',                 icon: '🛡️' },
      { id: 'CUSTOM',             name: 'Regras Customizadas (IA)', icon: '✨' }
    ];
  }
}
