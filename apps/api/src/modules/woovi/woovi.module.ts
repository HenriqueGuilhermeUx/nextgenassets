import { Module } from '@nestjs/common';
import { WooviPixAdapter } from './woovi-pix-adapter';
import { WooviWebhookController } from './woovi-webhook.controller';
import { NexOfficeChargeController } from './nexoffice-charge.controller';
import { NexOfficeReceivingAccountController } from './nexoffice-receiving-account.controller';
import { NexOfficeSubaccountChargeController } from './nexoffice-subaccount-charge.controller';
import { NexOfficePayoutEngineController } from './nexoffice-payout-engine.controller';
import { NexOfficePayoutEngineService } from './nexoffice-payout-engine.service';

@Module({
  providers: [WooviPixAdapter, NexOfficePayoutEngineService],
  controllers: [WooviWebhookController, NexOfficeChargeController, NexOfficeReceivingAccountController, NexOfficeSubaccountChargeController, NexOfficePayoutEngineController],
  exports: [WooviPixAdapter, NexOfficePayoutEngineService]
})
export class WooviModule {}
