import { Body, Controller, Post } from '@nestjs/common';

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

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: message,
          html: this.html(message)
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          provider: 'resend',
          mode: 'live',
          error: data?.message || data?.error || `HTTP ${response.status}`,
          raw: data
        };
      }

      return {
        success: true,
        provider: 'resend',
        mode: 'live',
        id: data?.id,
        message: 'E-mail enviado com sucesso.',
        raw: data
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'resend',
        mode: 'live',
        error: error.message || 'Falha ao enviar e-mail.'
      };
    }
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
