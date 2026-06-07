// AI Controller
import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  // Traduz NL → regra estruturada
  @Post('translate-rule')
  async translate(@Body() body: { naturalLanguage: string; context?: any }) {
    return this.aiService.translateRule(body.naturalLanguage, body.context);
  }

  // Gera insights mensais
  @Post('monthly-insight')
  async monthlyInsight(@Body() body: { userId: string; month: string; data: any }) {
    return { insight: await this.aiService.generateMonthlyInsights(body.data) };
  }
}
