import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { EfiOFService } from './efi-of.service';
import { EfiPixIncomingReadService } from './efi-pix-incoming-read.service';
import { assertEfiProductionReadOnly } from './efi-production-read-only.policy';
import { parseVerifiedIncomingPix, assertIncomingPixMatchesAutomaticPayment } from './efi-incoming-pix-proof';

const prisma = new PrismaClient();

type Cycle = {
  id:string;partner_id:string;recurrence_id:string;due_date:Date|string;
  state:string;amount_cents:bigint|number;payment_reference:string;
  provider_adhesion_id:string;authorization_status:string;
};

/** Imported evidence is QUARANTINED by default. A second reconciliation
 * (fees + receiving-account ledger + compliance) must verify it later.
 * No customer balance credit, payout scheduling or bank Pix OUT happens here.
 */
@Injectable()
export class EfiCentralReceiptImportService {
  constructor(private readonly of:EfiOFService,
              private readonly pix:EfiPixIncomingReadService) {}

  private assertEnabled():void {
    assertEfiProductionReadOnly();
    if(process.env.NEXTGEN_EFI_RECEIPT_IMPORT_ENABLED!=='true' ||
       process.env.NEXTGEN_EFI_RECEIPT_IMPORT_ENV!=='isolated-homolog' ||
       process.env.NEXTGEN_EFI_PIX_READ_ENABLED!=='true' ||
       process.env.NEXTGEN_DISABLE_BACKGROUND_WORKERS!=='true' ||
       process.env.NEXTGEN_CENTRALIZED_D1_ENABLED==='true' ||
       process.env.NEXTGEN_EFI_AUTOMATIC_ENABLED==='true')
      throw new ServiceUnavailableException('EFI_BANK_RECEIPT_IMPORT_DISABLED');
  }

  private receivingAccountHash():string {
    const fields=[
      process.env.EFI_OF_FAVORECIDO_DOCUMENTO,
      process.env.EFI_OF_FAVORECIDO_CODIGO_BANCO,
      process.env.EFI_OF_FAVORECIDO_AGENCIA,
      process.env.EFI_OF_FAVORECIDO_CONTA
    ];
    if(fields.some(x=>!x || x.trim().length<2 ||
      /SUBSTITUA|EXAMPLE|PLACEHOLDER|XXXXX/i.test(x)))
      throw new ServiceUnavailableException('EFI_RECEIVING_ACCOUNT_NOT_VERIFIED');
    return createHash('sha256').update(fields.join('|')).digest('hex');
  }

  private receivingKey():string {
    const key=process.env.EFI_PIX_RECEIVING_KEY;
    if(!key || key.length>130 || /SUBSTITUA|EXAMPLE|PLACEHOLDER/i.test(key))
      throw new ServiceUnavailableException('EFI_RECEIVING_PIX_KEY_NOT_VERIFIED');
    return key;
  }

  private isoDate(date:Date|string):string {
    const parsed=date instanceof Date?date:new Date(date);
    if(!Number.isFinite(parsed.getTime()))throw new ConflictException('EFI_INVALID_CYCLE_DATE');
    return parsed.toISOString().slice(0,10);
  }

  private validateCycle(row:Cycle|undefined):Cycle {
    if(!row || row.state!=='SCHEDULED' || row.authorization_status!=='AUTHORIZED' ||
       !row.provider_adhesion_id || !/^urn:efi:[A-Za-z0-9-]{8,170}$/.test(row.provider_adhesion_id) ||
       !/^[A-Za-z0-9]{32}$/.test(row.payment_reference || '') ||
       !Number.isSafeInteger(Number(row.amount_cents)) || Number(row.amount_cents)<=0)
      throw new ConflictException('EFI_CYCLE_NOT_READY_FOR_RECEIPT_IMPORT');
    return row;
  }

  private async cycleQuery(db:any,partnerId:string,cycleId:string,lock:boolean):Promise<Cycle[]> {
    if(lock) {
      return db.$queryRaw`
        SELECT c.id,c.partner_id,c.recurrence_id,c.due_date,c.state,
               c.amount_cents,c.payment_reference,
               a.provider_adhesion_id,a.status AS authorization_status
        FROM ng_efi_auto_cycles c
        JOIN ng_efi_auto_authorizations a
          ON a.id=c.authorization_id AND a.partner_id=c.partner_id
         AND a.recurrence_id=c.recurrence_id
        WHERE c.id=${cycleId} AND c.partner_id=${partnerId}
          AND a.verified_at IS NOT NULL
        FOR UPDATE OF c
      `;
    }
    return db.$queryRaw`
      SELECT c.id,c.partner_id,c.recurrence_id,c.due_date,c.state,
             c.amount_cents,c.payment_reference,
             a.provider_adhesion_id,a.status AS authorization_status
      FROM ng_efi_auto_cycles c
      JOIN ng_efi_auto_authorizations a
        ON a.id=c.authorization_id AND a.partner_id=c.partner_id
       AND a.recurrence_id=c.recurrence_id
      WHERE c.id=${cycleId} AND c.partner_id=${partnerId}
        AND a.verified_at IS NOT NULL
      LIMIT 1
    `;
  }

