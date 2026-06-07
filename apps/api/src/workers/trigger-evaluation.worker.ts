// Worker que processa a fila de avaliação
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TriggerEngine } from '../modules/triggers/trigger-engine';

@Processor('trigger-evaluation')
export class TriggerEvaluationWorker {
  private readonly logger = new Logger(TriggerEvaluationWorker.name);

  constructor(private triggerEngine: TriggerEngine) {}

  @Process('evaluate')
  async handleEvaluate(job: Job) {
    const { triggerId } = job.data;
    this.logger.log(`[Worker] Evaluating trigger ${triggerId}`);

    const result = await this.triggerEngine.evaluateTrigger(triggerId);
    this.logger.log(`[Worker] Result: ${result.shouldFire ? 'FIRE' : 'SKIP'} — ${result.reason}`);

    if (result.shouldFire) {
      // Enfileira execução
      await this.triggerEngine.executeTrigger(triggerId, result.data);
    }
    return result;
  }
}
