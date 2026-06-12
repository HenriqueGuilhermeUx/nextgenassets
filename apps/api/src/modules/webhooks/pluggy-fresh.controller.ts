import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VERSION = 'FRESH-v2';

@Controller('v1/admin/webhooks')
export class PluggyFreshController {
  private readonly logger = new Logger(PluggyFreshController.name);

  @Post('pluggy-v2')
  async handle(@Body() body: any) {
    this.logger.log(`[${VERSION}] Pluggy webhook received: ${JSON.stringify(body).substring(0, 200)}`);
    try {
      const eventType = body.event || body.type || '';
      const item = body.data || body.item || body;

      if ((eventType.startsWith('item/') || eventType.startsWith('item.')) && !eventType.includes('deleted')) {
        const externalUserId = item.clientUserId || item.userId;
        if (externalUserId && item.id) {
          const user = await prisma.consumerUser.findFirst({ where: { externalUserId } });
          if (user) {
            await prisma.consent.upsert({
              where: { id: `pluggy-${item.id}` },
              update: { status: 'ACTIVE', updatedAt: new Date() } as any,
              create: {
                id: `pluggy-${item.id}`,
                userId: user.id,
                partnerId: user.partnerId,
                type: 'PLUGGY_OPEN_FINANCE',
                provider: 'pluggy',
                status: 'ACTIVE',
                scope: ['accounts.read', 'transactions.read', 'investments.read', 'pix.send'],
                accessToken: item.accessToken || '',
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                metadata: { pluggyItemId: item.id, connectorId: item.connectorId }
              } as any
            });
            this.logger.log(`✅ Consent saved for item ${item.id}`);
          }
        }
      }
      await prisma.$disconnect();
      return { received: true, version: VERSION, event: eventType };
    } catch (err: any) {
      this.logger.error(`Erro: ${err.message}`);
      await prisma.$disconnect();
      return { received: true, error: err.message };
    }
  }
}
