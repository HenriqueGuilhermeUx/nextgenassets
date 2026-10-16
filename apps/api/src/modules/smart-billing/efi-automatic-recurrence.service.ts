import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { EfiOFService } from '../efi-of/efi-of.service';
import { assertVerifiedEfiAdhesionMatches } from '../efi-of/efi-automatic-consent-validation';
import { assertConsentEligibleForCycle, NextgenRecurrenceSnapshot, VerifiedConsentSnapshot, recurrenceCycleKey } from './efi-automatic-recurrence.bridge';

const prisma = new PrismaClient();

/**
 * Initial INTERNAL admin-only Efí bridge for existing NextGen Smart Billing.
 * Never executes a payment. Provider calls are restricted to SANDBOX CONSENT
 * creation, and only after explicit flag + internal operations authentication.
 * Production consent/payment is intentionally disabled pending QA + contracts.
 */
@Injectable()
export class EfiAutomaticRecurrenceService {
  constructor(private readonly efi: EfiOFService) {}

  private assertEnabled() {
    if (process.env.NEXTGEN_EFI_AUTOMATIC_ENABLED !== 'true')
      throw new ServiceUnavailableException('NEXTGEN_EFI_AUTOMATIC_DISABLED');
  }

  private assertSandbox() {
    this.assertEnabled();
    if (process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS !== 'true')
      throw new ServiceUnavailableException('EFI_AUTOMATIC_SANDBOX_REQUESTS_DISABLED');
    const api = new URL(process.env.EFI_OF_API_URL || 'https://openfinance.api.efipay.com.br');
    const oauth = new URL(process.env.EFI_OAUTH_URL || 'https://openfinance.api.efipay.com.br/v1/oauth/token');
    if (api.hostname !== 'openfinance-h.api.efipay.com.br' || oauth.hostname !== api.hostname)
      throw new ServiceUnavailableException('EFI_ONLY_SANDBOX_ALLOWED');
  }

  private async partner(slug: string) {
    if (!slug || slug.length > 100) throw new BadRequestException('INVALID_PARTNER_SLUG');
    const found = await prisma.partner.findUnique({ where: { slug } });
    if (!found) throw new NotFoundException('PARTNER_NOT_FOUND');
    return found;
  }

  private async recurrence(partnerId: string, recurrenceId: string) {
    if (!recurrenceId || recurrenceId.length > 130) throw new BadRequestException('INVALID_RECURRENCE_ID');
    const rows = await prisma.$queryRaw<any[]>`
      SELECT r.id, r.partner_id, r.customer_id, r.title, r.amount_brl,
             r.frequency, r.status, r.start_date, r.end_date, r.next_charge_date
      FROM smart_billing_recurrences r
      WHERE r.partner_id = ${partnerId} AND r.id = ${recurrenceId}
      LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException('RECURRENCE_NOT_FOUND');
    return rows[0];
  }

  private isoDate(date: any): string {
    if (!date) throw new BadRequestException('MISSING_DATE');
    const dateString = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new BadRequestException('INVALID_DATE');
    return dateString;
  }

  private snapshot(r: any, partnerId: string, tenantId: string): NextgenRecurrenceSnapshot {
    const cents = Math.round(Number(r.amount_brl) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new BadRequestException('INVALID_AMOUNT');
    const frequency = String(r.frequency || 'MONTHLY').toUpperCase();
    if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(frequency))
      throw new BadRequestException('UNSUPPORTED_FREQUENCY');
    return {
      id: r.id, tenantId, partnerId, customerId: r.customer_id,
      title: r.title, amountCents: cents,
      frequency: frequency as NextgenRecurrenceSnapshot['frequency'],
      startsOn: this.isoDate(r.start_date),
      endsOn: r.end_date ? this.isoDate(r.end_date) : null,
      dueDate: this.isoDate(r.next_charge_date),
      status: r.status === 'ACTIVE' ? 'ACTIVE' : r.status === 'PAUSED' ? 'PAUSED' : 'CANCELLED'
    };
  }

  private redacted(row: any) {
    if (!row) return row;
    return {
      id: row.id,
      partnerId: row.partner_id,
      recurrenceId: row.recurrence_id,
      customerId: row.customer_id,
      status: row.status,
      amountCapCents: Number(row.amount_cap_cents),
      retryAllowed: row.retry_allowed,
      hasProviderAdhesion: Boolean(row.provider_adhesion_id),
      verifiedAt: row.verified_at || null,
      createdAt: row.created_at
    };
  }

  async health() {
    return {
      success: true,
      enabled: process.env.NEXTGEN_EFI_AUTOMATIC_ENABLED === 'true',
      sandboxRequestsEnabled: process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS === 'true',
      livePaymentsEnabled: false,
      mode: 'internal-staging-bridge',
      message: 'Never performs a debit; requires authenticated operations and applied migration.'
    };
  }

  async createIntent(partnerSlug: string, recurrenceId: string) {
    this.assertEnabled();
    const company = await this.partner(partnerSlug);
    const r = await this.recurrence(company.id, recurrenceId);
    const data = this.snapshot(r, company.id, company.id);
    if (data.status !== 'ACTIVE') throw new ConflictException('RECURRENCE_NOT_ACTIVE');
    const id = `eau_${randomUUID().replace(/-/g, '')}`;
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO ng_efi_auto_authorizations
        (id,partner_id,recurrence_id,customer_id,amount_cap_cents,status)
      VALUES
        (${id}, ${company.id}, ${r.id}, ${r.customer_id}, ${data.amountCents}::bigint,'DRAFT')
      ON CONFLICT (partner_id, recurrence_id) DO NOTHING
      RETURNING *
    `;
    if (!rows[0]) {
      const existing = await prisma.$queryRaw<any[]>`
        SELECT * FROM ng_efi_auto_authorizations
        WHERE partner_id = ${company.id} AND recurrence_id = ${r.id}
        LIMIT 1
      `;
      return { success: true, existing: true, authorization: this.redacted(existing[0]) };
    }
    await this.audit(company.id, r.id, id, 'EFI_AUTO_INTENT_CREATED', 'admin', {});
    return { success: true, existing: false, authorization: this.redacted(rows[0]) };
  }

