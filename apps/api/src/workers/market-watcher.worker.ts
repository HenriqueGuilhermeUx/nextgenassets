// Market Watcher — observa mercado e dispara gatilhos
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { TriggerEngine } from '../modules/triggers/trigger-engine';

const prisma = new PrismaClient();

@Injectable()
export class MarketWatcherWorker {
  private readonly logger = new Logger(MarketWatcherWorker.name);

  constructor(private triggerEngine: TriggerEngine) {}

  // Roda a cada 1 minuto — avalia todos os gatilhos ativos
  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const activeTriggers = await prisma.trigger.findMany({
      where: { status: 'ACTIVE' },
      take: 100
    });
    this.logger.debug(`Market Watcher: ${activeTriggers.length} active triggers`);

    for (const trigger of activeTriggers) {
      await this.triggerEngine.scheduleEvaluation(trigger.id, Math.random() * 5000);
    }
  }
}
