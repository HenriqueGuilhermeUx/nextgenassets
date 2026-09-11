import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SmartOperationsService } from './smart-operations.service';

@Controller('smart-operations')
export class SmartOperationsController {
  constructor(private readonly service: SmartOperationsService) {}

  @Get('health')
  async health() {
    return this.service.health();
  }

  @Get('templates')
  async templates() {
    return this.service.templates();
  }

  @Post('inbox')
  async receiveDocument(@Body() body: any) {
    return this.service.receiveDocument(body || {});
  }

  @Get('inbox')
  async inbox(@Query('partnerSlug') partnerSlug = 'nextgen-assets', @Query('status') status?: string) {
    return this.service.inbox(partnerSlug, status);
  }

  @Post('documents/:id/confirm-action')
  async confirmAction(@Param('id') id: string, @Body() body: any) {
    return this.service.confirmAction(id, body || {});
  }

  @Get('products/lookup')
  async lookupProduct(@Query('code') code: string) {
    return this.service.lookupProduct(code);
  }

  @Post('products')
  async createProduct(@Body() body: any) {
    return this.service.createProduct(body || {});
  }

  @Get('products')
  async products(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    return this.service.products(partnerSlug);
  }

  @Get('dashboard')
  async dashboard(@Query('partnerSlug') partnerSlug = 'nextgen-assets') {
    return this.service.dashboard(partnerSlug);
  }

  @Post('ask')
  async ask(@Body() body: any) {
    return this.service.ask(body || {});
  }
}
