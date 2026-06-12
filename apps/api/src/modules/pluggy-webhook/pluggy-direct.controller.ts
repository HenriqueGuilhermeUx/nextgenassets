import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('PluggyDirect');
const prisma = new PrismaClient();

@Controller('v1')
export class PluggyDirectController {

  @Get('pluggy-ping')
  async ping() {
    try {
      const r = await prisma.$queryRawUnsafe('SELECT 1 as ok, NOW() as ts');
      return { ok: true, result: r, version: 'direct' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }

  @Post('pluggy-handshake')
  async handle(@Body() body: any) {
    logger.log(`Pluggy handshake: ${JSON.stringify(body).substring(0, 200)}`);
    try {
      const eventType = body.event || body.type || '';
      const item = body.data || body.item || body;

      if (!item.id) {
        return { received: true, event: eventType };
      }

      const externalUserId = item.clientUserId || item.userId || '';
      const scopesArr = '{accounts.read,transactions.read,investments.read,pix.send}';
      const metadata = JSON.stringify({ pluggyItemId: item.id, connectorId: item.connectorId });
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      // INSERT direto via raw SQL com cast pra enums
      // Bypassa o Prisma Client cache
      const query = `
        INSERT INTO "Consent" (id, "userId", "partnerId", provider, "providerUserId", "accessToken", scopes, status, "expiresAt", metadata, "createdAt", "updatedAt")
        SELECT $1, u.id, u."partnerId", $2, $3, $4, $5::text[], $6::"ConsentStatus", $7, $8::jsonb, NOW(), NOW()
        FROM "ConsumerUser" u WHERE u."externalUserId" = $9 LIMIT 1
        ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'::"ConsentStatus", "updatedAt" = NOW()
        RETURNING id
      `;
      const result: any = await prisma.$queryRawUnsafe(query, [
        `pluggy-${item.id}`,
        'pluggy',
        externalUserId,
        item.accessToken || '',
        scopesArr,
        'ACTIVE',
        expiresAt,
        metadata,
        externalUserId
      ]);
      logger.log(`✅ Consent saved via raw SQL: pluggy-${item.id} → ${result[0]?.id}`);

      return { received: true, event: eventType, itemId: item.id, consentId: result[0]?.id, version: 'direct' };
    } catch (err: any) {
      logger.error(`Erro: ${err.message}`);
      return { received: true, error: err.message };
    } finally {
      await prisma.$disconnect();
    }
  }
}
