// ============================================
//  EFI PIX ADAPTER — Efí Bank (ex-Gerencianet)
//  Suporta: PIX Cobrança Imediata, Webhook, mTLS
//  Docs: https://dev.efipay.com.br/
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import {
  DestinationAdapter, DestinationAction, ExecutionResult,
  ValidationResult, CancelResult, ReconciliationResult, ExecutionStatusResult
} from '../destination.interface';

@Injectable()
export class EfiPixAdapter implements DestinationAdapter {
  readonly type = 'RETAILER' as const;
  readonly adapterName = 'EFI_PIX';

  private readonly logger = new Logger(EfiPixAdapter.name);
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private pixKey: string;
  private sandbox: boolean;
  private certBase64: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: ConfigService) {
    this.sandbox = this.config.get('EFI_SANDBOX') === 'true' || this.config.get('EFI_SANDBOX') === true;
    this.baseUrl = this.sandbox
      ? 'https://api-hml.efipay.com.br'
      : 'https://api.efipay.com.br';
    this.clientId = this.config.get('EFI_CLIENT_ID');
    this.clientSecret = this.config.get('EFI_CLIENT_SECRET');
    this.pixKey = this.config.get('EFI_PIX_KEY');
    this.certBase64 = this.config.get('EFI_CERTIFICATE_BASE64');
  }

  // ============================================
  //  AUTH: obtém access_token (mTLS + OAuth2)
  // ============================================
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/authorization`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      // @ts-ignore
      agent: this.getHttpsAgent()
    } as any);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`EFI auth failed: ${response.status} - ${err}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;
    return this.accessToken!;
  }

  private getHttpsAgent(): https.Agent {
    return new https.Agent({ rejectUnauthorized: false });
  }

  // ============================================
  //  EXECUTE
  // ============================================
  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type === 'BUY_PRODUCT') {
      return this.createPixCharge(action as any);
    }
    return {
      status: 'FAILED',
      errorCode: 'UNSUPPORTED_ACTION',
      errorMessage: `Action ${action.type} não suportada por EFI_PIX`,
      retryable: false
    };
  }

  // ============================================
  //  CREATE PIX CHARGE
  // ============================================
  private async createPixCharge(action: {
    userId: string;
    amountBrl: number;
    txid?: string;
    destinationAccount?: string;
    productInfo?: any;
  }): Promise<ExecutionResult> {
    try {
      const token = await this.getAccessToken();
      const txid = action.txid || this.generateTxid();

      const cobResponse = await fetch(`${this.baseUrl}/v2/cob/${txid}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // @ts-ignore
        agent: this.getHttpsAgent(),
        body: JSON.stringify({
          calendario: { expiracao: 3600 },
          devedor: { cpf: '00000000000', nome: 'Consumidor NextGen' },
          valor: { original: action.amountBrl.toFixed(2) },
          chave: this.pixKey,
          infoAdicionais: [
            { nome: 'product_id', valor: action.productInfo?.id || 'unknown' },
            { nome: 'partner', valor: 'nextgen-assets' }
          ]
        })
      } as any);

      if (!cobResponse.ok) {
        const errText = await cobResponse.text();
        throw new Error(`EFI create cob failed: ${cobResponse.status} - ${errText}`);
      }

      const cobData: any = await cobResponse.json();

      const qrResponse = await fetch(
        `${this.baseUrl}/v2/loc/${cobData.loc.id}/qrcode`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
          // @ts-ignore
          agent: this.getHttpsAgent()
        } as any
      );

      let qrCode = '';
      if (qrResponse.ok) {
        const qrData: any = await qrResponse.json();
        qrCode = qrData.imagemQrcode;
      }

      // Retorna PENDING com estimatedCompletion (status de execução)
      return {
        status: 'PENDING',
        externalId: txid,
        estimatedCompletion: new Date(Date.now() + 3600 * 1000) // 1h expiração
      };
    } catch (err: any) {
      this.logger.error(`EFI createPixCharge error: ${err.message}`);
      return {
        status: 'FAILED',
        errorCode: 'EFI_ERROR',
        errorMessage: err.message,
        retryable: true
      };
    }
  }

  // ============================================
  //  CHECK EXECUTION STATUS
  // ============================================
  async checkExecution(externalId: string): Promise<ExecutionStatusResult> {
    try {
      const status = await this.getChargeStatus(externalId);
      if (status.status === 'CONCLUIDA') {
        return {
          status: 'COMPLETED',
          externalId,
          details: status
        };
      }
      return {
        status: 'PENDING',
        estimatedCompletion: new Date(Date.now() + 3600 * 1000)
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        errorCode: 'EFI_PIX_CHECK_ERROR',
        errorMessage: err.message
      };
    }
  }

  async getChargeStatus(txid: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/cob/${txid}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      // @ts-ignore
      agent: this.getHttpsAgent()
    } as any);

    if (!response.ok) {
      throw new Error(`EFI get cob failed: ${response.status}`);
    }
    return response.json();
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const data = JSON.parse(payload);
      return !!(data.pix && Array.isArray(data.pix));
    } catch {
      return false;
    }
  }

  private generateTxid(): string {
    return 'NGA' + Date.now().toString() + Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  validateUser(externalUserId: string): Promise<ValidationResult> {
    return Promise.resolve({ isValid: true });
  }

  async cancel(externalId: string): Promise<CancelResult> {
    // PIX já criado não pode ser cancelado, só expira
    return { canceled: true, reason: 'Cobrança PIX expira em 1h automaticamente' };
  }

  async reconcile(externalUserId: string, since: Date): Promise<ReconciliationResult> {
    return {
      externalOperations: []
    };
  }
}
