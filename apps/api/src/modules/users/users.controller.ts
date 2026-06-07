// Users controller
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('users')
export class UsersController {
  @Get()
  async list(@Query() query: { partnerId?: string }) {
    return prisma.consumerUser.findMany({
      where: { partnerId: query.partnerId },
      include: { _count: { select: { triggers: true, executions: true } } },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return prisma.consumerUser.findUnique({
      where: { id },
      include: {
        triggers: { orderBy: { createdAt: 'desc' } },
        executions: { take: 50, orderBy: { createdAt: 'desc' } }
      }
    });
  }

  @Post()
  async create(@Body() body: { partnerId: string; externalUserId: string; email?: string; name?: string }) {
    return prisma.consumerUser.create({
      data: {
        partnerId: body.partnerId,
        externalUserId: body.externalUserId,
        email: body.email,
        name: body.name,
        consentStatus: 'PENDING',
        notifyChannels: ['PUSH', 'EMAIL']
      }
    });
  }

  // Simula ativação de consentimento Open Finance
  @Post(':id/consent/activate')
  async activateConsent(@Param('id') id: string) {
    return prisma.consumerUser.update({
      where: { id },
      data: {
        consentStatus: 'ACTIVE',
        bankName: 'Itaú',
        bankAccountMask: '0001-9 / 12345-6'
      }
    });
  }
}
