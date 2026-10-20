import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { EfiOperationsGuard } from './efi-operations.guard';
import { EfiProductionReadOnlyService } from './efi-production-read-only.service';

/**
 * Internal operator-only Efí real readback. The production bank is never
 * contacted by default, and no financial action route exists in this class.
 */
@Controller('admin/efi-production-read-only')
@UseGuards(EfiOperationsGuard)
export class EfiProductionReadOnlyController {
  constructor(private readonly service: EfiProductionReadOnlyService) {}

  @Get('preflight')
  preflight() { return this.service.preflight(); }

  @Post('lookup-adhesion')
  lookup(@Body() body: any) {
    return this.service.lookupAdhesion(body?.adhesionId, body?.createdOn);
  }

  @Post('preview-incoming')
  previewIncoming(@Body() body:any) { return this.service.previewIncoming(body || {}); }

  @Post('lookup-payment')
  lookupPayment(@Body() body: any) {
    return this.service.lookupPayment(body || {});
  }
}
