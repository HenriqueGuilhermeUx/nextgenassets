// ============================================
//  NEXTGEN INTEGRATION CONTROLLER
//  POST /v1/integration/process
// ============================================

import { Controller, Post, Get, Body, Logger, BadRequestException } from '@nestjs/common';
import { NextGenIntegrationService } from './nextgen-integration.service';

const logger = new Logger('NextGenIntegrationCtrl');

@Controller('v1/integration')
export class NextGenIntegrationController {
  constructor(private readonly service: NextGenIntegrationService) {}

  /**
   * Endpoint único de integração com qualquer app
   * Exemplo: smart-bot-staff chama este endpoint pra cobrar PIX
   */
  @Post('process')
  async process(@Body() body: any) {
    const { appId, appSecret, action, payload, userId, webhookUrl } = body;

    if (!appId || !appSecret || !action) {
      throw new BadRequestException('appId, appSecret e action são obrigatórios');
    }

    logger.log(`📥 [${appId}] action: ${action} | user: ${userId || 'n/a'}`);

    return this.service.process({
      appId,
      appSecret,
      action,
      payload: payload || {},
      userId,
      webhookUrl
    });
  }

  /**
   * POST /v1/integration/register-app
   * Registra um app externo pra usar a integração
   */
  @Post('register-app')
  async registerApp(@Body() body: any) {
    const { appId, appName, appSecret, webhookUrl, hmacSecret, allowedActions } = body;
    
    if (!appId || !appSecret) {
      throw new BadRequestException('appId e appSecret são obrigatórios');
    }

    // Salva no DB (em produção)
    // Por enquanto, hardcoded no service
    
    return {
      success: true,
      message: `App ${appId} registrado. Em produção, salvaria no DB.`,
      appId,
      appName,
      webhookUrl,
      allowedActions: allowedActions || ['create_charge', 'get_balance', 'connect_bank']
    };
  }

  /**
   * GET /v1/integration/apps
   * Lista apps registrados
   */
  @Get('apps')
  async listApps() {
    return {
      success: true,
      apps: [
        {
          appId: 'smart-bot-staff',
          appName: 'Smart Bot Staff',
          allowedActions: ['create_charge', 'create_subscription', 'get_balance', 'connect_bank'],
          status: 'active'
        }
      ]
    };
  }

  /**
   * Health check da integração
   */
  @Post('ping')
  async ping(@Body() body: any) {
    return {
      success: true,
      service: 'nextgen-integration',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      actions: [
        'create_charge',
        'create_subscription',
        'get_balance',
        'connect_bank',
        'list_charges',
        'cancel_subscription',
        'get_user_info',
        'check_limit'
      ]
    };
  }

  /**
   * Exemplo de payload pra testar
   */
  @Post('example')
  example(@Body() body: any) {
    return {
      appId: 'smart-bot-staff',
      appSecret: 'demo-secret',
      action: 'create_charge',
      userId: 'user-001',
      payload: {
        value: 10000,
        customer: {
          name: 'João Silva',
          taxID: '12345678900',
          phone: '+5511999999999'
        },
        sellerPixKey: 'henriquecampos66@gmail.com',
        comment: 'Venda smart-bot-staff'
      }
    };
  }
}
