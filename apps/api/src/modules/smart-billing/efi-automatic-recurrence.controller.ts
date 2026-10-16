import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EfiOperationsGuard } from '../efi-of/efi-operations.guard';
import { EfiAutomaticRecurrenceService } from './efi-automatic-recurrence.service';

/**
 * Internal operator-only Efí Automatic Pix bridge.
 * DO NOT expose directly as a merchant-facing API. Never pass tokens in query.
 * Only the sandbox authorization endpoint contacts the provider; NO debits.
 */
@Controller('admin/efi-auto-recurrence')
@UseGuards(EfiOperationsGuard)
export class EfiAutomaticRecurrenceController {
  constructor(private readonly bridge: EfiAutomaticRecurrenceService) {}

  @Get('health')
  health() { return this.bridge.health(); }

  @Post('intents')
  createIntent(@Body() body: any) {
    return this.bridge.createIntent(body?.partnerSlug, body?.recurrenceId);
  }

  @Get('intents')
  list(@Query('partnerSlug') partnerSlug: string) {
    return this.bridge.list(partnerSlug);
  }

  @Post('intents/:id/start-sandbox')
  startSandbox(@Param('id') id: string, @Body() body: any) {
    return this.bridge.startSandboxAuthorization(body?.partnerSlug, id, body?.payer);
  }

  @Post('intents/:id/sync-sandbox')
  syncBankStatus(@Param('id') id: string, @Body() body: any) {
    return this.bridge.syncVerifiedBankAuthorization(body?.partnerSlug, id);
  }

  @Post('cycles/plan')
  planCycle(@Body() body: any) {
    return this.bridge.planNextCycle(body?.partnerSlug, body?.recurrenceId);
  }

  @Post('cycles/plan-due')
  planDueCycles(@Body() body: any) {
    return this.bridge.planDueCycles(body?.partnerSlug, body?.asOf, body?.limit);
  }

  @Post('cycles/preview')
  previewCycle(@Body() body: any) {
    return this.bridge.previewNextCycle(body?.partnerSlug, body?.recurrenceId);
  }

  @Get('cycles')
  cycles(@Query('partnerSlug') partnerSlug: string) {
    return this.bridge.listCycles(partnerSlug);
  }
}
