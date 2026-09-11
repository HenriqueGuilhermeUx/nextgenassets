import { Module } from '@nestjs/common';
import { SmartOperationsController } from './smart-operations.controller';
import { SmartOperationsReadController } from './smart-operations-read.controller';
import { SmartOperationsService } from './smart-operations.service';
import { MockAvDocumentProvider } from './providers/mock-av-document.provider';
import { MockProductLookupProvider } from './providers/mock-product-lookup.provider';

@Module({
  controllers: [SmartOperationsController, SmartOperationsReadController],
  providers: [SmartOperationsService, MockAvDocumentProvider, MockProductLookupProvider],
  exports: [SmartOperationsService]
})
export class SmartOperationsModule {}
