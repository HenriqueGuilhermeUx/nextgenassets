import { Module } from '@nestjs/common';
import { WooviPixAdapter } from './woovi-pix-adapter';
import { WooviWebhookController } from './woovi-webhook.controller';
import { NexOfficeChargeController } from './nexoffice-charge.controller';

@Module({
  providers: [WooviPixAdapter],
  controllers: [WooviWebhookController, NexOfficeChargeController],
  exports: [WooviPixAdapter]
})
export class WooviModule {}
