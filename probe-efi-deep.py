#!/usr/bin/env python3
"""
Probe mais profundo: testa com mTLS + POST nas URLs candidatas.
Tambem puxa a documentacao pra ver os endpoints reais.
"""
import requests
import os
import re

# Pega o P12 do Render (decodifica da env) via endpoint
# Vou usar o endpoint que ja existe pra testar PIX (sanity)

API_BASE = "https://api.nextgenassets.com.br"

# Sanity: confirmar que o endpoint PIX funciona
r = requests.get(f"{API_BASE}/health", timeout=10)
print(f"Health: {r.status_code}")

# Pega a doc de OF
print("\n=== Pegando documentacao OF ===")
doc_urls = [
    "https://dev.efipay.com.br/docs/api-pix/open-finance",
    "https://dev.efipay.com.br/docs/api-pix/pix-automatico",
    "https://dev.efipay.com.br/docs/api-pix/pix-por-biometria",
]

for url in doc_urls:
    try:
        r = requests.get(url, timeout=15)
        print(f"\nGET {url} -> {r.status_code}")
        # Procura endpoints na pagina
        if r.ok:
            endpoints = re.findall(r'/(v\d+|of|open-finance)[/\w-]*', r.text)
            unique = sorted(set(e for e in endpoints if len(e) > 3))[:20]
            print(f"  Endpoints encontrados: {unique}")
    except Exception as e:
        print(f"  ERROR: {e}")

# Tenta o endpoint de OAuth2 na nova URL
print("\n=== Testando OAuth2 em api.efipay.com.br ===")
r = requests.post(
    "https://api.efipay.com.br/oauth/token",
    headers={"Authorization": "Basic " + "dGVzdDp0ZXN0"},  # test:test
    data={"grant_type": "client_credentials"},
    timeout=10
)
print(f"POST /oauth/token -> {r.status_code}")
print(f"  body: {r.text[:300]}")
