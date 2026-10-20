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
      // Do NOT expose account numbers, CPF/CNPJ, tokens, payee hash, consent
      // redirect URI, customer IDs or merchant configuration.
      return {
        success: true,
        bankRecordFound: true,
        bankReportedStatus: record.status,
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
}
