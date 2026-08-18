# NextGen Assets — Secrets Handling

This repository must never contain real production credentials.

## Never commit

- Provider AppID or API token
- Client ID and Client Secret
- Webhook secret
- Pix key used in production
- Certificate, `.p12`, `.pem`, `.key` or base64 certificate
- Database URL with real password
- JWT secret
- Admin token
- n8n credential
- Render, Netlify, Oracle or cloud access token

## Where secrets must live

Use only environment variables in the runtime provider:

- Render environment variables
- Netlify environment variables
- Oracle Cloud instance environment or vault
- n8n credentials store
- Secret manager/vault

## Safe example files

Example files may exist only with placeholders, such as:

```env
WOOVI_APP_ID=<set-in-render-or-secret-manager>
NEXTGEN_ADMIN_TOKEN=<set-in-render-or-secret-manager>
DATABASE_URL=<set-in-render-or-secret-manager>
```

Never put a real value in an `.example` file.

## Rotation rule

If a credential is committed once, consider it compromised forever.

Required response:

1. Revoke the leaked credential at the provider.
2. Generate a new credential.
3. Update the deployment environment variable.
4. Redeploy the affected service.
5. Remove the secret from the current repository state.
6. Review Git history and provider logs.

## Woovi current rule

`WOOVI_APP_ID` must be stored only in Render or a secret manager.

Do not paste it in:

- Chat
- GitHub
- Markdown docs
- Frontend files
- Example env files
- Screenshots
- Public issue comments

## Deployment checklist after rotating Woovi

Set these in the API runtime environment:

```env
WOOVI_API_URL=https://api.woovi.com
WOOVI_APP_ID=<new-provider-token>
WOOVI_EXPECTED_FEE_CENTS=51
NEXTGEN_PIX_COMMISSION_RATE=0
NEXTGEN_WOOVI_WEBHOOK_SECRET=<strong-secret>
NEXTGEN_ADMIN_TOKEN=<strong-secret>
```

Then redeploy the API with a clean build cache.

## Local development

Use a private local `.env` file ignored by Git. Do not upload it.

Run secret scanning before pushing when possible.
