// ============================================
//  CONSENTS ADMIN — trigger manual do round-up aggregator
//  Util pra teste: nao precisa esperar 5 min
// ============================================

import { Controller, Post, Logger } from '@nestjs/common';
import { RoundUpAggregatorWorker } from '../../workers/round-up-aggregator.worker';

@Controller('admin/aggregator')
export class AggregatorAdminController {
  private readonly logger = new Logger(AggregatorAdminController.name);

  constructor(private aggregator: RoundUpAggregatorWorker) {}

  // POST /v1/admin/aggregator/run-now
  // Forca o consolidador de round-up a rodar IMEDIATO
  @Post('run-now')
  async runNow() {
    this.logger.log('🔥 Forcando execucao manual do consolidador...');
    // O aggregator ja expoe o metodo aggregate() publico
    await (this.aggregator as any).aggregate(true);
    return {
      success: true,
      message: 'Consolidador executado! Verifica logs e Supabase.'
    };
  }
}
