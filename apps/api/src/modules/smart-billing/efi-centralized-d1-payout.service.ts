import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { scheduleCentralizedD1, BankBusinessCalendar, ConfirmedCentralReceipt } from './centralized-d1-policy';

const prisma = new PrismaClient();

/**
 * Protected internal payout PLANNER for bank-verified incoming Efí Pix.
 * No bank transfer, no merchant money movement and no status 'BANK_CONFIRMED'
 * without independently verified outgoing bank evidence.
 */
@Injectable()
export class EfiCentralizedD1PayoutService {
  private assertEnabled(): void {
    if (process.env.NEXTGEN_CENTRALIZED_D1_ENABLED !== 'true') {
      throw new ServiceUnavailableException('NEXTGEN_CENTRALIZED_D1_DISABLED');
    }
  }

  private bankCalendar(): BankBusinessCalendar & { version: string } {
    const source = process.env.NEXTGEN_BANK_CALENDAR_SOURCE;
    const coverageThrough = process.env.NEXTGEN_BANK_CALENDAR_VERIFIED_THROUGH;
    const version = process.env.NEXTGEN_BANK_CALENDAR_VERSION;
    const holidays = process.env.NEXTGEN_BANK_HOLIDAY_DATES;
    if ((source !== 'BANK' && source !== 'VERIFIED_BANK_CALENDAR') ||
        !coverageThrough || !version || !holidays ||
        /EXAMPLE|SUBSTITUA|TODO|PLACEHOLDER/i.test([coverageThrough,version,holidays].join('|'))) {
      throw new ServiceUnavailableException('VERIFIED_BANK_CALENDAR_REQUIRED');
    }
    return {
      source, coverageThrough, version,
      holidayDates: holidays.split(',').map(s => s.trim()).filter(Boolean)
    };
  }

  private expectedReceivingFingerprint(): string {
    const fields = [
      process.env.EFI_OF_FAVORECIDO_DOCUMENTO,
      process.env.EFI_OF_FAVORECIDO_CODIGO_BANCO,
      process.env.EFI_OF_FAVORECIDO_AGENCIA,
      process.env.EFI_OF_FAVORECIDO_CONTA
    ];
    if (fields.some(x => !x)) throw new ServiceUnavailableException('EFI_RECEIVING_ACCOUNT_NOT_CONFIGURED');
    return createHash('sha256').update(fields.join('|')).digest('hex');
  }

  async policy() {
    return {
      success: true,
      product: 'NEXTGEN_PIX_AUTOMATICO_CENTRALIZED',
      policy: 'D+1 dia util bancario apos Pix recebido e conciliado',
      enabled: process.env.NEXTGEN_CENTRALIZED_D1_ENABLED === 'true',
      payoutExecutionEnabled: false,
      currentImplementation: 'stage payout schedule only, no bank transfers'
    };
  }

  private async partnerId(partnerSlug: string): Promise<string> {
    if (!partnerSlug || partnerSlug.length > 100) throw new BadRequestException('PARTNER_REQUIRED');
    const p = await prisma.partner.findUnique({where:{slug:partnerSlug}});
    if (!p) throw new NotFoundException('PARTNER_NOT_FOUND');
    return p.id;
  }

