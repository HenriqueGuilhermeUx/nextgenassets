// ============================================
// API CLIENT — fala com o NextGen Assets API
// ============================================
// Usado pelos content scripts e popup
// Token fica em chrome.storage.local

const API_BASE = 'https://api.nextgenassets.com.br';

// Pega token salvo
async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['nxt_token', 'nxt_partner_slug'], (data) => {
      resolve({ token: data.nxt_token || null, partnerSlug: data.nxt_partner_slug || 'demo-marketplace' });
    });
  });
}

// Salva token
async function setToken(token, partnerSlug) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ nxt_token: token, nxt_partner_slug: partnerSlug }, resolve);
  });
}

// Limpa token (logout)
async function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['nxt_token', 'nxt_partner_slug'], resolve);
  });
}

// POST /v1/triggers — cria gatilho a partir de detecção
async function createTriggerFromDetection(detection) {
  const { token, partnerSlug } = await getToken();
  if (!token) {
    return { ok: false, error: 'NÃO_AUTENTICADO' };
  }
  try {
    const res = await fetch(`${API_BASE}/v1/triggers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Partner-Slug': partnerSlug
      },
      body: JSON.stringify({
        catalogCode: detection.catalogCode || 'BUY_DIP_STOCK',
        naturalLanguageRule: detection.rule,
        source: 'BROWSER_EXTENSION',
        sourceMetadata: {
          marketplace: detection.marketplace,
          url: detection.url,
          productTitle: detection.title,
          productPriceBrl: detection.priceBrl,
          detectedAt: new Date().toISOString()
        }
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${err.substring(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, trigger: data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// GET /v1/ai/translate-rule — usa IA pra transformar em regra estruturada
async function translateRule(naturalLanguage) {
  const { token } = await getToken();
  if (!token) return { ok: false, error: 'NÃO_AUTENTICADO' };
  try {
    const res = await fetch(`${API_BASE}/v1/ai/translate-rule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ naturalLanguage })
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, rule: data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// GET /v1/partners/me — verifica se token é válido
async function checkAuth() {
  const { token, partnerSlug } = await getToken();
  if (!token) return { ok: false, error: 'Sem token' };
  try {
    const res = await fetch(`${API_BASE}/v1/partners/slug/${partnerSlug}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const partner = await res.json();
    return { ok: true, partner };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Exporta pro contexto global (content script)
if (typeof window !== 'undefined') {
  window.NxtAPI = { getToken, setToken, clearToken, createTriggerFromDetection, translateRule, checkAuth };
}

// Exporta pro service worker (background)
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.NxtAPI = { getToken, setToken, clearToken, createTriggerFromDetection, translateRule, checkAuth, API_BASE };
}
