# 🎯 Catálogo COMPLETO de Gatilhos NextGen Assets

> **30+ gatilhos prontos** + os que podemos criar juntos

---

## 📊 Visão Geral por Categoria

| Categoria | Quantidade | Casos de uso |
|---|---|---|
| 💼 **Negócios / Vendas** | 8 | Compra, preço, meta, estoque, NPS |
| 🏦 **Financeiro / Open Finance** | 7 | Saldo, fatura, score, salary, sweep |
| 📅 **Tempo / Calendário** | 4 | Recorrente, aniversário, dia X, lembrete |
| 🌍 **Geolocalização / IoT** | 3 | GPS, sensor, dispositivo |
| 🤖 **AI / NLP** | 4 | Linguagem natural, sentimento, voz, imagem |
| 📱 **Social / Webhook** | 4 | Email, SMS, WhatsApp, evento externo |
| 🎮 **Gamificação / Lifestyle** | 3 | Streak, hábito, recompensa |

---

## 💼 NEGÓCIOS / VENDAS

### 1. `gatilho-compra` (✅ JÁ EXISTE)
**Lê saldo OF + paga automaticamente via split**

```
"Quando meu cliente tiver saldo > R$ 500, cobra R$ 100 dele via PIX"
```

| Provider | Open Finance (Klavi/Pluggy) |
|---|---|

---

### 2. `PRICE_DROP` (✅ existe)
**Monitora preço de produto/ação, compra quando cai**

```
"Compra ação PETR4 quando cair 5% em 7 dias"
```

| Fonte | Yahoo Finance, B3, CoinGecko |
|---|---|

---

### 3. `BUY_DIP_STOCK` (✅ existe)
**Compra na queda (média) de ação**

```
"Compra 100 ações da ITSA4 quando cair 3%"
```

---

### 4. `RESTOCK` (✅ existe)
**Monitora produto esgotado, avisa quando voltar**

```
"Me avise quando Nike Air Max voltar ao estoque"
```

---

### 5. `SCARCITY_BUY` (✅ existe)
**Compra quando estoque < X unidades**

```
"Compra PS5 quando tiver menos de 100 unidades"
```

---

### 6. `AUTO_BUY_ON_RESTOCK` (✅ existe)
**Compra automaticamente quando produto voltar**

```
"Compra automática do meu produto favorito no magazine X quando voltar"
```

---

### 7. `OPPORTUNITY_BUY` (✅ existe)
**Compra oportunidade (preço abaixo de média)**

```
"Compra USIM5 quando P/L < 8"
```

---

### 8. `DETACHMENT_BUY` (✅ existe)
**Compra no dia de detecção de proventos**

```
"Compra BBDC4 no dia do dividendo"
```

---

## 🏦 FINANCEIRO / OPEN FINANCE

### 9. `BALANCE_TRIGGER_BUY` (✅ existe)
**Dispara quando saldo bancário atinge valor**

```
"Quando saldo > R$ 5.000, transfere R$ 500 pra investimento"
```

---

### 10. `POST_BILLS_BUY` (✅ existe)
**Compra depois de pagar contas**

```
"Todo dia 5 (após pagar contas), compra R$ 200 em ações"
```

---

### 11. `SALARY_TRIGGER_BUY` (✅ existe)
**Compra ao receber salário**

```
"Quando detectar salário creditado, separa 20% pra investimento"
```

---

### 12. `BILL_AUTO_PAY` (✅ existe)
**Paga boleto automaticamente**

```
"Pagar boleto da NET de R$ 199 todo dia 10"
```

---

### 13. `ACCOUNT_SWEEP` (✅ existe)
**Varre saldo entre contas**

```
"Todo dia 1, transfere saldo > R$ 1.000 da conta corrente pra Nubank"
```

---

### 14. `EMERGENCY_FUND` (✅ existe)
**Reserva de emergência automática**

```
"Quando saldo livre > R$ 1.000, move R$ 200 pra reserva"
```

---

### 15. `CREDIT_SCORE_BOOST` (✅ existe)
**Aumenta score de crédito**

```
"Quando score subir 50 pontos, oferece crédito novo"
```

---

### 16. `ROUND_UP_PIX` (✅ existe)
**Arredonda PIX pra cima, investe o troco**

```
"Quando pagar PIX, arredonda pra R$ 10 e investe o troco"
```

---

### 17. `BALANCE_LOW` (NOVO) ⭐
**Avisa quando saldo tá baixo**

```
"Me avise no WhatsApp quando saldo da conta < R$ 100"
```

---

### 18. `CREDIT_CARD_LIMIT` (NOVO) ⭐
**Avisa quando limite do cartão tá acabando**

```
"Me avise quando limite disponível do cartão < R$ 500"
```

---

## 📅 TEMPO / CALENDÁRIO

### 19. `RECURRING_BUY` (✅ existe)
**Compra recorrente (mensal, semanal, dia X)**

```
"Compra R$ 200 em IVVB11 todo dia 15"
```

---

### 20. `BALANCE_DATE` (✅ existe)
**Compra em data específica**

```
"Compra R$ 500 em ações no dia 30/12 (13º)"
```

---

### 21. `SALARY` (✅ existe)
**Detecta crédito de salário**

```
"Quando detectar pagamento de salário, separa 30% pra investir"
```

---

### 22. `ANNIVERSARY_BONUS` (NOVO) ⭐
**Bônus de aniversário**

```
"No dia do aniversário do cliente, envia cupom de R$ 50 via WhatsApp"
```

---

### 23. `TIME_BASED_REMINDER` (NOVO) ⭐
**Lembrete em horário específico**

```
"Todo dia 1 às 8h, me lembra de pagar aluguel"
```

---

