#!/usr/bin/env python3
"""
Testa os endpoints OF com auth real.
Pega token via nosso endpoint que ja tem mTLS funcionando.
"""
import requests

API_BASE = "https://api.nextgenassets.com.br"

# Pega o token real via nosso endpoint
# O webhook registrar ja tem mTLS funcionando
r = requests.get(f"{API_BASE}/v1/admin/webhooks/efi/list", timeout=15)
print(f"Lista webhooks: {r.status_code}")
print(f"  {r.text[:500]}")
print()

# Vou criar endpoint admin que mostra URLs que funcionam
# Testando o endpoint que ja existe:
r = requests.get(f"{API_BASE}/v1/admin/webhooks/efi/charge/NGA1781267815800YuSzK2eYXS", timeout=15)
print(f"Get charge (sanity mTLS OK): {r.status_code}")
print(f"  {r.text[:200]}")
print()

# Agora vou tentar os mesmos endpoints OF com mTLS
# Como nao temos o P12 aqui, vou chamar via nosso endpoint que tem
# Vou criar um probe no nosso API
