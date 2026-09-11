import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SmartOperationsService } from './smart-operations.service';

const prisma = new PrismaClient();

@Controller('smart-operations')
export class SmartOperationsReadController {
  constructor(private readonly service: SmartOperationsService) {}

  @Get('purchases')
  async purchases(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.service.ensureTables();
    const partner = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_ops_purchases
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return { success: true, purchases: rows.map((r) => this.toCamel(r)) };
  }

  @Get('expenses')
  async expenses(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.service.ensureTables();
    const partner = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_ops_expenses
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return { success: true, expenses: rows.map((r) => this.toCamel(r)) };
  }

  @Get('payables')
  async payables(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.service.ensureTables();
    const partner = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_ops_accounts_payable
      WHERE partner_id = ${partner.id}
      ORDER BY due_date ASC NULLS LAST, created_at DESC
      LIMIT 200
    `;
    return { success: true, payables: rows.map((r) => this.toCamel(r)) };
  }

  @Get('inventory')
  async inventory(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.service.ensureTables();
    const partner = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT m.*, p.name AS product_name, p.ean AS product_ean
      FROM smart_ops_inventory_movements m
      LEFT JOIN smart_ops_products p ON p.id = m.product_id
      WHERE m.partner_id = ${partner.id}
      ORDER BY m.created_at DESC
      LIMIT 200
    `;
    return { success: true, movements: rows.map((r) => this.toCamel(r)) };
  }

  @Get('events')
  async events(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    await this.service.ensureTables();
    const partner = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_ops_events
      WHERE partner_id = ${partner.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return { success: true, events: rows.map((r) => this.toCamel(r)) };
  }

  private async partner(slug: string) {
    return prisma.partner.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
        type: 'FINTECH' as any,
        config: {},
        commissionRate: 0,
        tier: 'STARTER' as any
      } as any
    });
  }

  private toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return out;
  }
}
