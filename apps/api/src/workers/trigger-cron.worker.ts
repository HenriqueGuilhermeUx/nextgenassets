// ============================================
//  TRIGGER CRON WORKER — Avalia gatilhos a cada 1 min
// ============================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TriggerEngine } from '../modules/triggers/trigger-engine';

const prisma = new PrismaClient();

@Injectable()
export class TriggerCronWorker implements OnModuleInit {
  private readonly logger = new Logger(TriggerCronWorker.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private triggerEngine: TriggerEngine) {}

  onModuleInit() {
    this.start();
  }

  start() {
    if (this.intervalHandle) return;

    this.logger.log('⏰ Trigger cron worker started (a cada 1 min)');

    // Roda a cada 60 segundos
    this.intervalHandle = setInterval(() => {
      this.evaluateAll();
    }, 60 * 1000);

    // Primeira execução após 5s
    setTimeout(() => this.evaluateAll(), 5000);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.logger.log('⏰ Trigger cron worker stopped');
    }
  }

  async evaluateAll() {
    if (this.isRunning) {
      this.logger.warn('⏭️ Avaliação anterior ainda em andamento, pulando');
      return;
    }
    this.isRunning = true;

    try {
      const triggers = await prisma.trigger.findMany({
        where: {
          status: 'ACTIVE',
          isPaused: false
        },
        take: 200
      });

      this.logger.log(`🔍 Avaliando ${triggers.length} gatilhos ativos`);

      let evaluated = 0;
      let fired = 0;
      for (const trigger of triggers) {
        try {
          const result = await this.triggerEngine.evaluateTrigger(trigger.id);
          evaluated++;

          if (result.shouldFire) {
            this.logger.log(`🎯 Gatilho ${trigger.id} DISPAROU: ${result.reason}`);
            // Aqui chamaria a execução (execute) — por enquanto só logamos
            fired++;
          }
        } catch (err: any) {
          this.logger.error(`❌ Erro avaliando ${trigger.id}: ${err.message}`);
        }
      }

      this.logger.log(`✅ Avaliação concluída: ${evaluated} gatilhos, ${fired} dispararam`);
    } catch (err: any) {
      this.logger.error(`❌ Erro no cron: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