  async scheduleVerifiedReceipt(partnerSlug: string, receiptId: string) {
    this.assertEnabled();
    if (!receiptId || receiptId.length > 128) throw new BadRequestException('INVALID_RECEIPT_ID');
    const partnerId = await this.partnerId(partnerSlug);
    const calendar = this.bankCalendar();
    const expectedFingerprint = this.expectedReceivingFingerprint();

    // A receipt must have been imported and verified by the independent
    // incoming-bank reconciliation adapter, never submitted by the merchant UI.
    return prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<any[]>`
        SELECT rc.*
        FROM ng_efi_central_receipts rc
        JOIN ng_efi_auto_cycles c
          ON c.id=rc.cycle_id AND c.partner_id=rc.partner_id
        WHERE rc.id=${receiptId} AND rc.partner_id=${partnerId}
          AND c.amount_cents=rc.gross_amount_cents
        FOR UPDATE OF rc
      `;
      const r = rows[0];
      if (!r) throw new NotFoundException('BANK_RECEIPT_NOT_FOUND_OR_NOT_MATCHED');
      if (r.bank_account_fingerprint !== expectedFingerprint) {
        throw new ConflictException('BANK_RECEIVING_ACCOUNT_MISMATCH');
      }
      if (!r.bank_verified_at || !r.bank_evidence_ref ||
          r.reconciliation_status !== 'RECONCILED' ||
          !r.reconciled_reference || !r.reconciliation_verified_at) {
        throw new ConflictException('BANK_RECEIPT_NOT_VERIFIED_AND_RECONCILED');
      }
      // A Pix GET and an 'aceito' OF payment are not the settled fee ledger.
      // RECONCILED requires a completed independent statement and an auditable
      // compliance clearance, never an operator-supplied fee estimate.
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
            String(r.statement_report_id || '')) ||
          !/^[a-f0-9]{64}$/.test(String(r.statement_evidence_sha256 || '')) ||
          !r.statement_verified_at || !r.provider_fee_verified_at ||
          !r.account_ownership_verified_at || !r.refund_checked_at) {
        throw new ConflictException('BANK_STATEMENT_AND_FEES_NOT_VERIFIED');
      }
      if (!r.compliance_hold && (!r.compliance_cleared_at ||
          !/^[a-f0-9]{64}$/.test(String(r.compliance_evidence_sha256 || '')))) {
        throw new ConflictException('BANK_COMPLIANCE_CLEARANCE_UNVERIFIED');
      }
      const receipt: ConfirmedCentralReceipt = {
        partnerId, sourcePaymentId: r.incoming_e2e_id,
        grossAmountCents: Number(r.gross_amount_cents),
        providerFeesCents: Number(r.provider_fee_cents),
        retainedFeesCents: Number(r.retained_fee_cents),
        bankIncomingPixVerified: true,
        bankSettledAt: new Date(r.bank_settled_at).toISOString(),
        reconciledAt: new Date(r.reconciliation_verified_at).toISOString(),
        complianceHold: Boolean(r.compliance_hold)
      };
      const schedule = scheduleCentralizedD1(receipt,calendar);
      if (schedule.status !== 'ELIGIBLE_FOR_SCHEDULING' ||
          !schedule.scheduledBusinessDate || !schedule.baseBusinessDate ||
          !schedule.amountCents) {
        throw new ConflictException(schedule.status);
      }

      const id = 'd1p_' + randomUUID().replace(/-/g,'');
      const key = createHash('sha256').update(
        ['nextgen-efi-central-d1',partnerId,receiptId].join('|')
      ).digest('hex');
      const created = await tx.$queryRaw<any[]>`
        INSERT INTO ng_efi_central_payouts
          (id,partner_id,receipt_id,base_business_date,scheduled_business_date,
           calendar_source,calendar_version,amount_cents,idempotency_key,status)
        VALUES
          (${id},${partnerId},${receiptId},${schedule.baseBusinessDate}::date,
           ${schedule.scheduledBusinessDate}::date,${calendar.source},
           ${calendar.version},${schedule.amountCents}::bigint,${key},'SCHEDULED')
        ON CONFLICT (receipt_id) DO NOTHING
        RETURNING id
      `;
      if (!created[0]) {
        const previous = await tx.$queryRaw<any[]>`
          SELECT id,status,scheduled_business_date,amount_cents
          FROM ng_efi_central_payouts
          WHERE partner_id=${partnerId} AND receipt_id=${receiptId}
          LIMIT 1
        `;
        return {
          success: true, existing: true,
          payoutId: previous[0]?.id,
          status: previous[0]?.status,
          scheduledDate: previous[0]?.scheduled_business_date,
          amountCents: Number(previous[0]?.amount_cents || 0),
          bankTransferPerformed: false
        };
      }
      await tx.$executeRaw`
        INSERT INTO ng_efi_central_payout_events
          (id,payout_id,event_type,metadata_redacted)
        VALUES (${'d1e_'+randomUUID().replace(/-/g,'')},${id},
                'PAYOUT_D1_SCHEDULED',${JSON.stringify({
                  policy:'D+1_BANK_BUSINESS',
                  calendarVersion:calendar.version
                })}::jsonb)
      `;
      return {
        success:true, existing:false,payoutId:id,status:'SCHEDULED',
        scheduledDate:schedule.scheduledBusinessDate,
        amountCents:schedule.amountCents,bankTransferPerformed:false
      };
    });
  }

  async list(partnerSlug: string) {
    this.assertEnabled();
    const partnerId = await this.partnerId(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id,status,amount_cents,scheduled_business_date,
             bank_verified_at,created_at
      FROM ng_efi_central_payouts
      WHERE partner_id=${partnerId}
      ORDER BY created_at DESC LIMIT 150
    `;
    return {
      success:true, count:rows.length,
      payouts:rows.map(r=>({
        id:r.id,status:r.status,
        amountCents:Number(r.amount_cents),
        scheduledDate:r.scheduled_business_date,
        bankTransferConfirmed: r.status==='BANK_CONFIRMED' && Boolean(r.bank_verified_at)
      }))
    };
  }
}
