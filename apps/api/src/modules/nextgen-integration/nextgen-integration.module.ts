import { Module } from '@nestjs/common';
import { NextGenIntegrationService } from './nextgen-integration.service';
import { NextGenIntegrationController } from './nextgen-integration.controller';

@Module({
  providers: [NextGenIntegrationService],
  controllers: [NextGenIntegrationController],
  exports: [NextGenIntegrationService]
})
export class NextGenIntegrationModule {}
