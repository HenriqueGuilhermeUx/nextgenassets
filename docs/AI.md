# AI Service — Documentação

> Como Orkest usa IA pra traduzir linguagem natural em regras estruturadas.

## O que faz

O AI Service recebe uma frase em português do usuário e gera um JSON determinístico que alimenta o Trigger Engine.

**Entrada (NL):**
> "Compra R$ 500 de ITUB4 se cair 2% em 7 dias, mas só se eu tiver mais de R$ 5.000 na conta"

**Saída (JSON):**
```json
{
  "ruleType": "BUY_DIP_STOCK",
  "destinationType": "STOCK_BROKER",
  "params": {
    "ticker": "ITUB4",
    "dipPct": 2,
    "windowDays": 7,
    "amountBrl": 500,
    "minBalance": 5000
  },
  "safetyLimits": { "maxAmountBrl": 500 },
  "explanation": "Compra R$ 500 de ITUB4 quando cair pelo menos 2% em 7 dias, se saldo > R$ 5.000",
  "warnings": [],
  "confidence": 0.97
}
```

## Como funciona

### 1. Schema estruturado (JSON Mode)

A IA é forçada a retornar EXATAMENTE o schema esperado via `response_format: json_schema`. Isso elimina "alucinação de formato" — a IA não pode inventar campos novos.

```typescript
const RULE_SCHEMA = {
  type: 'object',
  properties: {
    ruleType: { type: 'string', enum: ['BUY_DIP_STOCK', 'DCA_FUND', ...] },
    destinationType: { type: 'string', enum: [...] },
    params: { type: 'object' },
    safetyLimits: { type: 'object' },
    explanation: { type: 'string' },
    warnings: { type: 'array' },
    confidence: { type: 'number' }
  },
  required: ['ruleType', 'destinationType', 'params', 'explanation', 'confidence']
};
```

### 2. Model

Usamos **gpt-4o-mini** (ou **claude-haiku**) por:
- Suporte nativo a `json_schema` (Structured Outputs)
- Latência baixa (~500ms)
- Custo baixo (~$0.15 por 1M tokens input)
- Bom em português

### 3. System Prompt

O prompt instrui a IA a ser **conservadora** com valores:
- Se ambíguo, pedir confirmação
- Se perigoso (ex: alavancagem), marcar `requiresConfirmation: true`
- Se ilegal, bloquear
- Sempre extrair valores quando o usuário mencionar

### 4. Confiança

A IA retorna um score de 0-1. Se < 0.7, o gatilho entra como **PAUSED** com aviso, aguardando revisão do usuário.

### 5. Fallback

Se a OpenAI não estiver disponível (chave inválida, sem crédito), o serviço tem um fallback baseado em regex que detecta padrões simples ("queda", "todo dia", "todo mês").

## Insights Mensais

Além de traduzir regras, a IA gera **insumos mensais** pros consumidores:

```typescript
async generateMonthlyInsights(data: {
  userId: string;
  month: string;
  totalSpent: number;
  totalInvested: number;
  triggersExecuted: number;
  topCategories: { category: string; amount: number }[];
}): Promise<string>
```

**Exemplo de saída:**
> "Em junho você investiu R$ 1.247 automaticamente em 8 gatilhos diferentes. Sua compra de biscoito Z foi a mais frequente (4x). Continua firme no plano! 🍪"

## Custos

| Operação | Tokens | Custo médio |
|---|---|---|
| Tradução NL → JSON | ~400 input + 200 output | $0.0001 |
| Insight mensal | ~300 input + 150 output | $0.00008 |

Para 10k traduções/mês: **~$1 USD/mês**. Insignificante comparado ao take-rate.

## Privacidade

- Texto do usuário **não é armazenado** após a tradução
- Não usamos pra treinar modelos
- Compliance LGPD total

## Roadmap

- [ ] Suporte a Claude Haiku como alternativa
- [ ] Validação de valores absurdos (ex: usuário pede R$ 1M)
- [ ] Sugestão de melhorias na regra ("quer adicionar limite de gasto mensal?")
- [ ] Explicação visual da regra antes de ativar