## 🌍 GEOLOCALIZAÇÃO / IoT

### 24. `GEO_TRIGGER` (NOVO) ⭐
**Dispara quando user entra em área**

```
"Quando entrar no shopping Iguatemi, manda cupom de R$ 20"
```

| Provider | Geolocation API, Google Maps |
|---|---|

---

### 25. `IOT_SENSOR` (NOVO) ⭐
**Dispara por sensor IoT**

```
"Quando sensor de movimento detectar presença, liga luz + manda PIX da conta de luz"
```

| Provider | MQTT, Webhooks, IFTTT |
|---|---|

---

### 26. `DEVICE_BATTERY` (NOVO) ⭐
**Avisa quando bateria do celular < 20%**

```
"Me avise quando meu celular < 20% e sugere carregador portátil na shop"
```

---

## 🤖 AI / NLP

### 27. `CUSTOM_NL` (✅ existe)
**Linguagem natural → gatilho**

```
"Me avise quando o dólar cair abaixo de R$ 5,00"
```

---

### 28. `AI_SENTIMENT_ALERT` (NOVO) ⭐
**Análise de sentimento em menções**

```
"Me avise quando aparecer menção negativa da minha marca no Twitter"
```

| Provider | OpenAI (GPT), HuggingFace |
|---|---|

---

### 29. `VOICE_COMMAND` (NOVO) ⭐
**Comando de voz (WhatsApp/Telegram)**

```
"Manda áudio 'paga 50 reais da conta de luz' e ele executa"
```

| Provider | Whisper, Google Speech |
|---|---|

---

### 30. `IMAGE_TRIGGER` (NOVO) ⭐
**Reconhecimento de imagem**

```
"Quando eu mandar foto da nota fiscal, salva no banco e categoriza despesa"
```

| Provider | OpenAI Vision, Google Vision |
|---|---|

---

## 📱 SOCIAL / WEBHOOK

### 31. `EMAIL_RECEIVED` (NOVO) ⭐
**Avisa quando recebe email importante**

```
"Me avise quando receber email do banco, corretora ou RH"
```

| Provider | Gmail API, IMAP |
|---|---|

---

### 32. `WHATSAPP_KEYWORD` (NOVO) ⭐
**Detecta palavra-chave em mensagem WhatsApp**

```
"Quando alguém mandar 'oi' no WhatsApp Business, responde com cardápio"
```

| Provider | Twilio, WhatsApp Business API |
|---|---|

---

### 33. `WEBHOOK_EXTERNAL` (NOVO) ⭐
**Recebe webhook de QUALQUER sistema**

```
"Quando Shopify notificar nova venda, cria cobrança com split"
```

---

### 34. `SOCIAL_MENTION` (NOVO) ⭐
**Menções em redes sociais**

```
"Me avise quando @minhamarca for mencionada no Twitter/Instagram"
```

| Provider | Twitter API, Instagram Graph |
|---|---|

---

## 🎮 GAMIFICAÇÃO / LIFESTYLE

### 35. `STREAK_HABIT` (NOVO) ⭐
**Streak de hábito (X dias seguidos)**

```
"Se eu treinar 5 dias seguidos, libera R$ 50 de cashback"
```

---

### 36. `GOAL_ACCUMULATION_BUY` (✅ existe)
**Compra pra atingir meta**

```
"Quando juntar R$ 5.000, compra uma viagem"
```

---

### 37. `IMPULSE_REWARD` (✅ existe)
**Recompensa por comportamento**

```
"Se não gastar com delivery por 7 dias, dá R$ 20 de bônus"
```

---

### 38. `VOLATILITY_HEDGE` (✅ existe)
**Hedge de volatilidade**

```
"Quando volatilidade do IBOV > 30%, compra dólar"
```

---

## 🆕 **GATILHOS NOVOS QUE VOU CRIAR AGORA:**

### 39. `GATILHO_PIX_RECEBIDO` ⭐
**Quando recebe PIX de alguém específico**

```
"Quando receber PIX do cliente João, marca a venda como paga"
```

---

### 40. `GATILHO_SUBSCRIPTION_VENCENDO` ⭐
**Avisa quando subscription está perto de vencer**

```
"Me avise 3 dias antes da subscription do cliente vencer"
```

---

### 41. `GATILHO_META_VENDAS` ⭐
**Bateu meta de vendas do mês**

```
"Quando vendedor bater R$ 10k no mês, dispara bônus de R$ 500"
```

---

### 42. `GATILHO_CLIENTE_INATIVO` ⭐
**Cliente sumiu**

```
"Cliente sem comprar há 30 dias, manda cupom de R$ 20"
```

---

### 43. `GATILHO_NPS_BAIXO` ⭐
**NPS baixo**

```
"Cliente deu NPS < 6, abre ticket no suporte e liga pra ele"
```

---

### 44. `GATILHO_CARRINHO_ABANDONADO` ⭐
**Carrinho abandonado**

```
"Cliente abandonou carrinho há 1h, manda cupom de 10%"
```

---

### 45. `GATILHO_NIVEL_ESTOQUE` ⭐
**Nível de estoque**

```
"Produto X < 5 unidades, compra mais do fornecedor"
```

---

## 🛠️ **Implementação**

Vou criar:
1. **Módulo genérico** `triggers-v2` que suporta TODOS esses tipos
2. **UI no Consumer** pra escolher/configurar
3. **Endpoint único** pra criar via linguagem natural
4. **Documentação** de cada um

---

## 📞 Próximos passos

1. Implementar os 7 NOVOS gatilhos marcados com ⭐
2. UI no Consumer (`/triggers/new`)
3. Catálogo visual com cards
4. Testar cada um
5. Documentar

**Vamos lá?** 🚀
