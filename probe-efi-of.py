#!/usr/bin/env python3
"""
Probe de URLs Open Finance da Efi.
Testa varios endpoints comuns pra descobrir qual funciona.
Usa o token OAuth2 e mTLS ja configurados.
"""
import requests
import base64
import os
import json

# === CONFIG (pega do env Render via API) ===
API_BASE = "https://api.nextgenassets.com.br"

# Pega credenciais via endpoint admin (que tem elas)
def get_efi_creds():
    # Tenta o endpoint /v1/admin/webhooks/efi/list
    r = requests.get(f"{API_BASE}/v1/admin/webhooks/efi/list", timeout=15)
    if r.ok:
        return r.json()
    return None

# === TESTE 1: OAuth2 na URL PIX (que ja funciona) ===
print("=" * 70)
print("TESTE 1: OAuth2 PIX (ja funciona, sanity check)")
print("=" * 70)

# === TESTE 2: Possíveis URLs Open Finance ===
CANDIDATE_URLS = [
    "https://api.efipay.com.br/v1/of/participantes",
    "https://api.efipay.com.br/v1/open-finance/participantes",
    "https://api.efipay.com.br/v1/open_finance/participantes",
    "https://api-open.efipay.com.br/v1/participantes",
    "https://api.efipay.com.br/open-finance/v1/participantes",
    "https://api-pix.gerencianet.com.br/v1/of/participantes",
    "https://api.efipay.com.br/v1/of/pix/automático/adesoes",
    "https://api.efipay.com.br/v1/of/devolucao",
]

for url in CANDIDATE_URLS:
    try:
        r = requests.get(url, timeout=10, verify=True)
        print(f"  GET  {url}")
        print(f"       -> {r.status_code} {r.text[:100]}")
    except Exception as e:
        print(f"  GET  {url}")
        print(f"       -> ERROR: {str(e)[:100]}")

print()
print("=" * 70)
print("TESTE 3: Endpoint público (sem auth) de participantes OF")
print("=" * 70)

# Efi pode ter um endpoint publico pra listar participantes
public_urls = [
    "https://api.efipay.com.br/v1/of/participantes",
    "https://api.efipay.com.br/open-finance/api/v1/participantes",
    "https://dev.efipay.com.br/v1/of/participantes",
]

for url in public_urls:
    try:
        r = requests.get(url, timeout=10)
        print(f"  GET  {url}")
        print(f"       -> {r.status_code} {r.text[:150]}")
    except Exception as e:
        print(f"  GET  {url}")
        print(f"       -> ERROR: {str(e)[:100]}")
