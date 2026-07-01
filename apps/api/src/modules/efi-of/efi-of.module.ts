import { Module } from '@nestjs/common';
import { EfiOFService } from './efi-of.service';
import { EfiOFWebhookController } from './efi-of-webhook.controller';
import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';
import { EfiWebhookPublicController } from './efi-webhook-public.controller';
import { EfiOFDebugController } from './efi-of-debug.controller';
import { EfiOFAdminController } from './efi-of-admin.controller';
import { SmartBillingController } from '../smart-billing/smart-billing.controller';
import { SmartBillingSettlementsController } from '../smart-billing/smart-billing-settlements.controller';
import { EfiPixSplitController } from '../smart-billing/efi-pix-split.controller';
import { EfiPixSplitPayloadController } from '../smart-billing/efi-pix-split-payload.controller';
import { ManualSettlementController } from '../smart-billing/manual-settlement.controller';
import { PaymentRouterController } from '../smart-billing/payment-router.controller';
import { SmartBillingNotificationsController } from '../smart-billing/smart-billing-notifications.controller';

@Module({
  providers: [EfiOFService],
  controllers: [
    EfiOFWebhookController,
    EfiOFWebhookReceiverController,
    EfiWebhookPublicController,
    EfiOFDebugController,
    EfiOFAdminController,
    SmartBillingController,
    SmartBillingSettlementsController,
    EfiPixSplitController,
    EfiPixSplitPayloadController,
    ManualSettlementController,
    PaymentRouterController,
    SmartBillingNotificationsController
  ],
  exports: [EfiOFService]
})
export class EfiOFModule {}
