import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EfiOperationsGuard } from './efi-operations.guard';
import { EfiCentralReceiptImportService } from './efi-central-receipt-import.service';

/** Internal operator-only bank readback. No raw bank proof accepted from HTTP. */
@Controller('admin/efi-central-receipts')
@UseGuards(EfiOperationsGuard)
export class EfiCentralReceiptImportController {
  constructor(private readonly service:EfiCentralReceiptImportService) {}

  @Post('import-verified-cycle')
  importVerifiedCycle(@Body() body:any) {
    return this.service.importVerifiedCycle(body?.partnerSlug,body?.cycleId);
  }
}