  async list(partnerSlug: string) {
    this.assertEnabled();
    const company = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM ng_efi_auto_authorizations
      WHERE partner_id = ${company.id}
      ORDER BY created_at DESC LIMIT 200
    `;
    return { success: true, authorizations: rows.map(x => this.redacted(x)) };
  }

  /**
   * Creates a bank authorization URL in SANDBOX ONLY. No debit.
   * This endpoint deliberately does not accept a favored bank account in body.
   * The beneficiary is derived exclusively from trusted server environment.
   */
  async startSandboxAuthorization(partnerSlug: string, intentId: string, payer: any) {
    this.assertSandbox();
    const company = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM ng_efi_auto_authorizations
      WHERE partner_id = ${company.id} AND id = ${intentId}
      LIMIT 1
    `;
    const intent = rows[0];
    if (!intent) throw new NotFoundException('AUTHORIZATION_NOT_FOUND');
    const r = await this.recurrence(company.id, intent.recurrence_id);
    const data = this.snapshot(r, company.id, company.id);
    if (data.status !== 'ACTIVE') throw new ConflictException('RECURRENCE_NOT_ACTIVE');
    if (data.frequency !== 'MONTHLY' || !data.endsOn) {
      throw new BadRequestException('EFI_AUTOMATIC_REQUIRES_MONTHLY_FIXED_TERM');
    }
    if (data.amountCents !== Number(intent.amount_cap_cents))
      throw new ConflictException('RECURRENCE_AMOUNT_CHANGED_CREATE_NEW_CONSENT');

    const name = String(payer?.name || '').trim();
    const cpf = payer?.cpf ? String(payer.cpf).replace(/\D/g, '') : undefined;
    const cnpj = payer?.cnpj ? String(payer.cnpj).replace(/\D/g, '') : undefined;
    const bankId = String(payer?.bankParticipantId || '').trim();
    if (!name || name.length > 180 || !(cpf?.length === 11 || cnpj?.length === 14) || !bankId || bankId.length > 128)
      throw new BadRequestException('INVALID_PAYER_INFORMATION');

    const keys = [
      'EFI_OF_FAVORECIDO_NOME','EFI_OF_FAVORECIDO_DOCUMENTO','EFI_OF_FAVORECIDO_CODIGO_BANCO',
      'EFI_OF_FAVORECIDO_AGENCIA','EFI_OF_FAVORECIDO_CONTA'
    ] as const;
    if (keys.some(k => !process.env[k])) throw new ServiceUnavailableException('EFI_BENEFICIARY_NOT_CONFIGURED');
    const favored = {
      nome: process.env.EFI_OF_FAVORECIDO_NOME!,
      documento: process.env.EFI_OF_FAVORECIDO_DOCUMENTO!,
      codigoBanco: process.env.EFI_OF_FAVORECIDO_CODIGO_BANCO!,
      agencia: process.env.EFI_OF_FAVORECIDO_AGENCIA!,
      conta: process.env.EFI_OF_FAVORECIDO_CONTA!,
      tipoConta: (process.env.EFI_OF_FAVORECIDO_TIPO_CONTA || 'TRAN') as 'TRAN'|'CACC'|'SVGS'
    };

    // Atomic status claim prevents concurrent duplicate remote requests.
    const claimed = await prisma.$queryRaw<any[]>`
      UPDATE ng_efi_auto_authorizations SET status='REQUESTING', updated_at=now()
      WHERE id = ${intent.id} AND partner_id = ${company.id} AND status='DRAFT'
      RETURNING id
    `;
    if (!claimed[0]) throw new ConflictException('AUTHORIZATION_ALREADY_STARTED');

    try {
      const response = await this.efi.createConsent({
        cpf, cnpj, nome: name, idParticipante: bankId, favorecido: favored,
        valorFixo: (data.amountCents / 100).toFixed(2),
        intervalo: ({
          DAILY:'DIARIO', WEEKLY:'SEMANAL', MONTHLY:'MENSAL', YEARLY:'ANUAL'
        } as const)[data.frequency],
        dataInicio: data.dueDate,
        expiracao: data.endsOn || undefined,
        descricao: data.title,
        permiteRetentativa: false,
        idProprio: `nextgen-${data.id}`,
        idempotencyKey: createHash('sha256').update(`nextgen-efi-authorization|${company.id}|${intent.id}`).digest('hex')
      });
      if (!response.identificadorAdesao || !response.redirectURI)
        throw new Error('EFI_ADHESION_INCOMPLETE_RESPONSE');
      const beneficiaryFingerprint = createHash('sha256').update(
        [favored.documento, favored.codigoBanco, favored.agencia, favored.conta].join('|')
      ).digest('hex');
      await prisma.$executeRaw`
        UPDATE ng_efi_auto_authorizations
        SET provider_adhesion_id = ${response.identificadorAdesao},
            redirect_uri = ${response.redirectURI},
            status = 'AUTHORIZATION_PENDING',
            requested_at = now(), beneficiary_fingerprint = ${beneficiaryFingerprint},
            consented_first_due_on = ${data.dueDate}::date,
            consented_expires_on = ${data.endsOn}::date,
            consented_interval = 'MENSAL',
            updated_at = now()
        WHERE id = ${intent.id} AND partner_id = ${company.id} AND status='REQUESTING'
      `;
      await this.audit(company.id, r.id, intent.id, 'EFI_AUTO_AUTHORIZATION_REQUESTED', 'admin', {});
      return { success: true, id: intent.id, status: 'AUTHORIZATION_PENDING', authorizationUrl: response.redirectURI };
    } catch (e: any) {
      // Unknown provider outcome: NEVER auto-retry. Could have created consent.
      await prisma.$executeRaw`
        UPDATE ng_efi_auto_authorizations
        SET status = 'PROVIDER_ERROR', updated_at = now()
        WHERE id = ${intent.id} AND partner_id = ${company.id} AND status='REQUESTING'
      `;
      await this.audit(company.id, r.id, intent.id, 'EFI_AUTO_AUTHORIZATION_PROVIDER_ERROR', 'system', {});
      throw new ServiceUnavailableException('EFI_ADHESION_REQUEST_UNCERTAIN_MANUAL_REVIEW');
    }
  }

