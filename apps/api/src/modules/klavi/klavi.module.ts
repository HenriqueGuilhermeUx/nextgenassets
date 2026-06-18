import { Module } from '@nestjs/common';
import { KlaviService } from './klavi.service';
import { KlaviWebhookController } from './klavi-webhook.controller';

@Module({
  providers: [KlaviService],
  controllers: [KlaviWebhookController],
  exports: [KlaviService]
})
export class KlaviModule {}
