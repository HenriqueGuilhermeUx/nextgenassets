import { Module } from '@nestjs/common';
import { EfiOFService } from './efi-of.service';
import { EfiOFWebhookController } from './efi-of-webhook.controller';

@Module({
  providers: [EfiOFService],
  controllers: [EfiOFWebhookController],
  exports: [EfiOFService]
})
export class EfiOFModule {}
