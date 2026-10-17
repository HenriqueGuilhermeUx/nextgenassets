import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EfiOperationsGuard } from '../efi-of/efi-operations.guard';
import { EfiCentralizedD1PayoutService } from './efi-centralized-d1-payout.service';

/**
 * Internal-only D+1 policy and payout scheduling.
 * No raw bank evidence submitted by clients; a verified receipt must already
 * exist in the private database from the bank reconciliation integration.
 */
@Controller('admin/efi-central-d1')
@UseGuards(EfiOperationsGuard)
export class EfiCentralizedD1PayoutController {
  constructor(private readonly payouts: EfiCentralizedD1PayoutService) {}

  @Get('policy')
  policy() { return this.payouts.policy(); }

  @Post('schedule-verified')
  scheduleVerified(@Body() body: any) {
    return this.payouts.scheduleVerifiedReceipt(body?.partnerSlug,body?.receiptId);
  }

  @Get('payouts')
  payoutsList(@Query('partnerSlug') partnerSlug: string) {
    return this.payouts.list(partnerSlug);
  }
}
