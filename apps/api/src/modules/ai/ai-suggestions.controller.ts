// AI Suggestions Controller
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AiSuggestionsService } from './ai-suggestions.service';

@Controller('ai/suggestions')
export class AiSuggestionsController {
  constructor(private suggestions: AiSuggestionsService) {}

  // Sugere gatilhos pra um usuário
  @Get(':userId')
  async getSuggestions(@Param('userId') userId: string) {
    const profile = await this.suggestions.buildProfile(userId);
    const triggerSuggestions = await this.suggestions.suggestTriggers(userId);
    return {
      profile,
      suggestions: triggerSuggestions,
      riskProfile: this.suggestions.detectRiskProfile(profile)
    };
  }

  // Aplica uma sugestão (cria o gatilho)
  @Post(':userId/apply')
  async applySuggestion(@Param('userId') userId: string, @Body() body: { partnerId: string; suggestion: any }) {
    // Em produção, criaria o Trigger via Prisma
    return {
      applied: true,
      userId,
      partnerId: body.partnerId,
      triggerCode: body.suggestion.triggerCode,
      params: body.suggestion.suggestedParams,
      createdAt: new Date().toISOString()
    };
  }
}
