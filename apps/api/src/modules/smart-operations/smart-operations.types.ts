export type SmartDocumentType =
  | 'PURCHASE_INVOICE'
  | 'RECEIPT'
  | 'PAYMENT_PROOF'
  | 'BILL_OR_BARCODE'
  | 'EXPENSE_RECEIPT'
  | 'UNKNOWN';

export type SmartOperationAction =
  | 'REGISTER_PURCHASE'
  | 'UPDATE_INVENTORY'
  | 'CREATE_SUPPLIER'
  | 'CREATE_ACCOUNT_PAYABLE'
  | 'CREATE_EXPENSE'
  | 'ARCHIVE_DOCUMENT'
  | 'CREATE_PRODUCT'
  | 'RECONCILE_DOCUMENT';

export type ProductLookupResult = {
  found: boolean;
  provider: string;
  ean?: string;
  upc?: string;
  sku?: string;
  name?: string;
  brand?: string;
  category?: string;
  packaging?: string;
  weight?: string;
  imageUrl?: string;
  rawData?: Record<string, any>;
};

export type ExtractedPurchaseItem = {
  name: string;
  ean?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxes?: number;
  total: number;
};

export type ExtractedDocument = {
  documentType: SmartDocumentType;
  supplier?: {
    name?: string;
    cnpj?: string;
  };
  number?: string;
  date?: string;
  items?: ExtractedPurchaseItem[];
  total?: number;
  paymentMethod?: string;
  dueDates?: string[];
  barcode?: string;
  description?: string;
  category?: string;
  confidence: number;
  suggestedActions: SmartOperationAction[];
  warnings?: string[];
  rawTextPreview?: string;
  rawData?: Record<string, any>;
};

export interface AvDocumentIntelligenceProvider {
  name: string;
  extract(input: {
    tenantSlug: string;
    documentType?: SmartDocumentType;
    fileName?: string;
    mimeType?: string;
    documentUrl?: string;
    documentText?: string;
    barcode?: string;
    rawData?: Record<string, any>;
  }): Promise<ExtractedDocument>;
}

export interface ProductLookupProvider {
  name: string;
  lookupByCode(code: string): Promise<ProductLookupResult>;
}
