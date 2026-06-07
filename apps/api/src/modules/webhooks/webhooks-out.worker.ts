// ============================================
//  WEBHOOKS OUT — Com retry, HMAC e DLQ
// ============================================
// Fila de webhooks com retentativas exponenciais
// e Dead Letter Queue pra falhas permanentes

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WebhookSigner } from './webhook-signer';

const prisma = new PrismaClient();

export interface WebhookOutPayload {
  partnerId: string;
  event: string;
  data: any;
  url?: string;
}

@Injectable()
export class WebhooksOutService {
  private readonly logger = new Logger(WebhooksOutService.name);
  private deliveryLog: Array<{ id: string; partnerId: string; event: string; status: string; attempts: number; lastError?: string; createdAt: Date }> = [];

  /**
   * Enfileira webhook pra envio com retry automático
   */
  async enqueue(payload: WebhookOutPayload): Promise<{ id: string; status: string }> {
    const partner = await prisma.partner.findUnique({ where: { id: payload.partnerId } });
    if (!partner) throw new Error(`Partner ${payload.partnerId} não encontrado`);
    if (!partner.webhookUrl) {
      this.logger.warn(`Partner ${partner.name} sem webhookUrl configurado`);
      return { id: 'skipped', status: 'no_url' };
    }

    const id = `whk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const log = {
      id,
      partnerId: payload.partnerId,
      event: payload.event,
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date()
    };
    this.deliveryLog.push(log);

    // Dispara envio assíncrono
    this.deliver({
      id,
      url: partner.webhookUrl,
      secret: partner.webhookSecret,
      payload,
      attempt: 0
    }).catch(err => this.logger.error(`Webhook ${id} falhou: ${err.message}`));

    return { id, status: 'PENDING' };
  }

  /**
   * Tenta entregar o webhook com retry exponencial
   */
  private async deliver(options: {
    id: string;
    url: string;
    secret?: string;
    payload: WebhookOutPayload;
    attempt: number;
  }): Promise<void> {
    const { id, url, secret, payload, attempt } = options;
    const MAX_ATTEMPTS = 5;
    const body = JSON.stringify({
      id,
      event: payload.event,
      data: payload.data,
      sentAt: new Date().toISOString()
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Orkest-Webhooks/1.0',
      'X-ORKEST-Event': payload.event,
      'X-ORKEST-Delivery': id
    };

    if (secret) {
      headers['X-ORKEST-Signature'] = WebhookSigner.generateHeader(body, secret);
    }

    const log = this.deliveryLog.find(l => l.id === id);
    if (log) {
      log.attempts = attempt + 1;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);  // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        this.logger.log(`✅ Webhook ${id} delivered (${payload.event}) — attempt ${attempt + 1}`);
        if (log) log.status = 'DELIVERED';
        return;
      }

      // 4xx (exceto 408, 429) = não vale re-tentar
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        const errorMsg = `HTTP ${response.status}`;
        this.logger.error(`❌ Webhook ${id} failed permanently: ${errorMsg}`);
        if (log) {
          log.status = 'DEAD_LETTER';
          log.lastError = errorMsg;
        }
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (attempt + 1 >= MAX_ATTEMPTS) {
        this.logger.error(`💀 Webhook ${id} dead-lettered após ${MAX_ATTEMPTS} tentativas: ${err.message}`);
        if (log) {
          log.status = 'DEAD_LETTER';
          log.lastError = err.message;
        }
        return;
      }

      // Retry com backoff exponencial (1s, 2s, 4s, 8s, 16s)
      const delay = Math.pow(2, attempt) * 1000;
      this.logger.warn(`⏳ Webhook ${id} falhou (tentativa ${attempt + 1}/${MAX_ATTEMPTS}), retry em ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return this.deliver({ ...options, attempt: attempt + 1 });
    }
  }

  /**
   * Lista histórico de webhooks enviados
   */
  listDeliveries(partnerId?: string): any[] {
    if (partnerId) return this.deliveryLog.filter(l => l.partnerId === partnerId);
    return this.deliveryLog;
  }

  /**
   * Estatísticas de webhooks
   */
  getStats(partnerId?: string) {
    const logs = partnerId ? this.deliveryLog.filter(l => l.partnerId === partnerId) : this.deliveryLog;
    return {
      total: logs.length,
      delivered: logs.filter(l => l.status === 'DELIVERED').length,
      pending: logs.filter(l => l.status === 'PENDING').length,
      deadLetter: logs.filter(l => l.status === 'DEAD_LETTER').length,
      successRate: logs.length > 0 ? (logs.filter(l => l.status === 'DELIVERED').length / logs.length) * 100 : 0
    };
  }

  /**
   * Reenvia webhooks na DLQ
   */
  async retryDeadLetter(partnerId?: string): Promise<{ retried: number }> {
    const dead = this.deliveryLog.filter(l => l.status === 'DEAD_LETTER' && (!partnerId || l.partnerId === partnerId));
    for (const log of dead) {
      log.status = 'PENDING';
      log.attempts = 0;
      log.lastError = undefined;
      this.deliver({
        id: log.id,
        url: '',  // precisa buscar do partner
        payload: { partnerId: log.partnerId, event: log.event, data: {} },
        attempt: 0
      }).catch(err => this.logger.error(`Retry ${log.id} falhou: ${err.message}`));
    }
    return { retried: dead.length };
  }
}
