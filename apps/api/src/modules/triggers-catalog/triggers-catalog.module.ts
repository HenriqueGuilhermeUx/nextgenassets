import { Module } from '@nestjs/common';
import { TriggersCatalogService } from './triggers-catalog.service';
import { TriggersCatalogController } from './triggers-catalog.controller';

@Module({
  providers: [TriggersCatalogService],
  controllers: [TriggersCatalogController],
  exports: [TriggersCatalogService]
})
export class TriggersCatalogModule {}
