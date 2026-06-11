// ============================================
// DETECTOR — orquestra todos os detectores
// ============================================
// Roda em cada página, tenta detectar produto+preço
// Injeta badge visual + escuta cliques no botão "Criar gatilho"

(function() {
  'use strict';

  // Helper: identifica qual marketplace tá ativo
  function getActiveMarketplace() {
    if (window.NxtMercadoLivre && window.location.hostname.includes('mercadolivre')) {
      return { name: 'mercadolivre', detector: window.NxtMercadoLivre };
    }
    if (window.NxtAmazon && window.location.hostname.includes('amazon')) {
      return { name: 'amazon', detector: window.NxtAmazon };
    }
    if (window.NxtMagalu && window.location.hostname.includes('magazineluiza')) {
      return { name: 'magalu', detector: window.NxtMagalu };
    }
    return null;
  }

  // Cria e injeta o badge visual
  function injectBadge(detection, rule) {
    // Remove badge antigo se existir
    const old = document.getElementById('nxt-badge');
    if (old) old.remove();

    const badge = document.createElement('div');
    badge.id = 'nxt-badge';
    badge.className = 'nxt-badge nxt-badge--floating';
    badge.innerHTML = `
      <div class="nxt-badge__header">
        <span class="nxt-badge__logo">⚡</span>
        <span class="nxt-badge__title">NextGen Assets</span>
        <button class="nxt-badge__close" id="nxt-badge-close">×</button>
      </div>
      <div class="nxt-badge__body">
        <div class="nxt-badge__row">
          <span class="nxt-badge__label">Produto:</span>
          <span class="nxt-badge__value" title="${detection.title}">${detection.title.substring(0, 50)}${detection.title.length > 50 ? '...' : ''}</span>
        </div>
        <div class="nxt-badge__row">
          <span class="nxt-badge__label">Preço atual:</span>
          <span class="nxt-badge__value nxt-badge__value--price">R$ ${detection.priceBrl.toFixed(2)}</span>
        </div>
        <div class="nxt-badge__row">
          <span class="nxt-badge__label">Marketplace:</span>
          <span class="nxt-badge__value">${detection.marketplace}</span>
        </div>
        <div class="nxt-badge__rule">📋 Regra: ${rule}</div>
        <button class="nxt-badge__action" id="nxt-create-trigger">🚀 Criar gatilho no NextGen</button>
        <div class="nxt-badge__status" id="nxt-status"></div>
      </div>
    `;
    document.body.appendChild(badge);

    // Event handlers
    document.getElementById('nxt-badge-close').addEventListener('click', () => badge.remove());
    document.getElementById('nxt-create-trigger').addEventListener('click', async () => {
      const status = document.getElementById('nxt-status');
      const btn = document.getElementById('nxt-create-trigger');
      btn.disabled = true;
      btn.textContent = '⏳ Criando...';
      status.textContent = '';

      const result = await window.NxtAPI.createTriggerFromDetection({
        ...detection,
        rule
      });

      if (result.ok) {
        status.className = 'nxt-badge__status nxt-badge__status--success';
        status.textContent = `✅ Gatilho criado! ID: ${result.trigger.id?.substring(0, 12)}...`;
        btn.textContent = '✅ Criado!';
        setTimeout(() => badge.remove(), 3000);
      } else if (result.error === 'NÃO_AUTENTICADO') {
        status.className = 'nxt-badge__status nxt-badge__status--error';
        status.textContent = '❌ Não autenticado. Clique no ícone da extensão e faça login.';
        btn.disabled = false;
        btn.textContent = '🚀 Criar gatilho no NextGen';
      } else {
        status.className = 'nxt-badge__status nxt-badge__status--error';
        status.textContent = `❌ Erro: ${result.error.substring(0, 100)}`;
        btn.disabled = false;
        btn.textContent = '🚀 Criar gatilho no NextGen';
      }
    });
  }

  // Espera a página carregar e tenta detectar
  function tryDetect() {
    const mkt = getActiveMarketplace();
    if (!mkt) return;

    // Espera 1.5s pra garantir que preços carregaram (SPAs demoram)
    setTimeout(() => {
      try {
        const detection = mkt.detector.detect();
        if (!detection) {
          console.log('[NextGen] Não detectou produto nesta página');
          return;
        }
        const rule = mkt.detector.buildRule(detection);
        console.log('[NextGen] Detectou:', detection);
        injectBadge(detection, rule);
      } catch (err) {
        console.error('[NextGen] Erro no detector:', err);
      }
    }, 1500);
  }

  // Re-detecta quando URL muda (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const old = document.getElementById('nxt-badge');
      if (old) old.remove();
      tryDetect();
    }
  }).observe(document, { subtree: true, childList: true });

  // Inicia
  if (document.readyState === 'complete') {
    tryDetect();
  } else {
    window.addEventListener('load', tryDetect);
  }
})();