  async importVerifiedCycle(partnerSlug:unknown,cycleId:unknown) {
    this.assertEnabled();
    if(typeof partnerSlug!=='string' || !/^[a-z0-9][a-z0-9_-]{1,99}$/.test(partnerSlug) ||
       typeof cycleId!=='string' || !/^[A-Za-z0-9_-]{4,128}$/.test(cycleId))
      throw new BadRequestException('EFI_RECEIPT_IMPORT_REFERENCE_INVALID');

    const receivingKey=this.receivingKey();
    const receivingAccountHash=this.receivingAccountHash();
    const partner=await prisma.partner.findUnique({where:{slug:partnerSlug}});
    if(!partner)throw new NotFoundException('EFI_RECEIPT_IMPORT_PARTNER_NOT_FOUND');
    const cycle=this.validateCycle((await this.cycleQuery(prisma,partner.id,cycleId,false))[0]);
    const expectedCents=Number(cycle.amount_cents);
    const dueDate=this.isoDate(cycle.due_date);

    // Network calls are strictly out of transaction, and can ONLY read bank state.
    const [ofStatus,pixPayload]=await Promise.all([
      this.of.getAutomaticProductionPaymentStatus({
        adhesionId:cycle.provider_adhesion_id,endToEndId:cycle.payment_reference,
        requestedDate:dueDate,expectedAmountCents:expectedCents
      }),
      this.pix.getReceivedPix(cycle.payment_reference)
    ]);
    const bank=parseVerifiedIncomingPix(pixPayload,{
      endToEndId:cycle.payment_reference,amountCents:expectedCents,
      receivingPixKey:receivingKey
    });
    assertIncomingPixMatchesAutomaticPayment(ofStatus,bank,{
      endToEndId:cycle.payment_reference,amountCents:expectedCents
    });

    return prisma.$transaction(async tx=>{
      const locked=this.validateCycle((await this.cycleQuery(tx,partner.id,cycleId,true))[0]);
      if(locked.recurrence_id!==cycle.recurrence_id ||
         locked.payment_reference!==bank.endToEndId ||
         locked.provider_adhesion_id!==cycle.provider_adhesion_id ||
         Number(locked.amount_cents)!==expectedCents ||
         this.isoDate(locked.due_date)!==dueDate)
        throw new ConflictException('EFI_CYCLE_CHANGED_DURING_RECONCILIATION');

      // Double-write protection: UNIQUE(incoming_e2e_id) and
      // UNIQUE(partner_id,cycle_id), plus the cycle row lock, across workers.
      const already=await tx.$queryRaw<any[]>`
        SELECT id,partner_id,cycle_id,incoming_e2e_id,bank_evidence_ref,
               gross_amount_cents,reconciliation_status,compliance_hold
        FROM ng_efi_central_receipts
        WHERE (partner_id=${partner.id} AND cycle_id=${cycleId})
           OR incoming_e2e_id=${bank.endToEndId}
        LIMIT 2
      `;
      if(already.length) {
        const same=already.length===1 &&
          already[0].partner_id===partner.id &&
          already[0].cycle_id===cycleId &&
          already[0].incoming_e2e_id===bank.endToEndId &&
          already[0].bank_evidence_ref===bank.bankEvidenceRef &&
          Number(already[0].gross_amount_cents)===expectedCents;
        if(!same)throw new ConflictException('EFI_INCOMING_RECEIPT_CONFLICT_MANUAL_REVIEW');
        return {
          success:true,existing:true,receiptId:already[0].id,
          reconciliationStatus:already[0].reconciliation_status,
          complianceHold:Boolean(already[0].compliance_hold),
          feesVerified:false,payoutPerformed:false
        };
      }
      const id='ecr_'+randomUUID().replace(/-/g,'');
      const inserted=await tx.$queryRaw<any[]>`
        INSERT INTO ng_efi_central_receipts
          (id,partner_id,cycle_id,incoming_e2e_id,bank_account_fingerprint,
           bank_settled_at,bank_verified_at,gross_amount_cents,
           provider_fee_cents,retained_fee_cents,reconciliation_status,
           compliance_hold,bank_evidence_ref)
        VALUES
          (${id},${partner.id},${cycleId},${bank.endToEndId},
           ${receivingAccountHash},${bank.bankSettledAt}::timestamptz,now(),
           ${expectedCents}::bigint,0,0,'BANK_RECEIVED',true,${bank.bankEvidenceRef})
        ON CONFLICT DO NOTHING RETURNING id
      `;
      if(!inserted[0])throw new ConflictException('EFI_INCOMING_RECEIPT_CONFLICT_MANUAL_REVIEW');
      // Same transaction: audit failure rolls back receipt registration.
      await tx.$executeRaw`
        INSERT INTO ng_efi_auto_audit
          (id,partner_id,recurrence_id,entity_id,event_type,actor_type,metadata_redacted)
        VALUES
          (${'eia_'+randomUUID().replace(/-/g,'')},${partner.id},
           ${cycle.recurrence_id},${id},'EFI_BANK_RECEIPT_QUARANTINED',
           'bank-readback',${JSON.stringify({
             evidenceSha256:bank.bankEvidenceRef,recipientVerified:true,
             ofPaymentAccepted:true,payoutEnabled:false
           })}::jsonb)
      `;
      return {
        success:true,existing:false,receiptId:id,
        reconciliationStatus:'BANK_RECEIVED',
        complianceHold:true,feesVerified:false,payoutPerformed:false
      };
    });
  }
}
