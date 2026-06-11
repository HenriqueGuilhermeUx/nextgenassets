// ============================================
// POPUP — login + listar gatilhos
// ============================================

import '../lib/api.js';

const els = {
  stateLogin: document.getElementById('state-login'),
  stateAuthed: document.getElementById('state-authed'),
  tokenInput: document.getElementById('token-input'),
  partnerSlugInput: document.getElementById('partner-slug-input'),
  loginBtn: document.getElementById('login-btn'),
  loginStatus: document.getElementById('login-status'),
  partnerName: document.getElementById('partner-name'),
  partnerSlugDisplay: document.getElementById('partner-slug-display'),
  logoutBtn: document.getElementById('logout-btn'),
  triggersList: document.getElementById('triggers-list')
};

// Helpers
function setStatus(el, msg, type) {
  el.textContent = msg || '';
  el.className = `status ${type ? 'status--' + type : ''}`;
}

async function showState() {
  const result = await window.NxtAPI.checkAuth();
  if (result.ok) {
    els.stateLogin.classList.add('hidden');
    els.stateAuthed.classList.remove('hidden');
    els.partnerName.textContent = result.partner.name;
    const slug = result.partner.slug;
    els.partnerSlugDisplay.textContent = `slug: ${slug}`;
    loadTriggers(result.partner);
  } else {
    els.stateLogin.classList.remove('hidden');
    els.stateAuthed.classList.add('hidden');
  }
}

async function loadTriggers(partner) {
  const { token } = await window.NxtAPI.getToken();
  try {
    const res = await fetch(`https://api.nextgenassets.com.br/v1/triggers?partnerId=${partner.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      els.triggersList.textContent = `Erro ao listar gatilhos (${res.status})`;
      return;
    }
    const triggers = await res.json();
    const list = Array.isArray(triggers) ? triggers : (triggers.triggers || []);
    if (list.length === 0) {
      els.triggersList.textContent = 'Nenhum gatilho ainda. Visite um marketplace!';
      return;
    }
    els.triggersList.innerHTML = list.slice(0, 10).map(t => `
      <div class="trigger">
        <div class="trigger__title">${escapeHtml(t.name || t.code || 'Gatilho')}</div>
        <div class="trigger__rule">${escapeHtml(t.naturalLanguageRule || '').substring(0, 100)}</div>
      </div>
    `).join('');
  } catch (err) {
    els.triggersList.textContent = `Erro: ${err.message}`;
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Event handlers
els.loginBtn.addEventListener('click', async () => {
  const token = els.tokenInput.value.trim();
  const partnerSlug = els.partnerSlugInput.value.trim() || 'demo-marketplace';
  if (!token) {
    setStatus(els.loginStatus, 'Cole um token', 'error');
    return;
  }
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = 'Conectando...';
  setStatus(els.loginStatus, '');

  await window.NxtAPI.setToken(token, partnerSlug);
  const result = await window.NxtAPI.checkAuth();
  if (result.ok) {
    setStatus(els.loginStatus, '✅ Conectado!', 'success');
    setTimeout(showState, 500);
  } else {
    setStatus(els.loginStatus, `❌ ${result.error}`, 'error');
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = 'Conectar';
  }
});

els.logoutBtn.addEventListener('click', async () => {
  await window.NxtAPI.clearToken();
  els.tokenInput.value = '';
  showState();
});

// Init
showState();
