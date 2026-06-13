import { Module } from '@nestjs/common';
import { WooviPixAdapter } from './woovi-pix-adapter';
import { WooviWebhookController } from './woovi-webhook.controller';
import { WooviCronService } from './woovi-cron.service';

@Module({
  providers: [WooviPixAdapter, WooviCronService],
  controllers: [WooviWebhookController],
  exports: [WooviPixAdapter, WooviCronService]
})
export class WooviModule {}