  async previewNextCycle(partnerSlug: string, recurrenceId: string) {
    this.assertEnabled();
    const company = await this.partner(partnerSlug);
    const r = await this.recurrence(company.id, recurrenceId);
    const data = this.snapshot(r, company.id, company.id);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM ng_efi_auto_authorizations
      WHERE partner_id = ${company.id} AND recurrence_id = ${r.id}
      LIMIT 1
    `;
    const a = rows[0];
    if (!a) return { success: true, eligible: false, reason: 'NO_BANK_CONSENT', nextDueDate: data.dueDate };
    const verified: VerifiedConsentSnapshot = {
      recurrenceId: r.id, tenantId: company.id, status: a.status === 'AUTHORIZED' ? 'AUTHORIZED' :
        a.status === 'REVOKED' ? 'REVOKED' : 'PENDING',
      externalAdhesionId: a.provider_adhesion_id || undefined,
      verifiedAt: a.verified_at ? new Date(a.verified_at).toISOString() : undefined,
      maxPaymentCents: Number(a.amount_cap_cents),
      allowRetry: Boolean(a.retry_allowed)
    };
    try {
      assertConsentEligibleForCycle(data, verified);
    } catch (e: any) {
      return { success: true, eligible: false, reason: e.message, nextDueDate: data.dueDate };
    }
    return {
      success: true, eligible: true, nextDueDate: data.dueDate,
      amountCents: data.amountCents,
      cycleKey: recurrenceCycleKey(data),
      message: 'Planning only: payments are disabled in this bridge.'
    };
  }

  /**
   * Only provider HTTPS API confirmation may set the bank authorization status.
   * No request body can mark an authorization as bank-authorized.
   */
  async syncVerifiedBankAuthorization(partnerSlug: string, authorizationId: string) {
    this.assertSandbox();
    const company = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM ng_efi_auto_authorizations
      WHERE partner_id = ${company.id} AND id = ${authorizationId} LIMIT 1
    `;
    const a = rows[0];
    if (!a || !a.provider_adhesion_id) throw new NotFoundException('EFI_BANK_ADHESION_NOT_CREATED');
    const bank = await this.efi.getAutomaticAdhesionOfficial(a.provider_adhesion_id, new Date(a.requested_at || a.created_at));
    // Bank-authorized terms must match this tenant's recorded authorization.
    // A valid bank status with another payee/value/date is never sufficient.
    const recurring = await this.recurrence(company.id, a.recurrence_id);
    const snapshot = this.snapshot(recurring, company.id, company.id);
    if (!a.consented_first_due_on || !a.consented_expires_on ||
        !a.consented_interval || !a.beneficiary_fingerprint) {
      throw new ConflictException('EFI_EXPECTED_AUTHORIZATION_TERMS_MISSING');
    }
    assertVerifiedEfiAdhesionMatches(bank, {
      providerId: a.provider_adhesion_id,
      localReference: `nextgen-${snapshot.id}`,
      amountCents: Number(a.amount_cap_cents),
      interval: ({
        DAILY: 'DIARIO', WEEKLY: 'SEMANAL', MONTHLY: 'MENSAL', YEARLY: 'ANUAL'
      } as const)[snapshot.frequency],
      startsOn: this.isoDate(a.consented_first_due_on),
      expiresOn: this.isoDate(a.consented_expires_on),
      beneficiaryFingerprint: a.beneficiary_fingerprint
    });
    const map: Record<string, string> = {
      'autorizado': 'AUTHORIZED', 'authorized': 'AUTHORIZED', 'ativo': 'AUTHORIZED', 'ativa': 'AUTHORIZED',
      'revogado': 'REVOKED', 'revoked': 'REVOKED', 'cancelado': 'REVOKED', 'cancelada': 'REVOKED',
      'rejeitado': 'REJECTED', 'rejected': 'REJECTED',
      'expirado': 'EXPIRED', 'expired': 'EXPIRED',
      'pendente': 'AUTHORIZATION_PENDING', 'pending': 'AUTHORIZATION_PENDING'
    };
    const status = map[bank.status];
    if (!status) throw new ServiceUnavailableException('UNKNOWN_EFI_BANK_AUTHORIZATION_STATUS');
    const verifiedAt = status === 'AUTHORIZED' ? new Date() : null;
    const updated = await prisma.$queryRaw<any[]>`
      UPDATE ng_efi_auto_authorizations
      SET status = ${status}, provider_status = ${bank.status},
          verified_at = ${verifiedAt}, updated_at=now()
      WHERE partner_id = ${company.id} AND id = ${authorizationId}
        AND status NOT IN ('REVOKED','EXPIRED','REJECTED')
      RETURNING *
    `;
    if (!updated[0]) throw new ConflictException('TERMINAL_AUTHORIZATION_CANNOT_BE_REACTIVATED');
    await this.audit(company.id, a.recurrence_id, a.id, 'EFI_AUTO_AUTHORIZATION_VERIFIED', 'bank-query', { status });
    return { success: true, authorization: this.redacted(updated[0]) };
  }

