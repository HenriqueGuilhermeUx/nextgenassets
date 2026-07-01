import { Body, Controller, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

@Controller('company-billing/notifications/email')
export class SmartBillingEmailNotificationsController {
  @Post('send-test')
  async sendTest(@Body() body: any) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'NextGen Assets <noreply@nextgenassets.com.br>';
    const to = body.to || body.email || body.recipientEmail;
    const subject = body.subject || 'Aviso de pagamento NextGen';
    const message = body.message || 'Este é um teste de comunicação automática da NextGen.';

    if (!to || !String(to).includes('@')) {
      return {
        success: false,
        error: 'MISSING_EMAIL',
        message: 'Informe um e-mail válido em to, email ou recipientEmail.'
      };
    }

    if (!apiKey) {
      return {
        success: true,
        mode: 'mock-no-resend-key',
        provider: 'mock-email',
        message: 'RESEND_API_KEY não está configurada. O e-mail foi apenas simulado.',
        prepared: { from, to, subject, message }
      };
    }

    const delivery = await this.sendWithResend({ to, subject, message });
    return delivery;
  }

  @Post('process-pending')
  async processPending(@Body() body: any) {
    const apiKey = process.env.RESEND_API_KEY;
    const partnerSlug = body.partnerSlug || 'nextgen-assets';
    const dryRun = body.dryRun ?? false;
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

    const partner = await prisma.partner.upsert({
      where: { slug: partnerSlug },
      update: {},
      create: {
        slug: partnerSlug,
        name: 'NextGen Assets',
        type: 'FINTECH' as any,
        config: {},
        commissionRate: 0.03,
        tier: 'STARTER' as any
      } as any
    });

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM smart_billing_notifications
      WHERE partner_id = ${partner.id}
        AND channel = 'EMAIL'
        AND status = 'PENDING'
        AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      LIMIT ${limit}
    `;

    if (dryRun) {
      return {
        success: true,
        mode: 'dry-run',
        message: 'Simulação: e-mails pendentes prontos para envio.',
        count: rows.length,
        emails: rows.map((row) => ({
          id: row.id,
          to: row.recipient_ref,
          subject: this.subjectFor(row),
          message: row.message
        }))
      };
    }

    if (!apiKey) {
      return {
        success: false,
        error: 'MISSING_RESEND_API_KEY',
        message: 'RESEND_API_KEY não está configurada no Render.',
        count: rows.length
      };
    }

    const processed: any[] = [];
    for (const row of rows) {
      const to = String(row.recipient_ref || '').trim();
      if (!to || !to.includes('@')) {
        await this.updateNotification(row.id, 'FAILED', 'resend', null, 'E-mail do destinatário ausente ou inválido.');
        processed.push({ id: row.id, success: false, error: 'INVALID_EMAIL', to });
        continue;
      }

      const delivery = await this.sendWithResend({
        to,
        subject: this.subjectFor(row),
        message: row.message
      });

      await this.updateNotification(
        row.id,
        delivery.success ? 'SENT' : 'FAILED',
        delivery.provider || 'resend',
        delivery.id || null,
        delivery.error || null
      );

      processed.push({
        id: row.id,
        to,
        success: delivery.success,
        provider: delivery.provider,
        mode: delivery.mode,
        providerMessageId: delivery.id || null,
        error: delivery.error || null
      });
    }

    return {
      success: true,
      mode: 'resend-live',
      message: 'Processamento de e-mails pendentes concluído.',
      count: processed.length,
      processed
    };
  }

  private async sendWithResend(input: { to: string; subject: string; message: string }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'NextGen Assets <noreply@nextgenassets.com.br>';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.message,
          html: this.html(input.message)
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          provider: 'resend',
          mode: 'live',
          id: data?.id || null,
          error: data?.message || data?.error || `HTTP ${response.status}`,
          raw: data
        };
      }

      return {
        success: true,
        provider: 'resend',
        mode: 'live',
        id: data?.id || `resend_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        message: 'E-mail enviado com sucesso.',
        raw: data
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'resend',
        mode: 'live',
        id: null,
        error: error.message || 'Falha ao enviar e-mail.'
      };
    }
  }

  private async updateNotification(id: string, status: string, provider: string, providerMessageId: string | null, error: string | null) {
    const deliveryLog = JSON.stringify({
      emailProcessor: true,
      processedAt: new Date().toISOString(),
      status,
      provider,
      providerMessageId,
      error
    });

    await prisma.$executeRawUnsafe(
      `UPDATE smart_billing_notifications
       SET status = $1,
           sent_at = CASE WHEN $1 = 'SENT' THEN now() ELSE sent_at END,
           provider = $2,
           provider_message_id = $3,
           raw_data = raw_data || $4::jsonb,
           updated_at = now()
       WHERE id = $5`,
      status,
      provider,
      providerMessageId,
      deliveryLog,
      id
    );
  }

  private subjectFor(row: any) {
    if (row.type === 'CHARGE_D_PLUS_1' || row.type === 'CHARGE_D_PLUS_5') return 'Pagamento pendente';
    if (row.type === 'CHARGE_D_MINUS_3' || row.type === 'CHARGE_D_MINUS_1') return 'Lembrete de pagamento';
    if (row.type === 'CHARGE_D_DAY') return 'Seu pagamento vence hoje';
    return row.title || 'Aviso de pagamento NextGen';
  }

  private html(message: string) {
    const safe = String(message || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    return `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0f172a">
        <div style="padding:24px;border-radius:18px;background:#0f172a;color:#fff">
          <div style="font-size:14px;opacity:.75">NextGen Assets</div>
          <h1 style="margin:8px 0 0;font-size:24px">Aviso de pagamento</h1>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-radius:18px;margin-top:16px">
          <p style="font-size:16px;line-height:1.6">${safe}</p>
        </div>
        <p style="font-size:12px;color:#64748b;margin-top:18px">
          Mensagem enviada pela plataforma tecnológica NextGen. Se você já realizou o pagamento, desconsidere este aviso.
        </p>
      </div>
    `;
  }
}
