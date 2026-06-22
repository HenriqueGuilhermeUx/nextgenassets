import { Controller, Post, Body } from '@nestjs/common';

@Controller('v1/integration')
export class IntegrationController {
  @Post('ping')
  ping() {
    return {
      success: true,
      service: 'nextgen-integration',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  @Post('test')
  test(@Body() body: any) {
    return {
      success: true,
      received: body,
      timestamp: new Date().toISOString()
    };
  }
}
