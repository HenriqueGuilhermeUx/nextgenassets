# Efi Open Finance - Conhecimento Completo

## Endpoints validados (testes 24/06/2026)

| Método | Path | Status |
|--------|------|--------|
| POST | /v1/oauth/token | ✅ FUNCIONA |
| GET | /v1/participantes | ✅ Retorna 69 participantes |
| POST | /v1/pagamentos-automaticos/adesao | ✅ Payload correto, 404 erro de cliente |

## OAuth2 (mTLS + Basic Auth)
```bash
POST https://openfinance.api.efipay.com.br/v1/oauth/token
Authorization: Basic base64(ClientId:ClientSecret)
Content-Type: application/json

{"grant_type": "client_credentials"}
```
Resposta: JWT com 15 escopos, expires_in=3600

## Estrutura pagador
```
{
  "idParticipante": "UUID do banco (NÃO ISPB!)",
  "cpf": "34198276870",
  "nome": "Nome completo"
}
```

## Estrutura PIX Automático Adesão
```json
{
  "pagador": {
    "idParticipante": "68308291-ec0d-4398-83ce-68b6b1087e49",
    "cpf": "34198276870",
    "nome": "Cliente NextGen"
  },
  "favorecido": {
    "contaBanco": {
      "conta": "12345",
      "agencia": "0001",
      "nome": "NextGen Assets",
      "documento": "61922930000197",
      "codigoBanco": "60701190",  // ISPB do banco
      "tipoConta": "CACC"
    }
  },
  "assinatura": {
    "configuracao": {
      "automatico": {
        "intervalo": "MENSAL",
        "dataInicio": "2026-07-01"
      }
    }
  }
}
```

## Header obrigatório
```
x-idempotency-key: <UUID>
```

## UUIDs dos principais participantes
- Itaú: 68308291-ec0d-4398-83ce-68b6b1087e49 (ISPB 60701190)
- Bradesco PF: 439a9b5c-2cfb-4e57-b60b-20eea83899ca (ISPB 60746948)
- Bradesco PJ: c6b15844-e748-4408-abb6-e71fd59d71c5
- Banco do Brasil: 75db457a-612d-4d62-b557-ba9d32b05216 (ISPB 00000000)
- Santander PF: aaacb9cf-e8c3-402b-93b8-cf4d3e2ec497 (ISPB 00000208)
- Santander PJ: 770f6211-dbd4-4c84-b6b1-9104b4a99359

## Erros comuns (todos resolvidos)
- mac verify failure: cert errado
- recurso_nao_encontrado: path errado
- parametro_ausente: pagador / favorecido / assinatura / x-idempotency-key
- campo_adicional_nao_permitido: campo extra não permitido
- parametro_invalido: idParticipante (ISPB em vez de UUID) ou codigoBanco
- "A configuração do cliente não foi encontrada": payload OK, cliente não tem PISP no banco

## Próximos passos
1. Testar com conta real do user no Itaú
2. Implementar webhook receiver para payment.completed
3. Configurar /v1/config com webhookUrl
