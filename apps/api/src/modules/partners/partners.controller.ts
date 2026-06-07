// Partners controller
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('partners')
export class PartnersController {
  @Get()
  async list() {
    return prisma.partner.findMany({
      include: { _count: { select: { users: true, triggers: true, executions: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        users: { take: 50 },
        triggers: { take: 50, orderBy: { createdAt: 'desc' } },
        executions: { take: 50, orderBy: { createdAt: 'desc' } }
      }
    });
  }

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return prisma.partner.findUnique({ where: { slug } });
  }

  @Post()
  async create(@Body() body: any) {
    return prisma.partner.create({ data: body });
  }
}
