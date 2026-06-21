import { Module } from '@nestjs/common';
import { EfiOFService } from './efi-of.service';
import { EfiOFWebhookController } from './efi-of-webhook.controller';
import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';

@Module({
  providers: [EfiOFService],
  controllers: [EfiOFWebhookController, EfiOFWebhookReceiverController],
  exports: [EfiOFService]
})
export class EfiOFModule {}
