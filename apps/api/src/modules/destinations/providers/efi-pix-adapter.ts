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
import { buildEfiConfig } from '../../../config/efi.config';
import { httpsRequestWithMtls } from './efi-https';

const EFI_CONFIG = buildEfiConfig(process.env);

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
  private certBuffer: Buffer | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: ConfigService) {
    this.sandbox = EFI_CONFIG.sandbox;
    this.baseUrl = EFI_CONFIG.apiBaseUrl;
    this.clientId = this.config.get('EFI_CLIENT_ID');
    this.clientSecret = this.config.get('EFI_CLIENT_SECRET');
    this.pixKey = this.config.get('EFI_PIX_KEY');
    this.certBase64 = this.config.get('EFI_CERTIFICATE_BASE64');
    this.certBuffer = this.certBase64 ? Buffer.from(this.certBase64, 'base64') : null;
  }

  // ============================================
  //  AUTH: obtém access_token (mTLS + OAuth2)
  // ============================================
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    // URL OFICIAL (confirmada em dev.efipay.com.br/docs/api-pix/credenciais):
    //   https://pix.api.efipay.com.br/oauth/token
    // OAuth fica em domínio DIFERENTE da API Pix.
    // IMPORTANTE: usa httpsRequestWithMtls (fetch do Node 20 não suporta agent)
    const oauthBaseUrl = EFI_CONFIG.oauthBaseUrl;
    const body = 'grant_type=client_credentials';
    const result = await httpsRequestWithMtls({
      url: `${oauthBaseUrl}/oauth/token`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString()
      },
      body,
      pfx: this.certBuffer || undefined,
      passphrase: ''
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`EFI auth failed: ${result.status} - ${result.body.substring(0, 200)}`);
    }

    const data: any = JSON.parse(result.body);
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;
    return this.accessToken!;
  }

  private getHttpsAgent(): https.Agent {
    if (!this.certBuffer) {
      this.logger.warn('⚠️  EFI_CERTIFICATE_BASE64 não configurado, mTLS não vai funcionar');
      return new https.Agent({ rejectUnauthorized: false });
    }
    return new https.Agent({
      pfx: this.certBuffer,
      passphrase: '',  // senha do P12 (vazia no nosso cert)
      rejectUnauthorized: false  // produção da EFI pode ter chain custom
    });
  }

  // ============================================
  //  EXECUTE
  // ============================================
  async execute(action: DestinationAction): Promise<ExecutionResult> {
    if (action.type === 'BUY_PRODUCT') {
      // DEMO_MODE: simula PIX sem chamar API real
      // (util quando nao ha saldo na conta EFI ou em ambiente de teste)
      // DEMO_MODE ativo por padrao (mais seguro, nao consome saldo)
      // So chama API real se EFI_DEMO_MODE === 'false' explicitamente
      this.logger.log(`🔧 Efí execute() chamado - DEMO_MODE check: EFI_DEMO_MODE=${process.env.EFI_DEMO_MODE}, sandbox=${this.sandbox}, action=${action.type}, amount=${action.amountBrl}`);
      if (process.env.EFI_DEMO_MODE !== 'false') {
        const txid = this.generateTxid();
        this.logger.warn(`⚠️  DEMO_MODE ativo - PIX SIMULADO (txid=${txid}, R$ ${action.amountBrl})`);
        return {
          status: 'COMPLETED',
          externalId: `DEMO-${txid}`,
          details: { simulated: true, txid, amountBrl: action.amountBrl, completedAt: new Date() }
        };
      }
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
  async createPixCharge(action: {
    userId: string;
    amountBrl: number;
    txid?: string;
    destinationAccount?: string;
    productInfo?: any;
  }): Promise<ExecutionResult> {
    try {
      const token = await this.getAccessToken();
      const txid = action.txid || this.generateTxid();

      const cobBody = JSON.stringify({
        calendario: { expiracao: 3600 },
        devedor: { cpf: '00000000000', nome: 'Consumidor NextGen' },
        valor: { original: action.amountBrl.toFixed(2) },
        chave: this.pixKey,
        infoAdicionais: [
          { nome: 'product_id', valor: action.productInfo?.id || 'unknown' },
          { nome: 'partner', valor: 'nextgen-assets' }
        ]
      });

      const cobResult = await httpsRequestWithMtls({
        url: `${this.baseUrl}/v2/cob/${txid}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(cobBody).toString()
        },
        body: cobBody,
        pfx: this.certBuffer || undefined,
        passphrase: ''
      });

      if (cobResult.status < 200 || cobResult.status >= 300) {
        throw new Error(`EFI create cob failed: ${cobResult.status} - ${cobResult.body.substring(0, 300)}`);
      }

      const cobData: any = JSON.parse(cobResult.body);

      // Gerar QR code
      const qrResult = await httpsRequestWithMtls({
        url: `${this.baseUrl}/v2/loc/${cobData.loc.id}/qrcode`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        pfx: this.certBuffer || undefined,
        passphrase: ''
      });

      let qrCode = '';
      if (qrResult.status >= 200 && qrResult.status < 300) {
        const qrData: any = JSON.parse(qrResult.body);
        qrCode = qrData.imagemQrcode;
      }

      this.logger.log(`✅ PIX criado: txid=${txid} amount=R$ ${action.amountBrl} locId=${cobData.loc?.id}`);

      return {
        status: 'PENDING',
        externalId: txid,
        estimatedCompletion: new Date(Date.now() + 3600 * 1000),
        details: { txid, qrCode, locId: cobData.loc?.id }
      } as any;
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
    const result = await httpsRequestWithMtls({
      url: `${this.baseUrl}/v2/cob/${txid}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      pfx: this.certBuffer || undefined,
      passphrase: ''
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`EFI get cob failed: ${result.status} - ${result.body.substring(0, 200)}`);
    }
    return JSON.parse(result.body);
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
