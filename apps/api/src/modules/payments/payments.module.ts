import { Module } from '@nestjs/common';
import { StripeConnectAdapter } from './stripe-connect.adapter';
import { PaymentsController } from './payments.controller';

@Module({
  providers:[StripeConnectAdapter],
  controllers:[PaymentsController],
  exports:[StripeConnectAdapter]
})
export class PaymentsModule {}
