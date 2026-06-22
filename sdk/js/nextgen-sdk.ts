/**
 * NextGen Assets SDK v0.2
 * Split de PIX nativo. Open Finance. AI.
 * Docs: https://nextgenassets.com.br/docs
 * GitHub: https://github.com/HenriqueGuilhermeUx/nextgenassets
 */

export interface NextGenConfig {
  apiKey: string;
  baseUrl?: string;
}

// ============== TYPES ==============

export interface ChargeSplit {
  pixKey: string;
  value: number; // centavos
  splitType?: 'SPLIT_SUB_ACCOUNT' | 'SPLIT_PARTNER';
}

export interface CreateChargeOpts {
  value: number; // centavos
  correlationID: string;
  splits?: ChargeSplit[];
  comment?: string;
  customer?: { name?: string; email?: string; taxID?: string; phone?: string };
  expiresIn?: number; // segundos
}

export interface Charge {
  identifier: string;
  correlationID: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELED';
  value: number;
  paymentLinkUrl: string;
  brCode: string;
  qrCodeImage: string;
  splits?: { pixKey: string; value: number; splitType: string }[];
  createdAt: string;
  paidAt?: string;
}

export interface Subaccount {
  pixKey: string;
  name: string;
  balance: number; // centavos
  withdrawBlocked: boolean;
}

export interface Subscription {
  id: string;
  taxID: string;
  value: number;
  dayGenerateCharge: number;
  type: 'RECURRENT' | 'INSTALLMENT';
  status: 'ACTIVE' | 'CANCELED' | 'OVERDUE';
  createdAt: string;
}

export interface Consent {
  id: string;
  provider: 'pluggy' | 'klavi' | 'efi-of';
  status: string;
  providerUserId: string;
  metadata?: any;
}

export interface Trigger {
  id: string;
  userId: string;
  partnerId: string;
  code: string;
  config: any;
  active: boolean;
  createdAt: string;
}

export interface BillingInfo {
  userId: string;
  partnerId: string;
  plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  triggersLimit: number;
  triggersUsed: number;
  triggersRemaining: number;
  features: string[];
}

// ============== WOOVID ==============

class NextGenWoovi {
  constructor(private client: NextGen) {}

  /**
   * Calcula split padrão (3% NextGen + 96.5% Partner)
   */
  calculateSplit(valueCents: number) {
    const nextgenCents = Math.floor(valueCents * 0.03);
    const wooviFeeCents = Math.max(Math.ceil(valueCents * 0.005), 1);
    const partnerCents = valueCents - nextgenCents - wooviFeeCents;
    return { nextgenCents, partnerCents, wooviFeeCents, total: valueCents };
  }

  /**
   * Cria uma cobrança PIX (com ou sem split)
   */
  async createCharge(opts: CreateChargeOpts): Promise<Charge> {
    if (!opts.value || opts.value <= 0) throw new Error('value required (em centavos)');
    if (!opts.correlationID) throw new Error('correlationID required');
    if (opts.splits) {
      const total = opts.splits.reduce((s, x) => s + x.value, 0);
      if (total >= opts.value) {
        throw new Error(`Split total (${total}) deve ser < total (${opts.value}) - Woovi retém 5%`);
      }
      opts.splits = opts.splits.map(s => ({ ...s, splitType: s.splitType || 'SPLIT_SUB_ACCOUNT' }));
    }

    return this.client.post('/v1/admin/webhooks/woovi-test', {
      totalCents: opts.value,
      nextgenCents: opts.splits?.[0]?.value || 0,
      partnerCents: opts.splits?.[1]?.value || 0,
      correlationID: opts.correlationID,
      nextgenPixKey: opts.splits?.[0]?.pixKey,
      partnerPixKey: opts.splits?.[1]?.pixKey,
      comment: opts.comment,
      customer: opts.customer
    });
  }

  /**
   * Lista subcontas com saldos
   */
  async listSubaccounts(): Promise<{ count: number; totalCents: number; subaccounts: Subaccount[] }> {
    return this.client.get('/v1/admin/webhooks/woovi-subaccounts');
  }

  /**
   * Saca saldo de 1 subconta
   */
  async withdraw(pixKey: string, value: number): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-withdraw', { pixKey, value });
  }

  /**
   * Saca saldo de TODAS as subcontas (auto-withdraw)
   */
  async withdrawAll(opts: { minCents?: number } = {}): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-withdraw-all', { minCents: opts.minCents || 100 });
  }

  /**
   * PIX OUT (transferência entre contas Woovi)
   */
  async createTransfer(opts: { value: number; pixKey: string; correlationID: string }): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-pixout', opts);
  }

  /**
   * Cria subscription recorrente (Pix Automático)
   */
  async createSubscription(opts: {
    taxID: string;
    value: number;
    dayGenerateCharge: number;
  }): Promise<Subscription> {
    return this.client.post('/v1/admin/webhooks/woovi-subscriber-create', opts);
  }

  /**
   * Lista subscriptions ativas
   */
  async listSubscriptions(): Promise<{ count: number; subscriptions: Subscription[] }> {
    return this.client.get('/v1/admin/webhooks/woovi-subscription-list');
  }

  /**
   * Cancela subscription
   */
  async cancelSubscription(taxID: string): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-subscriber-cancel', { taxID });
  }
}

// ============== OPEN FINANCE ==============

