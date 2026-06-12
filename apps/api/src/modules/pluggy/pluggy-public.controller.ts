import { Controller, Post, Body, Logger, All, Req } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller()
export class PluggyPublicController {
  private readonly logger = new Logger(PluggyPublicController.name);

  @Post('v1/webhooks/pluggy-public')
  async handle(@Body() body: any, @Req() req: any) {
    this.logger.log(`Pluggy webhook received: ${JSON.stringify(body).substring(0, 200)}`);
    try {
      const eventType = body.event || body.type || '';
      const item = body.data || body.item || body;

      if (eventType.startsWith('item/') || eventType.startsWith('item.')) {
        if (eventType.includes('deleted')) {
          await prisma.consent.updateMany({
            where: { id: `pluggy-${item.id}` },
            data: { status: 'REVOKED', updatedAt: new Date() } as any
          });
        } else {
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
            }
          }
        }
      }
      return { received: true, event: eventType };
    } catch (err: any) {
      this.logger.error(`Erro: ${err.message}`);
      return { received: true, error: err.message };
    }
  }
}
