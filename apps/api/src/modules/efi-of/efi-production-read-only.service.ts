import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EfiOFService } from './efi-of.service';
import { assertEfiProductionReadOnly, efiProductionReadOnlyPreflight } from './efi-production-read-only.policy';

@Injectable()
export class EfiProductionReadOnlyService {
  constructor(private readonly efi: EfiOFService) {}

  preflight() {
    return efiProductionReadOnlyPreflight();
  }

  async lookupAdhesion(adhesionId: unknown, createdOn: unknown) {
    assertEfiProductionReadOnly();
    // Operator-only lookup. An event or a browser redirect cannot authorize funds.
    if (typeof adhesionId !== 'string' ||
        !/^urn:efi:[a-zA-Z0-9-]{8,170}$/.test(adhesionId) ||
        typeof createdOn !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) {
      throw new BadRequestException('EFI_PRODUCTION_READ_ONLY_INVALID_LOOKUP');
    }
    const creation = new Date(createdOn + 'T12:00:00.000Z');
    if (!Number.isFinite(creation.getTime()) ||
        creation.toISOString().slice(0,10) !== createdOn) {
      throw new BadRequestException('EFI_PRODUCTION_READ_ONLY_INVALID_DATE');
    }
    try {
      // The only remote operation is an OAuth exchange followed by a bank GET,
      // using pre-existing server-side credentials. No records are changed.
      const record = await this.efi.getAutomaticAdhesionOfficial(adhesionId, creation);
      const bankStatus = typeof record.status === 'string' ? record.status.trim().toLowerCase() : '';
      // Avoid reflecting untrusted provider text through an operator endpoint.
      if (!['autorizado','authorized','ativo','ativa','pendente','pending','revogado',
            'revoked','cancelado','cancelada','rejeitado','rejected','expirado','expired'].includes(bankStatus)) {
        throw new Error('EFI_UNKNOWN_BANK_AUTHORIZATION_STATUS');
      }
      // Do NOT expose account numbers, CPF/CNPJ, tokens, payee hash, consent
      // redirect URI, customer IDs or merchant configuration.
      return {
        success: true,
        bankRecordFound: true,
        bankReportedStatus: bankStatus,
        localMandateMatched: false,
        anyPaymentSettled: false,
        customerRecordModified: false,
        instructionSent: false
      };
    } catch (_err: unknown) {
      // Suppress remote response and TLS details in user-visible output.
      throw new ServiceUnavailableException('EFI_PRODUCTION_READ_ONLY_QUERY_REQUIRES_REVIEW');
    }
  }

  async lookupPayment(input: {
    adhesionId?: unknown; endToEndId?: unknown;
    requestedDate?: unknown; amountCents?: unknown;
  } = {}) {
    assertEfiProductionReadOnly();
    const { adhesionId, endToEndId, requestedDate, amountCents } = input;
    if (typeof adhesionId !== 'string' ||
        !/^urn:efi:[a-zA-Z0-9-]{8,170}$/.test(adhesionId) ||
        typeof endToEndId !== 'string' ||
        !/^[A-Za-z0-9-]{8,120}$/.test(endToEndId) ||
        typeof requestedDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ||
        !Number.isFinite(new Date(requestedDate + 'T12:00:00.000Z').getTime()) ||
        new Date(requestedDate + 'T12:00:00.000Z').toISOString().slice(0, 10) !== requestedDate ||
        !Number.isSafeInteger(amountCents) || (amountCents as number) <= 0) {
      throw new BadRequestException('EFI_PRODUCTION_READ_ONLY_PAYMENT_INVALID');
    }
    try {
      const bank = await this.efi.getAutomaticProductionPaymentStatus({
        adhesionId, endToEndId,
        requestedDate, expectedAmountCents: amountCents as number
      });
      const status = typeof bank.status === 'string' ? bank.status.toLowerCase().trim() : '';
      // Bank status, even 'aceito', never proves the incoming Pix reached
      // the NextGen beneficiary account. Reconcile independently first.
      if (!['pendente', 'agendado', 'aceito', 'rejeitado', 'cancelado'].includes(status)) {
        throw new Error('EFI_UNKNOWN_PAYMENT_STATUS');
      }
      return {
        success: true,
        bankPaymentFound: true,
        exactBankReferenceAndAmountMatched: true,
        bankReportedStatus: status,
        refundReported: bank.hasRefunds,
        bankCreditReconciled: false,
        settlementVerified: false,
        receiptCreated: false,
        payoutExecuted: false,
        customerRecordModified: false
      };
    } catch (_err: unknown) {
      throw new ServiceUnavailableException('EFI_PRODUCTION_READ_ONLY_PAYMENT_REQUIRES_REVIEW');
    }
  }
}
