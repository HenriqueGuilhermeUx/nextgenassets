// ============================================
//  PLUGGY WEBHOOK CONTROLLER
// ============================================
// Endpoint publico POST /v1/webhooks/pluggy
// Valida assinatura HMAC SHA256 do header x-pluggy-signature
// Persiste eventos importantes (item, transactions, payments)
// ============================================

import { Controller, Post, Body, Headers, Logger, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PLUGGY_WEBHOOK_SECRET = process.env.PLUGGY_WEBHOOK_SECRET || '';

@Controller('v1/webhooks/pluggy')
export class PluggyWebhookController {
  private readonly logger = new Logger(PluggyWebhookController.name);

  @Post()
  async handle(@Body() body: any, @Headers() headers: any) {
    const signature = headers['x-pluggy-signature'] || headers['X-Pluggy-Signature'];
    if (PLUGGY_WEBHOOK_SECRET && signature) {
      if (!this.validateSignature(JSON.stringify(body), signature)) {
        this.logger.warn('Assinatura Pluggy invalida');
        throw new BadRequestException('Invalid signature');
      }
    }

    const eventType = body.event || body.type || 'unknown';
    this.logger.log(`Pluggy webhook: ${eventType}`);

    try {
      if (eventType.startsWith('item/') || eventType.startsWith('item.')) {
        await this.handleItem(body);
      } else if (eventType.startsWith('transactions/') || eventType.startsWith('transactions.')) {
        await this.handleTransactions(body);
      } else if (eventType.startsWith('payment/') || eventType.startsWith('payment.')) {
        await this.handlePayment(body);
      } else if (eventType.startsWith('investment/') || eventType.startsWith('investment.')) {
        await this.handleInvestment(body);
      }
      return { received: true, event: eventType };
    } catch (err: any) {
      this.logger.error(`Erro processando ${eventType}: ${err.message}`);
      return { received: true, error: err.message };
    }
  }

  private validateSignature(payload: string, signature: string): boolean {
    try {
      const expected = createHmac('sha256', PLUGGY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length) return false;
      return timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  private async handleItem(body: any) {
    const item = body.data || body.item || body;
    const eventType = body.event;
    this.logger.log(`  Item ${eventType}: id=${item.id} connector=${item.connector?.name || item.connectorId}`);

    if (eventType === 'item/deleted' || eventType === 'item.deleted') {
      await prisma.consent.updateMany({
        where: { id: `pluggy-${item.id}` },
        data: { status: 'REVOKED', updatedAt: new Date() } as any
      });
      return;
    }

    const externalUserId = item.clientUserId || item.userId;
    if (externalUserId && item.id) {
      const user = await prisma.consumerUser.findFirst({
        where: { externalUserId }
      });
      if (user) {
        await prisma.consent.upsert({
          where: { id: `pluggy-${item.id}` },
          update: {
            status: eventType === 'item/error' ? 'ERROR' : 'ACTIVE',
            updatedAt: new Date()
          } as any,
          create: {
            id: `pluggy-${item.id}`,
            userId: user.id,
            partnerId: user.partnerId,
            type: 'PLUGGY_OPEN_FINANCE',
            status: eventType === 'item/error' ? 'ERROR' : 'ACTIVE',
            scope: 'ACCOUNTS,TRANSACTIONS,INVESTMENTS,PAYMENTS',
            consentToken: item.accessToken || '',
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            metadata: {
              pluggyItemId: item.id,
              connectorId: item.connectorId,
              institutionName: item.connector?.name,
              institutionUrl: item.url
            }
          } as any
        });
      }
    }
  }

  private async handleTransactions(body: any) {
    const transactions = body.data?.transactions || body.transactions || [];
    this.logger.log(`  ${transactions.length} transacoes recebidas`);

    for (const tx of transactions.slice(0, 50)) {
      const externalUserId = tx.clientUserId || tx.userId;
      if (!externalUserId) continue;
      const user = await prisma.consumerUser.findFirst({
        where: { externalUserId }
      });
      if (!user) continue;

      const amountBrl = Math.abs(tx.amount || 0);
      const roundUp = Math.ceil(amountBrl) - amountBrl;

      await prisma.transaction.upsert({
        where: { id: `pluggy-${tx.id}` },
        update: {},
        create: {
          id: `pluggy-${tx.id}`,
          userId: user.id,
          partnerId: user.partnerId,
          amountBrl,
          description: tx.description || tx.rawDesc || '',
          type: tx.type || 'DEBIT',
          date: new Date(tx.date || tx.createdAt),
          roundUpBrl: roundUp > 0 && tx.type === 'DEBIT' ? roundUp : 0,
          metadata: {
            pluggyItemId: tx.accountId,
            accountType: tx.account?.type,
            accountMask: tx.account?.maskedNumber,
            paymentMethod: tx.paymentMethod,
            category: tx.category
          }
        } as any
      });
    }
  }

  private async handlePayment(body: any) {
    const payment = body.data || body;
    this.logger.log(`  Payment ${body.event}: id=${payment.id} status=${payment.status}`);

    if (body.event === 'payment/succeeded' || body.event === 'payment.succeeded') {
      await prisma.consent.updateMany({
        where: { id: `pluggy-${payment.itemId}` },
        data: { updatedAt: new Date() } as any
      });
    }
  }

  private async handleInvestment(body: any) {
    const investment = body.data || body;
    this.logger.log(`  Investment ${body.event}: id=${investment.id} type=${investment.type}`);
    // Persistir portfolio do user aqui no futuro
  }
}
