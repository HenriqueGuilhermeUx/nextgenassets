// Health check + root
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'orkest-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      mockAdapters: ['STOCK_BROKER', 'FUND_DISTRIBUTOR', 'CRYPTO_EXCHANGE', 'BANK_ACCOUNT', 'RETAILER'],
      triggerCatalog: 20
    };
  }

  @Get()
  root() {
    return {
      name: 'Orkest API',
      tagline: 'Motor de Automação Financeira Plug-and-Play',
      version: '1.0.0',
      docs: '/v1/health'
    };
  }
}
