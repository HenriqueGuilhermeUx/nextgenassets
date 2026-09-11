import { Injectable } from '@nestjs/common';
import { AvDocumentIntelligenceProvider, ExtractedDocument, SmartDocumentType, SmartOperationAction } from '../smart-operations.types';

@Injectable()
export class MockAvDocumentProvider implements AvDocumentIntelligenceProvider {
  name = 'mock-av-document-intelligence';

  async extract(input: {
    tenantSlug: string;
    documentType?: SmartDocumentType;
    fileName?: string;
    mimeType?: string;
    documentUrl?: string;
    documentText?: string;
    barcode?: string;
    rawData?: Record<string, any>;
  }): Promise<ExtractedDocument> {
    const text = String(input.documentText || input.rawData?.text || '').trim();
    const lower = text.toLowerCase();
    const barcode = input.barcode || this.findBarcode(text);
    const documentType = input.documentType || this.detectType(lower, barcode);
    const total = this.findMoney(text) || Number(input.rawData?.total || 0) || undefined;
    const dueDates = this.findDates(text);
    const supplierName = this.pickLine(text) || input.rawData?.supplierName || input.rawData?.fornecedor || undefined;

    const extracted: ExtractedDocument = {
      documentType,
      supplier: {
        name: supplierName,
        cnpj: this.findCnpj(text) || input.rawData?.cnpj || undefined
      },
      number: this.findNumber(text),
      date: dueDates[0],
      items: this.mockItems(documentType, text, total),
      total,
      paymentMethod: barcode ? 'BOLETO_OR_PIX_COPY' : this.findPaymentMethod(lower),
      dueDates,
      barcode,
      description: this.detectDescription(documentType),
      category: this.detectCategory(documentType),
      confidence: text || barcode || input.documentUrl ? 0.72 : 0.35,
      suggestedActions: this.suggestActions(documentType),
      warnings: [
        'Extração em modo MVP/mock. Confirmar todos os dados antes de registrar.',
        'Nenhuma ação operacional é executada automaticamente.'
      ],
      rawTextPreview: text.slice(0, 500),
      rawData: {
        provider: this.name,
        fileName: input.fileName || null,
        mimeType: input.mimeType || null,
        documentUrl: input.documentUrl || null
      }
    };

    return extracted;
  }

  private detectType(lower: string, barcode?: string): SmartDocumentType {
    if (barcode || lower.includes('boleto') || lower.includes('linha digitável') || lower.includes('codigo de barras') || lower.includes('código de barras')) return 'BILL_OR_BARCODE';
    if (lower.includes('danfe') || lower.includes('nfe') || lower.includes('nf-e') || lower.includes('nota fiscal') || lower.includes('cupom fiscal')) return 'PURCHASE_INVOICE';
    if (lower.includes('comprovante') || lower.includes('pix realizado') || lower.includes('pagamento realizado')) return 'PAYMENT_PROOF';
    if (lower.includes('recibo') || lower.includes('despesa') || lower.includes('reembolso')) return 'EXPENSE_RECEIPT';
    return 'UNKNOWN';
  }

  private suggestActions(type: SmartDocumentType): SmartOperationAction[] {
    if (type === 'PURCHASE_INVOICE') return ['REGISTER_PURCHASE', 'UPDATE_INVENTORY', 'CREATE_SUPPLIER', 'CREATE_ACCOUNT_PAYABLE', 'ARCHIVE_DOCUMENT'];
    if (type === 'BILL_OR_BARCODE') return ['CREATE_ACCOUNT_PAYABLE', 'ARCHIVE_DOCUMENT'];
    if (type === 'EXPENSE_RECEIPT' || type === 'RECEIPT') return ['CREATE_EXPENSE', 'ARCHIVE_DOCUMENT'];
    if (type === 'PAYMENT_PROOF') return ['RECONCILE_DOCUMENT', 'ARCHIVE_DOCUMENT'];
    return ['ARCHIVE_DOCUMENT'];
  }

  private mockItems(type: SmartDocumentType, text: string, total?: number) {
    if (type !== 'PURCHASE_INVOICE') return [];
    return [
      {
        name: 'Item identificado na nota',
        ean: this.findEan(text),
        sku: null,
        quantity: 1,
        unitPrice: total || 0,
        discount: 0,
        taxes: 0,
        total: total || 0
      }
    ];
  }

  private findMoney(text: string) {
    const match = text.match(/(?:R\$\s*)?(\d{1,6}[.,]\d{2})/);
    return match ? Number(match[1].replace('.', '').replace(',', '.')) : undefined;
  }

  private findDates(text: string) {
    const matches = Array.from(text.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g));
    return matches.map((m) => `${m[3]}-${m[2]}-${m[1]}`).slice(0, 5);
  }

  private findCnpj(text: string) {
    const match = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    return match ? match[0].replace(/\D/g, '') : undefined;
  }

  private findEan(text: string) {
    const match = text.match(/\b\d{8,14}\b/);
    return match ? match[0] : null;
  }

  private findBarcode(text: string) {
    const match = text.replace(/\D/g, '').match(/\d{44,48}/);
    return match ? match[0] : undefined;
  }

  private findNumber(text: string) {
    const match = text.match(/(?:n[ºo]|numero|número|nota)\s*[:#-]?\s*(\d{3,12})/i);
    return match ? match[1] : undefined;
  }

  private findPaymentMethod(lower: string) {
    if (lower.includes('pix')) return 'PIX';
    if (lower.includes('boleto')) return 'BOLETO';
    if (lower.includes('cartao') || lower.includes('cartão')) return 'CARD';
    if (lower.includes('dinheiro')) return 'CASH';
    return undefined;
  }

  private pickLine(text: string) {
    return text.split('\n').map((line) => line.trim()).filter(Boolean)[0];
  }

  private detectDescription(type: SmartDocumentType) {
    if (type === 'PURCHASE_INVOICE') return 'Nota/compra identificada para conferência.';
    if (type === 'BILL_OR_BARCODE') return 'Documento com vencimento ou código de barras.';
    if (type === 'PAYMENT_PROOF') return 'Comprovante para conciliação.';
    if (type === 'EXPENSE_RECEIPT') return 'Recibo/despesa para prestação de contas.';
    return 'Documento recebido para classificação.';
  }

  private detectCategory(type: SmartDocumentType) {
    if (type === 'PURCHASE_INVOICE') return 'compras';
    if (type === 'BILL_OR_BARCODE') return 'contas-a-pagar';
    if (type === 'PAYMENT_PROOF') return 'conciliacao';
    if (type === 'EXPENSE_RECEIPT') return 'despesas';
    return 'inbox';
  }
}
