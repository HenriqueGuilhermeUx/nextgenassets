import { Module } from '@nestjs/common';
import { WooviPixAdapter } from './woovi-pix-adapter';
import { WooviWebhookController } from './woovi-webhook.controller';

@Module({
  providers: [WooviPixAdapter],
  controllers: [WooviWebhookController],
  exports: [WooviPixAdapter]
})
export class WooviModule {}
