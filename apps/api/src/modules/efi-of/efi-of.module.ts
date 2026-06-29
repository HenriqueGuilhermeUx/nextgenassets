import { Module } from '@nestjs/common';
import { EfiOFService } from './efi-of.service';
import { EfiOFWebhookController } from './efi-of-webhook.controller';
import { EfiOFWebhookReceiverController } from './efi-of-webhook-receiver.controller';
import { EfiWebhookPublicController } from './efi-webhook-public.controller';
import { EfiOFDebugController } from './efi-of-debug.controller';

@Module({
  providers: [EfiOFService],
  controllers: [
    EfiOFWebhookController,
    EfiOFWebhookReceiverController,
    EfiWebhookPublicController,
    EfiOFDebugController
  ],
  exports: [EfiOFService]
})
export class EfiOFModule {}
