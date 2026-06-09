// ============================================
//  ROUND-UP AGGREGATOR — Consolidador diário (23:55)
// ============================================
// Roda uma vez por dia às 23:55
// Pra cada gatilho ROUND_UP_* ativo:
//   1. Busca transações do dia não processadas
//   2. Calcula o troco (1 dos 3 níveis)
//   3. Soma tudo
//   4. Se >= minAccumulated: dispara UM único PIX
//   5. Marca transações como processadas

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TriggerEngine } from '../modules/triggers/trigger-engine';
import { EfiPixAdapter } from '../modules/destinations/providers/efi-pix-adapter';

const prisma = new PrismaClient();

@Injectable()
export class RoundUpAggregatorWorker implements OnModuleInit {
  private readonly logger = new Logger(RoundUpAggregatorWorker.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private config: ConfigService,
    private triggerEngine: TriggerEngine,
    private efiPix: EfiPixAdapter
  ) {}

  onModuleInit() {
    this.start();
  }

  start() {
    if (this.intervalHandle) return;
    this.logger.log('🪙 Round-up aggregator started (DEMO: a cada 5 min, PROD: 23:55)');

    // DEMO MODE: roda a cada 5 minutos pra testar
    // Em prod: usar node-cron com "55 23 * * *"
    const isDemo = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true';
    const intervalMs = isDemo ? 5 * 60 * 1000 : 60 * 60 * 1000;

    this.logger.log(`📅 Interval: ${isDemo ? '5min (DEMO)' : '1h (PROD, processa 23:55-00:00)'}`);

    this.intervalHandle = setInterval(() => {
      this.aggregate(isDemo);
    }, intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async aggregate(isDemo = false) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // PROD: roda entre 23:55 e 00:00 (janela de 5 min)
    // DEMO: roda sempre
    if (!isDemo && (hour !== 23 || minute < 55)) {
      return;
    }

    this.logger.log(`🪙 Consolidador de Round-up iniciando (${isDemo ? 'DEMO' : 'PROD 23:55'})...`);

    try {
      // 1. Busca todos gatilhos ROUND_UP_* ativos
      const roundUpTriggers = await prisma.trigger.findMany({
        where: {
          status: 'ACTIVE',
          isPaused: false,
          code: { in: ['ROUND_UP_PIX', 'ROUND_UP_BASIC', 'ROUND_UP_BOOSTED', 'ROUND_UP_FIXED'] }
        }
      });

      this.logger.log(`Encontrados ${roundUpTriggers.length} gatilhos round-up ativos`);

      let totalProcessed = 0;
      let totalTriggered = 0;

      for (const trigger of roundUpTriggers) {
        try {
          // 2. Avalia (código reutilizado do trigger engine)
          const evalResult = await this.triggerEngine.evaluateTrigger(trigger.id);

          if (evalResult.shouldFire) {
            totalTriggered++;

            // 3. Cria execution consolidada
            const execution = await prisma.execution.create({
              data: {
                partnerId: trigger.partnerId,
                userId: trigger.userId,
                triggerId: trigger.id,
                status: 'INITIATING_PIX',
                amountBrl: evalResult.data?.total || 0,
                result: evalResult.data
              } as any
            });

            // 4. Dispara PIX via Efí (1 unico por dia)
            const pixResult = await this.efiPix.execute({
              type: 'BUY_PRODUCT',
              userId: trigger.userId,
              amountBrl: evalResult.data?.total || 0,
              productInfo: { description: 'Round-up consolidado diário' }
            } as any);

            this.logger.log(`💸 PIX disparado: ${trigger.id} → ${pixResult.status}`);

            // 5. Marca transações como processadas
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await prisma.transaction.updateMany({
              where: {
                userId: trigger.userId,
                isProcessed: false,
                transactedAt: { gte: today }
              },
              data: {
                isProcessed: true,
                processedAt: new Date(),
                triggerId: trigger.id
              }
            });

            // 6. Atualiza execution com resultado
            const externalId = pixResult.status === 'COMPLETED' ? (pixResult as any).externalId : null;
            await prisma.execution.update({
              where: { id: execution.id },
              data: {
                status: pixResult.status === 'FAILED' ? 'FAILED' : 'PENDING',
                externalId: externalId,
                result: pixResult
              } as any
            });

            totalProcessed++;
          }
        } catch (err: any) {
          this.logger.error(`❌ Erro no gatilho ${trigger.id}: ${err.message}`);
        }
      }

      this.logger.log(`✅ Consolidador concluído: ${totalProcessed} PIX disparados de ${roundUpTriggers.length} gatilhos`);
    } catch (err: any) {
      this.logger.error(`❌ Erro no consolidador: ${err.message}`);
    }
  }
}
