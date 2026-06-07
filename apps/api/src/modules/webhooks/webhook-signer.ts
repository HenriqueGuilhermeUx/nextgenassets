// ============================================
//  WEBHOOK SIGNER — HMAC-SHA256
// ============================================
// Assinatura de webhooks out pra garantir autenticidade

import { createHmac } from 'crypto';

export class WebhookSigner {
  /**
   * Assina um payload com HMAC-SHA256
   */
  static sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifica assinatura
   */
  static verify(payload: string, signature: string, secret: string): boolean {
    const expected = this.sign(payload, secret);
    return this.timingSafeEqual(expected, signature);
  }

  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }

  /**
   * Gera header de assinatura no formato do GitHub/Stripe
   */
  static generateHeader(payload: string, secret: string, timestamp: number = Date.now()): string {
    const signature = this.sign(`${timestamp}.${payload}`, secret);
    return `t=${timestamp},v1=${signature}`;
  }
}
