// Executions controller
import { Controller, Get, Query, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('executions')
export class ExecutionsController {
  @Get()
  async list(@Query() query: { partnerId?: string; userId?: string; triggerId?: string; status?: string; limit?: string }) {
    return prisma.execution.findMany({
      where: {
        partnerId: query.partnerId,
        userId: query.userId,
        triggerId: query.triggerId,
        status: query.status as any
      },
      include: {
        trigger: { select: { code: true, name: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '100')
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return prisma.execution.findUnique({
      where: { id },
      include: { trigger: true, user: true }
    });
  }

  @Get('stats/summary')
  async stats(@Query() query: { partnerId?: string }) {
    const [total, completed, failed, pending] = await Promise.all([
      prisma.execution.count({ where: { partnerId: query.partnerId } }),
      prisma.execution.count({ where: { partnerId: query.partnerId, status: 'COMPLETED' } }),
      prisma.execution.count({ where: { partnerId: query.partnerId, status: 'FAILED' } }),
      prisma.execution.count({ where: { partnerId: query.partnerId, status: { in: ['PENDING', 'EVALUATING', 'INITIATING_PIX', 'PIX_PENDING', 'EXECUTING_DESTINATION'] } } })
    ]);

    return { total, completed, failed, pending, successRate: total > 0 ? (completed / total) * 100 : 0 };
  }
}
