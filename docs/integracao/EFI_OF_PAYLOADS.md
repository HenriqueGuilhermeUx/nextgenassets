# Efi Open Finance - Payloads e endpoints

## Endpoints confirmados (via teste empírico)

| Método | Path | Função |
|--------|------|--------|
| POST | /v1/oauth/token | OAuth2 (Basic Auth + cert mTLS) |
| POST | /v1/pagamentos/pix | PIX imediato (requer `pagador->idParticipante`) |
| POST | /v1/pagamentos-agendados/pix | PIX agendado |
| POST | /v1/pagamentos-automaticos/adesao | Adesão Pix Automático (consent) |
| POST | /v1/pagamentos-automaticos/pix | Pagamento automático |
| POST | /v1/pagamentos-biometria/vinculos | JWR enrollment |
| POST | /v1/pagamentos-biometria/pix | Pagamento biométrico |
| GET | /v1/participantes | Lista participantes OF |
| GET | /v1/config | Config da app |

## Paths GENÉRICOS que NÃO EXISTEM
- /v1/consent
- /v1/consents  
- /v1/payments
- /v1/enrollments
- /v1/payments/initiate

## Estrutura do pagador (testado)

```json
{
  "pagador": {
    "idParticipante": "ISPB do banco (8 dígitos)",
    "cpf": "34198276870"
  },
  "favorecido": {
    "idParticipante": "ISPB do banco",
    "cpf": "12345678901"
  }
}
```

ISPBs comuns:
- Itaú: 60701190
- Bradesco: 60746948
- Banco do Brasil: 00000000
- Caixa: 00360305
- Santander: 90400888
- Efi: 38244631 (?)

## Estrutura PIX Automático (adesao)
```json
{
  "data": {
    "pagador": { "cpf": "...", "nome": "..." },
    "favorecido": { "cpf": "...", "nome": "..." },
    "assinatura": {
      "valor": "100.00",
      "periodicidade": "MENSAL",
      "dataInicio": "2026-07-01"
    }
  }
}
```

## Erros comuns que vimos

| Mensagem | Significa |
|----------|-----------|
| `mac verify failure` | Cert mTLS errado |
| `recurso_nao_encontrado` | Path não existe (404) |
| `parametro_ausente: pagador` | Falta campo "pagador" no body |
| `parametro_ausente: pagador->cpf` | Falta cpf dentro de pagador |
| `parametro_ausente: pagador->idParticipante` | Falta ISPB do banco |
| `parametro_ausente: favorecido` | Falta favorecido |
| `parametro_ausente: assinatura` | Falta bloco assinatura (PIX Automático) |
| `parametro_ausente: valor` | Falta valor dentro de assinatura |
| `campo_adicional_nao_permitido: X` | Campo extra X não permitido |
| `parametro_invalido: X` | Campo X está com valor inválido |

## OAuth2
```bash
POST https://openfinance.api.efipay.com.br/v1/oauth/token
Authorization: Basic base64(ClientId:ClientSecret)
Content-Type: application/json

{"grant_type": "client_credentials"}
```

Resposta:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "gn.opb.automatic.consent.read gn.opb.automatic.consent.write..."
}
```

Token JWT contém 15 escopos se tudo OK.

## Erros que podem confundir

### URL Duplicada
```typescript
// BUG: oauthUrl JÁ tem path
const oauthUrl = 'https://openfinance.api.efipay.com.br/v1/oauth/token';
const path = '/v1/oauth/token';
new URL(oauthUrl + path); // = '/v1/oauth/token/v1/oauth/token' (404!)
```

Fix: detectar e remover duplicação
```typescript
const fullUrl = baseUrl.endsWith(opts.path) ? baseUrl : baseUrl + opts.path;
```

### cert mTLS via env var
- Render pode usar cert de env var diferente do .p12 local
- Sempre usar `efi-update-cert` pra trocar em runtime (não persiste após deploy)
- Após restart, reenviar cert
