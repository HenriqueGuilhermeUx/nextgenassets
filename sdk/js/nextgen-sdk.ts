/**
 * NextGen Assets SDK v0.1
 * Split de PIX nativo. Open Finance. AI.
 * Docs: https://nextgenassets.com.br/docs
 */

export interface NextGenConfig {
  apiKey: string;
  baseUrl?: string;
}

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
  expiresIn?: number;
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
  balance: number;
  withdrawBlocked: boolean;
}

export interface Consent {
  id: string;
  provider: string;
  status: string;
  providerUserId: string;
  metadata?: any;
}

class NextGenWoovi {
  constructor(private client: NextGen) {}

  /** Cria uma cobrança PIX (com ou sem split) */
  async createCharge(opts: CreateChargeOpts): Promise<Charge> {
    // Validação
    if (!opts.value || opts.value <= 0) throw new Error('value required');
    if (!opts.correlationID) throw new Error('correlationID required');
    if (opts.splits) {
      const total = opts.splits.reduce((s, x) => s + x.value, 0);
      if (total >= opts.value) {
        throw new Error(`Split total (${total}) must be < charge total (${opts.value}) - Woovi retém 5%`);
      }
      // Adiciona splitType se não tiver
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

  /** Lista subcontas com saldos */
  async listSubaccounts(): Promise<{ count: number; totalCents: number; subaccounts: Subaccount[] }> {
    return this.client.get('/v1/admin/webhooks/woovi-subaccounts');
  }

  /** Saca saldo de 1 subconta */
  async withdraw(pixKey: string, value: number): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-withdraw', { pixKey, value });
  }

  /** Saca saldo de TODAS as subcontas (auto-withdraw) */
  async withdrawAll(opts: { minCents?: number } = {}): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-withdraw-all', { minCents: opts.minCents || 100 });
  }

  /** PIX OUT (transferência entre contas Woovi) */
  async createTransfer(opts: { value: number; pixKey: string; correlationID: string }): Promise<any> {
    return this.client.post('/v1/admin/webhooks/woovi-pixout', opts);
  }
}

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

  /** Simula webhook Pluggy (pra teste) */
  async simulateWebhook(data: any): Promise<any> {
    return this.client.post('/v1/admin/webhooks/pluggy-alias', data);
  }
}

export class NextGen {
  private apiKey: string;
  private baseUrl: string;
  
  woovi: NextGenWoovi;
  pluggy: NextGenPluggy;

  constructor(config: NextGenConfig) {
    if (!config.apiKey) throw new Error('apiKey required');
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nextgenassets.com.br';
    this.woovi = new NextGenWoovi(this);
    this.pluggy = new NextGenPluggy(this);
  }

  async get(path: string): Promise<any> {
    return this.request('GET', path);
  }

  async post(path: string, body: any): Promise<any> {
    return this.request('POST', path, body);
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
    
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!res.ok && res.status >= 400) {
      const err = await res.text();
      throw new Error(`NextGen API error: ${res.status} - ${err}`);
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
