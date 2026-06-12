// ============================================
//  ORKEST API — App Module
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Destinations (mocks)
import { MockStockBroker } from './modules/destinations/mock-providers/mock-stock-broker';
import { MockFundDistributor } from './modules/destinations/mock-providers/mock-fund-distributor';
import { MockCryptoExchange } from './modules/destinations/mock-providers/mock-crypto-exchange';
import { MockBankTransfer } from './modules/destinations/mock-providers/mock-bank-transfer';
import { MockRetailer } from './modules/destinations/mock-providers/mock-retailer';
import { DestinationRegistry } from './modules/destinations/destination-registry';
import { ShopifyAdapter } from './modules/destinations/providers/shopify-adapter';
import { WooCommerceAdapter } from './modules/destinations/providers/woocommerce-adapter';
import { MercadoLivreAdapter } from './modules/destinations/providers/mercado-livre-adapter';
import { MagaluAdapter } from './modules/destinations/providers/magalu-adapter';
import { NubankOpenFinanceAdapter } from './modules/destinations/providers/nubank-openfinance-adapter';
import { VtexAdapter } from './modules/destinations/providers/vtex-adapter';
import { IFoodAdapter } from './modules/destinations/providers/ifood-adapter';
import { RappiAdapter } from './modules/destinations/providers/rappi-adapter';
import { EfiPixAdapter } from './modules/destinations/providers/efi-pix-adapter';

// Services
import { AiService } from './modules/ai/ai.service';
import { AiOrchestrator } from './modules/ai/ai-orchestrator.service';
import { AiOrchestratorController } from './modules/ai/ai-orchestrator.controller';
import { BillingController } from './modules/billing/billing.controller';
import { BillingService } from './modules/billing/billing.service';
import { CommissionService } from './modules/commissions/commission.service';
import { AiSuggestionsService } from './modules/ai/ai-suggestions.service';
import { AiSuggestionsController } from './modules/ai/ai-suggestions.controller';
import { MarketDataService } from './modules/market-data/market-data.service';
import { BankTransferService } from './modules/open-finance/bank-transfer.service';
import { TriggerEngine } from './modules/triggers/trigger-engine';

// Controllers
import { AppController } from './app.controller';
import { TriggersController } from './modules/triggers/triggers.controller';
import { AiController } from './modules/ai/ai.controller';
import { PartnersController } from './modules/partners/partners.controller';
import { UsersController } from './modules/users/users.controller';
import { ExecutionsController } from './modules/executions/executions.controller';
import { ReportsController } from './modules/reports/reports.controller';
import { CatalogController } from './modules/triggers/catalog.controller';
import { WebhooksController } from './modules/webhooks/webhooks.controller';
import { EfiWebhookRegistrar } from './modules/webhooks/efi-webhook-registrar.service';
import { WebhooksAdminController } from './modules/webhooks/webhooks-admin.controller';
import { WebhooksOutService } from './modules/webhooks/webhooks-out.worker';
import { RetailerController } from './modules/retailer/retailer.controller';
import { OffersController } from './modules/offers/offers.controller';
import { ConsentsController } from './modules/consents/consents.controller';
import { AggregatorAdminController } from './modules/consents/consents-trigger.controller';
import { NotificationsService } from './modules/notifications/notifications.service';
import { WhatsAppService } from './modules/notifications/whatsapp.service';

// Workers
import { TriggerEvaluationWorker } from './workers/trigger-evaluation.worker';
import { TriggerCronWorker } from './workers/trigger-cron.worker';
import { RoundUpAggregatorWorker } from './workers/round-up-aggregator.worker';
import { MarketWatcherWorker } from './workers/market-watcher.worker';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      redis: process.env.REDIS_URL || 'redis://localhost:6379'
    }),
    BullModule.registerQueue(
      { name: 'trigger-evaluation' },
      { name: 'trigger-execution' }
    ),
    ScheduleModule.forRoot()
  ],

  controllers: [
    AppController,
    TriggersController,
    AiController,
    AiOrchestratorController,
    PartnersController,
    UsersController,
    ExecutionsController,
    ReportsController,
    CatalogController,
    WebhooksController,
    WebhooksAdminController,
    RetailerController,
    OffersController,
    ConsentsController,
    AggregatorAdminController,
    AiSuggestionsController,
    BillingController
  ],
  providers: [
    // Mocks
    MockStockBroker,
    MockFundDistributor,
    MockCryptoExchange,
    MockBankTransfer,
    MockRetailer,
    DestinationRegistry,
    // Real adapters
    ShopifyAdapter,
    WooCommerceAdapter,
    MercadoLivreAdapter,
    MagaluAdapter,
    NubankOpenFinanceAdapter,
    VtexAdapter,
    IFoodAdapter,
    RappiAdapter,
    EfiPixAdapter,
    // Services
    AiService,
    AiOrchestrator,
    CommissionService,
    BillingService,
    EfiWebhookRegistrar,
    AiSuggestionsService,
    MarketDataService,
    BankTransferService,
    TriggerEngine,
    // Workers
    TriggerEvaluationWorker,
    TriggerCronWorker,
    RoundUpAggregatorWorker,
    MarketWatcherWorker,
    // Notifications
    NotificationsService,
    WhatsAppService,
    WebhooksOutService
  ]
})
export class AppModule {}
