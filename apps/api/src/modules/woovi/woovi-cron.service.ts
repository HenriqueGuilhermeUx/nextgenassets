// ============================================
//  WOOVI AUTO-WITHDRAW CRON
//  Roda a cada 1h
//  Saca saldos > R$ 1,00 de todas as subcontas
//  Loga no AuditLog
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('WooviAutoWithdraw');

@Injectable()
export class WooviCronService {
  
  /**
   * A cada 1h, saca todos os saldos > R$ 1,00
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoWithdrawAll() {
    try {
      const appId = process.env.WOOVI_APP_ID;
      const apiUrl = process.env.WOOVI_API_URL || 'https://api.woovi.com';
      const minCents = parseInt(process.env.AUTO_WITHDRAW_MIN_CENTS || '100'); // R$ 1,00 default

      if (!appId) {
        logger.warn('WOOVI_APP_ID nao configurado - skip auto-withdraw');
        return;
      }

      logger.log(`🤖 Auto-withdraw iniciado (minCents=${minCents})`);

      // 1) Lista subcontas
      const subsRes = await fetch(`${apiUrl}/api/v1/subaccount`, {
        headers: { 'Authorization': appId }
      });
      if (!subsRes.ok) {
        logger.error(`Erro listando subcontas: ${subsRes.status}`);
        return;
      }
      const subs = (await subsRes.json()).subAccounts || [];
      logger.log(`📊 ${subs.length} subcontas encontradas`);

      let totalSacked = 0;
      let countSacked = 0;

      for (const sub of subs) {
        const balance = sub.balance || 0;
        if (balance < minCents) {
          logger.log(`⏭️  ${sub.name} (${sub.pixKey}): R$ ${(balance/100).toFixed(2)} - skip (abaixo do mínimo)`);
          continue;
        }

        try {
          // 2) Saca saldo da subconta pro pixKey dela mesma
          const wRes = await fetch(`${apiUrl}/api/v1/subaccount/${sub.pixKey}/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': appId },
            body: JSON.stringify({
              value: balance,
              correlationID: `cron-withdraw-${sub.pixKey}-${Date.now()}`
            })
          });
          const wData = await wRes.json();

          if (wRes.ok && wData.transaction) {
            totalSacked += balance;
            countSacked++;
            logger.log(`✅ ${sub.name} (${sub.pixKey}): R$ ${(balance/100).toFixed(2)} sacado! endToEndId=${wData.transaction.endToEndId}`);

            // 3) Loga no AuditLog
            await prisma.auditLog.create({
              data: {
                action: 'AUTO_WITHDRAW',
                resource: 'subaccount',
                resourceId: sub.pixKey,
                actor: 'cron:auto-withdraw',
                metadata: {
                  provider: 'woovi',
                  pixKey: sub.pixKey,
                  name: sub.name,
                  balanceCents: balance,
                  endToEndId: wData.transaction.endToEndId,
                  status: wData.transaction.status
                } as any
              } as any
            });
          } else {
            logger.error(`❌ ${sub.name}: erro ao sacar - ${JSON.stringify(wData)}`);
          }
        } catch (err: any) {
          logger.error(`❌ ${sub.name}: ${err.message}`);
        }
      }

      logger.log(`🤖 Auto-withdraw finished: ${countSacked}/${subs.length} sacados, total R$ ${(totalSacked/100).toFixed(2)}`);
    } catch (err: any) {
      logger.error(`Erro geral no auto-withdraw: ${err.message}`);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Cron debug: roda a cada 5min logando status (pra debug)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async debugLog() {
    if (process.env.AUTO_WITHDRAW_DEBUG !== 'true') return;
    logger.log(`🟢 Woovi cron alive - autoWithdrawAll roda a cada 1h`);
  }
}