class NextGenPluggy {
  constructor(private client: NextGen) {}

  /** Cria um Connect Token (pra abrir widget Pluggy Connect) */
  async createConnectToken(clientUserId: string): Promise<{ connectToken: string; clientUserId: string }> {
    return this.client.post('/v1/admin/webhooks/pluggy-connect-token', { clientUserId });
  }

  /** Lista Consents Pluggy salvos */
  async listConsents(): Promise<{ count: number; consents: Consent[] }> {
    return this.client.get('/v1/admin/webhooks/consents');
  }

  /** Status da integração Pluggy */
  async status(): Promise<any> {
    return this.client.get('/v1/admin/webhooks/pluggy-status');
  }
}

class NextGenKlavi {
  constructor(private client: NextGen) {}

  /** Cria link de conexão Klavi (mais barato que Pluggy) */
  async createLink(cpf: string): Promise<{ linkUrl: string; linkToken: string; linkId: string }> {
    return this.client.get(`/v1/admin/webhooks/klavi-test?cpf=${cpf}`);
  }

  /** Status da integração Klavi */
  async status(): Promise<any> {
    return this.client.get('/v1/admin/webhooks/klavi-status');
  }
}

class NextGenEfiOF {
  constructor(private client: NextGen) {}

  /** Status da integração Efi OF */
  async status(): Promise<any> {
    return this.client.get('/v1/admin/webhooks/efi-of-status');
  }

  /** Cria consent (cliente autoriza) */
  async createConsent(opts: {
    cpf: string;
    permissions?: string[];
  }): Promise<{ consentId: string; authUrl: string }> {
    return this.client.post('/v1/admin/webhooks/efi-criar-consent', opts);
  }

  /** Inicia pagamento via OF */
  async initiatePayment(opts: {
    consentId: string;
    amount: number;
    pixKey: string;
    description?: string;
  }): Promise<{ paymentId: string; endToEndId: string }> {
    return this.client.post('/v1/admin/webhooks/efi-pay', opts);
  }
}

// ============== TRIGGERS ==============

class NextGenTriggers {
  constructor(private client: NextGen) {}

  /** Lista todos os gatilhos */
  async list(): Promise<Trigger[]> {
    return this.client.get('/v1/admin/webhooks/triggers');
  }

  /** Cria gatilho a partir de linguagem natural (AI) */
  async fromNaturalLanguage(userInput: string, userId: string): Promise<Trigger> {
    return this.client.post('/v1/admin/webhooks/from-natural-language', { userInput, userId });
  }

  /** Força execução imediata */
  async forceExecute(triggerId: string): Promise<any> {
    return this.client.post(`/v1/admin/webhooks/${triggerId}/force-execute`, {});
  }

  /** Gatilho de compra (lê saldo OF + paga via split) */
  async gatilhoCompra(opts: {
    cpf: string;
    value: number;
    pixKey: string;
  }): Promise<any> {
    return this.client.post('/v1/admin/webhooks/gatilho-flow-completo', opts);
  }
}

// ============== BILLING ==============

class NextGenBilling {
  constructor(private client: NextGen) {}

  /** Info do plano do user */
  async me(userId?: string): Promise<BillingInfo> {
    const opts = userId ? { headers: { 'X-User-Id': userId } } : undefined;
    return this.client.get('/v1/billing/me', opts);
  }

  /** Verifica se user pode executar ação */
  async checkLimit(action: 'create_trigger' | 'receive_pix', userId: string): Promise<{ allowed: boolean; remaining: number }> {
    return this.client.post('/v1/billing/check-limit', { action, userId });
  }

  /** Ativa plano PREMIUM */
  async activatePremium(userId: string, correlationID: string): Promise<any> {
    return this.client.post('/v1/billing/activate', { userId, plan: 'PREMIUM', correlationID });
  }
}

// ============== MAIN CLIENT ==============

export class NextGen {
  private apiKey: string;
  private baseUrl: string;
  
  woovi: NextGenWoovi;
  pluggy: NextGenPluggy;
  klavi: NextGenKlavi;
  efiOF: NextGenEfiOF;
  triggers: NextGenTriggers;
  billing: NextGenBilling;

  constructor(config: NextGenConfig) {
    if (!config.apiKey) throw new Error('apiKey required');
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nextgenassets.com.br';
    
    this.woovi = new NextGenWoovi(this);
    this.pluggy = new NextGenPluggy(this);
    this.klavi = new NextGenKlavi(this);
    this.efiOF = new NextGenEfiOF(this);
    this.triggers = new NextGenTriggers(this);
    this.billing = new NextGenBilling(this);
  }

  async get(path: string, options?: any): Promise<any> {
    return this.request('GET', path, undefined, options);
  }

  async post(path: string, body: any): Promise<any> {
    return this.request('POST', path, body);
  }

  private async request(method: string, path: string, body?: any, options?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    };
    
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!res.ok && res.status >= 400) {
      const err = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(err); } catch { parsed = { error: err }; }
      const error: any = new Error(parsed.error || parsed.message || `HTTP ${res.status}`);
      error.status = res.status;
      error.response = parsed;
      throw error;
    }
    
    return res.json();
  }
}

// Browser global
declare global {
  interface Window { NextGen: typeof NextGen; }
}
if (typeof window !== 'undefined') {
  (window as any).NextGen = NextGen;
}

export default NextGen;
