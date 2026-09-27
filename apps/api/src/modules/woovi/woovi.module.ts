import { Module } from '@nestjs/common';
import { WooviPixAdapter } from './woovi-pix-adapter';
import { WooviWebhookController } from './woovi-webhook.controller';
import { NexOfficeChargeController } from './nexoffice-charge.controller';
import { NexOfficeReceivingAccountController } from './nexoffice-receiving-account.controller';

@Module({
  providers: [WooviPixAdapter],
  controllers: [WooviWebhookController, NexOfficeChargeController, NexOfficeReceivingAccountController],
  exports: [WooviPixAdapter]
})
export class WooviModule {}
