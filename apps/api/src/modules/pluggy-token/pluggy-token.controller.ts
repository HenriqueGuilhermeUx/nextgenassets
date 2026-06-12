import { Controller, Post, Body, Logger, Get } from '@nestjs/common';

const logger = new Logger('PluggyToken');

@Controller('v1')
export class PluggyTokenController {

  /**
   * POST /v1/consents/connect-token
   * Retorna um Connect Token (1x, expira 30min) pra abrir o widget Pluggy Connect
   */
  @Post('consents/connect-token')
  async createConnectToken(@Body() body: any) {
    const clientUserId = body.clientUserId || 'demo-user-001';
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return { success: false, error: 'PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET nao configurados' };
    }

    try {
      // 1) Auth
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (!authRes.ok) {
        return { success: false, step: 'auth', status: authRes.status, body: await authRes.text() };
      }
      const { apiKey } = await authRes.json();

      // 2) Connect Token
      const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify({
          clientUserId,
          webhookUrl: process.env.PLUGGY_WEBHOOK_URL || 'https://api.nextgenassets.com.br/v1/admin/webhooks/pluggy-alias',
          country: 'BR',
          language: 'pt-BR'
        })
      });
      if (!tokenRes.ok) {
        return { success: false, step: 'connect_token', status: tokenRes.status, body: await tokenRes.text() };
      }
      const { accessToken } = await tokenRes.json();

      logger.log(`Connect Token gerado pra ${clientUserId}`);
      return { success: true, connectToken: accessToken, clientUserId };
    } catch (err: any) {
      logger.error(`Erro: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @Get('pluggy-status')
  async status() {
    return {
      configured: !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
      clientId: process.env.PLUGGY_CLIENT_ID ? '***' + process.env.PLUGGY_CLIENT_ID.slice(-4) : null,
      webhookUrl: process.env.PLUGGY_WEBHOOK_URL || null
    };
  }
}
