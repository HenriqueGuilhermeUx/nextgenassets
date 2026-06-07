// ============================================
//  DESTINATION INTERFACE — Contrato Universal
// ============================================
// Todo adapter (mock ou real) implementa essa interface.
// O trigger engine SÓ conhece essa interface. Trocar mock por real = config.

export type DestinationType =
  | 'STOCK_BROKER'
  | 'FUND_DISTRIBUTOR'
  | 'CRYPTO_EXCHANGE'
  | 'BANK_ACCOUNT'
  | 'RETAILER'
  | 'INSURER'
  | 'BILL_PAYER'
  | 'AUTO_DETECT';

export type DestinationAction =
  | { type: 'BUY_STOCK'; ticker: string; amountBrl: number; userId: string }
  | { type: 'SELL_STOCK'; ticker: string; quantity: number; userId: string }
  | { type: 'SUBSCRIBE_FUND'; fundId: string; amountBrl: number; userId: string }
  | { type: 'REDEEM_FUND'; fundId: string; amountBrl: number; userId: string }
  | { type: 'BUY_CRYPTO'; asset: string; amountBrl: number; userId: string }
  | { type: 'SELL_CRYPTO'; asset: string; quantity: number; userId: string }
  | { type: 'TRANSFER'; destinationAccount: string; amountBrl: number; userId: string }
  | { type: 'BUY_PRODUCT'; sku: string; quantity: number; userId: string }
  | { type: 'PAY_BILL'; billType: string; providerId: string; amountBrl: number; userId: string }
  | { type: 'PAY_INSURANCE'; policyId: string; amountBrl: number; userId: string };

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export type ExecutionResult =
  | { status: 'COMPLETED'; externalId: string; details: Record<string, any> }
  | { status: 'PENDING'; externalId: string; estimatedCompletion: Date }
  | { status: 'FAILED'; errorCode: string; errorMessage: string; retryable: boolean };

export type ExecutionStatusResult =
  | { status: 'COMPLETED'; externalId: string; details: Record<string, any> }
  | { status: 'PENDING'; estimatedCompletion?: Date }
  | { status: 'FAILED'; errorCode: string; errorMessage: string };

export interface CancelResult {
  canceled: boolean;
  reason?: string;
}

export interface ReconciliationResult {
  externalOperations: Array<{
    externalId: string;
    type: DestinationAction['type'];
    amountBrl?: number;
    quantity?: number;
    asset?: string;
    executedAt: Date;
  }>;
}

export interface DestinationAdapter {
  readonly type: DestinationType;
  readonly partnerId: string;
  readonly adapterName: string;  // 'MOCK_STOCK_BROKER', 'XP_BROKER', 'ORAMA_FUND', etc.

  // ========== Métodos Obrigatórios ==========

  // Valida se o adapter pode operar pra esse usuário
  validateUser(externalUserId: string): Promise<ValidationResult>;

  // Execução principal — chamada quando o gatilho bate
  execute(action: DestinationAction): Promise<ExecutionResult>;

  // Verifica status de uma execução em andamento
  checkExecution(externalId: string): Promise<ExecutionStatusResult>;

  // Cancela execução (se ainda não processada)
  cancel(externalId: string): Promise<CancelResult>;

  // Reconciliação — busca operações que aconteceram fora do Orkest
  reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult>;

  // ========== Métodos Auxiliares (opcionais) ==========

  // Lista de ativos/tickers que o adapter suporta
  listSupportedAssets?(): Promise<string[]>;

  // Cotação atual de um ativo
  getQuote?(asset: string): Promise<{ price: number; currency: string; timestamp: Date }>;
}