  /**
   * Creates ONLY a planned cycle. Never sends Pix or marks a charge as paid.
   * Unique DB constraint prevents double cycles under scheduler concurrency.
   */
  async planNextCycle(partnerSlug: string, recurrenceId: string) {
    this.assertEnabled();
    const company = await this.partner(partnerSlug);
    const recurrence = await this.recurrence(company.id, recurrenceId);
    const data = this.snapshot(recurrence, company.id, company.id);
    const authRows = await prisma.$queryRaw<any[]>`
      SELECT * FROM ng_efi_auto_authorizations
      WHERE partner_id = ${company.id} AND recurrence_id = ${recurrenceId} LIMIT 1
    `;
    const a = authRows[0];
    if (!a) throw new ConflictException('NO_EFI_AUTHORIZATION');
    assertConsentEligibleForCycle(data, {
      recurrenceId, tenantId: company.id,
      status: a.status === 'AUTHORIZED' ? 'AUTHORIZED' : 'PENDING',
      externalAdhesionId: a.provider_adhesion_id || undefined,
      verifiedAt: a.verified_at ? new Date(a.verified_at).toISOString() : undefined,
      maxPaymentCents: Number(a.amount_cap_cents),
      allowRetry: Boolean(a.retry_allowed)
    });
    const id = `eac_${randomUUID().replace(/-/g, '')}`;
    const key = recurrenceCycleKey(data);
    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO ng_efi_auto_cycles
        (id, partner_id, recurrence_id, authorization_id, due_date, amount_cents, state, idempotency_key)
      VALUES
        (${id}, ${company.id}, ${recurrenceId}, ${a.id}, ${data.dueDate}::date,
         ${data.amountCents}::bigint, 'PLANNED', ${key})
      ON CONFLICT (partner_id,recurrence_id,due_date) DO NOTHING
      RETURNING id, due_date, state
    `;
    if (!created[0]) return { success: true, existing: true, cycleKey: key, message: 'Cycle already planned' };
    await this.audit(company.id, recurrenceId, id, 'EFI_AUTO_CYCLE_PLANNED', 'admin', {});
    return { success: true, existing: false, cycleId: id, cycleKey: key, status: 'PLANNED' };
  }

  /**
   * Batch planning only, internal authenticated operations endpoint.
   * Does NOT initiate debits, move the recurrence pointer, or mark charges paid.
   * Authorization must already be independently verified by Efí.
   */
  async planDueCycles(partnerSlug: string, asOf?: string, batchSize?: number) {
    this.assertEnabled();
    const company = await this.partner(partnerSlug);
    const date = asOf || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')))
      throw new BadRequestException('INVALID_AS_OF_DATE');
    const limit = Math.min(100, Math.max(1, Number(batchSize) || 25));
    const due = await prisma.$queryRaw<any[]>`
      SELECT r.id
      FROM smart_billing_recurrences r
      INNER JOIN ng_efi_auto_authorizations a
        ON a.partner_id = r.partner_id AND a.recurrence_id = r.id
      WHERE r.partner_id = ${company.id}
        AND r.status = 'ACTIVE'
        AND r.next_charge_date <= ${date}::date
        AND a.status = 'AUTHORIZED' AND a.verified_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM ng_efi_auto_cycles c
          WHERE c.partner_id = r.partner_id
            AND c.recurrence_id = r.id
            AND c.due_date = r.next_charge_date
        )
      ORDER BY r.next_charge_date ASC
      LIMIT ${limit}
    `;
    const planned: any[] = [];
    const errors: any[] = [];
    for (const row of due) {
      try {
        const result = await this.planNextCycle(partnerSlug, row.id);
        planned.push({ recurrenceId: row.id, ...result });
      } catch (error: any) {
        errors.push({ recurrenceId: row.id, code: error?.message || 'PLANNING_ERROR' });
      }
    }
    return { success: errors.length === 0, asOf: date, eligible: due.length,
      planned: planned.length, failed: errors.length, cycles: planned, errors,
      message: 'Only records planned. No Pix sent; no bank debit performed.' };
  }

  async listCycles(partnerSlug: string) {
    this.assertEnabled();
    const company = await this.partner(partnerSlug);
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id,recurrence_id,due_date,amount_cents,state,created_at
      FROM ng_efi_auto_cycles
      WHERE partner_id = ${company.id}
      ORDER BY created_at DESC LIMIT 200
    `;
    return { success: true, cycles: rows.map(r => ({
      id: r.id, recurrenceId: r.recurrence_id, dueDate: this.isoDate(r.due_date),
      amountCents: Number(r.amount_cents), state: r.state, createdAt: r.created_at
    })) };
  }

  private async audit(partnerId: string, recurrenceId: string, entityId: string,
                      eventType: string, actorType: string, meta: Record<string, any>) {
    await prisma.$executeRaw`
      INSERT INTO ng_efi_auto_audit(id,partner_id,recurrence_id,entity_id,event_type,actor_type,metadata_redacted)
      VALUES (${'ead_'+randomUUID().replace(/-/g,'')}, ${partnerId}, ${recurrenceId},
              ${entityId},${eventType},${actorType},${JSON.stringify(meta)}::jsonb)
    `;
  }
}
