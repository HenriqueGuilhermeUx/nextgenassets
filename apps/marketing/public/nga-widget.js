/*!
 * NextGen Assets Widget v1.0
 * Embeddable em qualquer site parceiro
 * Uso: <script src="https://nextgenassets.com.br/nga-widget.js"></script>
 *      <script>NGAWidget.init({ apiKey: 'pk_xxx', mode: 'auto' });</script>
 */
(function() {
  'use strict';

  const VERSION = '1.0.0';
  const API_BASE = (function() {
    const s = document.currentScript;
    if (s && s.dataset.api) return s.dataset.api;
    if (typeof window !== 'undefined' && window.NGA_API_URL) return window.NGA_API_URL;
    return 'https://api.nextgenassets.com.br';
  })();

  // Auto-init se tiver data-nga-auto no <script>
  const _autoScript = document.currentScript;
  const _autoConfig = _autoScript && _autoScript.dataset.ngaAuto === 'true';

  // Estado global
  let config = null;
  let shadowHost = null;
  let shadowRoot = null;
  let modalOpen = false;

  // ============================================
  //  INIT
  // ============================================
  function init(userConfig) {
    config = Object.assign({
      apiKey: '',
      partnerId: 'demo-partner-001',
      userId: null, // gera automaticamente se nao fornecido
      mode: 'auto', // 'auto' | 'manual'
      theme: { primary: '#5B6CFF', radius: 8 },
      position: 'inline', // 'inline' | 'floating'
      language: 'pt-BR'
    }, userConfig || {});

    if (!config.userId) {
      config.userId = getOrCreateUserId();
    }

    if (!config.apiKey) {
      console.warn('[NGA Widget] apiKey não fornecido. Use: NGAWidget.init({ apiKey: "pk_xxx" })');
      return;
    }

    // Cria Shadow DOM host (isolamento de CSS)
    shadowHost = document.createElement('div');
    shadowHost.id = 'nga-widget-host';
    shadowHost.style.cssText = 'all: initial;';
    document.body.appendChild(shadowHost);
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    injectStyles();

    if (config.mode === 'auto') {
      autoDiscoverProducts();
    }

    console.log(`[NGA Widget v${VERSION}] initialized`);
  }

  // ============================================
  //  AUTO-DISCOVER: detecta produtos na página
  // ============================================
  function autoDiscoverProducts() {
    // Estratégia 1: data-attributes (recomendado)
    const products = document.querySelectorAll('[data-nga-offer-id]');
    products.forEach(el => injectButton(el));

    // Estratégia 2: schema.org Product
    const schemaProducts = document.querySelectorAll('[itemtype*="schema.org/Product"]');
    schemaProducts.forEach(el => injectButtonFromSchema(el));

    // Estratégia 3: se nenhum produto, injeta floating button
    if (products.length === 0 && schemaProducts.length === 0) {
      injectFloatingButton();
    }
  }

  function injectButtonFromSchema(el) {
    const name = el.querySelector('[itemprop="name"]')?.textContent?.trim();
    const price = el.querySelector('[itemprop="price"]')?.getAttribute('content');
    const sku = el.querySelector('[itemprop="sku"]')?.textContent?.trim();
    const image = el.querySelector('[itemprop="image"]')?.getAttribute('src');
    if (name && price) {
      injectButton(el, { title: name, price: parseFloat(price), sku, image });
    }
  }

  function injectButton(target, offerData) {
    const data = offerData || {
      offerId: target.dataset.ngaOfferId,
      title: target.dataset.ngaTitle || target.querySelector('[data-nga-title]')?.textContent,
      price: parseFloat(target.dataset.ngaPrice || '0'),
      sku: target.dataset.ngaSku,
      image: target.dataset.ngaImage
    };
    if (!data.title || !data.price) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'nga-trigger-wrapper';
    wrapper.innerHTML = `
      <button class="nga-trigger-btn" data-action="open-modal">
        <span class="icon">🎯</span>
        <span>Comprar por Gatilho</span>
      </button>
    `;
    wrapper.querySelector('button').addEventListener('click', () => openModal(data));
    target.appendChild(wrapper);
  }

  function injectFloatingButton() {
    const btn = document.createElement('button');
    btn.className = 'nga-floating-btn';
    btn.innerHTML = '🎯 NextGen Assets';
    btn.addEventListener('click', () => openModal({
      title: document.title,
      price: 0,
      sku: 'unknown',
      offerId: null
    }));
    shadowRoot.appendChild(btn);
  }

  // ============================================
  //  MODAL: configuração da condição
  // ============================================
  function openModal(offer) {
    if (modalOpen) return;
    modalOpen = true;

    const modal = document.createElement('div');
    modal.className = 'nga-modal-backdrop';
    modal.innerHTML = `
      <div class="nga-modal">
        <button class="nga-close" data-action="close">×</button>
        <header>
          <span class="badge">⚡ Automatize sua compra</span>
          <h2>${escapeHtml(offer.title)}</h2>
          <div class="price">R$ ${formatPrice(offer.price)}</div>
        </header>

        <section>
          <h3>Escolha a condição pra executar</h3>

          <div class="preset">
            <button class="preset-btn" data-preset="PRICE_DROP">
              <strong>📉 Se o preço cair</strong>
              <span>Compra quando ficar mais barato</span>
            </button>
            <button class="preset-btn" data-preset="BALANCE_DATE">
              <strong>💰 Por saldo + data</strong>
              <span>Se tiver saldo no dia X</span>
            </button>
            <button class="preset-btn" data-preset="SALARY">
              <strong>💼 Por salário</strong>
              <span>Se cair salário este mês</span>
            </button>
            <button class="preset-btn" data-preset="SAVINGS">
              <strong>🐖 Acumulando</strong>
              <span>Guarda R$ X por semana até juntar</span>
            </button>
            <button class="preset-btn" data-preset="RESTOCK">
              <strong>🔄 Por restock</strong>
              <span>Quando voltar ao estoque</span>
            </button>
            <button class="preset-btn" data-preset="CUSTOM">
              <strong>✨ Custom (IA)</strong>
              <span>Descreva em português</span>
            </button>
          </div>

          <div class="form-area" id="nga-form-area"></div>
        </section>

        <footer>
          <button class="btn-secondary" data-action="close">Cancelar</button>
          <button class="btn-primary" data-action="submit" disabled>Configurar Gatilho</button>
        </footer>
      </div>
    `;

    shadowRoot.appendChild(modal);

    // Listeners
    modal.querySelector('[data-action="close"]').addEventListener('click', closeModal);
    modal.querySelector('[data-action="submit"]').addEventListener('click', () => submitTrigger(offer));
    modal.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => showPresetForm(btn.dataset.preset, offer));
    });
  }

  function showPresetForm(preset, offer) {
    const formArea = shadowRoot.getElementById('nga-form-area');
    const submitBtn = shadowRoot.querySelector('[data-action="submit"]');

    let html = '';
    let conditions = [];

    if (preset === 'PRICE_DROP') {
      html = `
        <div class="form-row">
          <label>Comprar se preço for menor que</label>
          <div class="input-group">
            <span>R$</span>
            <input type="number" id="nga-price" value="${Math.round(offer.price * 0.9)}" step="0.01">
          </div>
        </div>`;
      conditions.push({ type: 'PRICE_BELOW', field: 'priceBrl', value: null, refField: 'price' });
    } else if (preset === 'BALANCE_DATE') {
      html = `
        <div class="form-row">
          <label>Se saldo em conta for maior que</label>
          <div class="input-group">
            <span>R$</span>
            <input type="number" id="nga-balance" value="${Math.round(offer.price * 1.2)}" step="0.01">
          </div>
        </div>
        <div class="form-row">
          <label>No dia</label>
          <input type="date" id="nga-date" value="${nextMonth()}" min="${today()}">
        </div>`;
      conditions.push({ type: 'BALANCE_ABOVE', value: null, refField: 'balance' });
      conditions.push({ type: 'ON_DATE', value: null, refField: 'date' });
    } else if (preset === 'SALARY') {
      html = `
        <div class="form-row">
          <label>Se eu receber salário maior que</label>
          <div class="input-group">
            <span>R$</span>
            <input type="number" id="nga-salary" value="${Math.round(offer.price * 3)}" step="0.01">
          </div>
        </div>`;
      conditions.push({ type: 'INCOME_ABOVE', value: null, refField: 'salary' });
    } else if (preset === 'SAVINGS') {
      html = `
        <div class="form-row">
          <label>Guardar por semana</label>
          <div class="input-group">
            <span>R$</span>
            <input type="number" id="nga-weekly" value="50" step="0.01">
          </div>
        </div>
        <div class="form-row">
          <label>Até juntar o valor do produto (R$ ${formatPrice(offer.price)})</label>
        </div>`;
      conditions.push({ type: 'ACCUMULATE_WEEKLY', value: null, refField: 'weekly' });
    } else if (preset === 'RESTOCK') {
      html = `
        <div class="form-row">
          <label>Comprar quando voltar ao estoque (até R$ ${formatPrice(offer.price * 1.1)})</label>
        </div>`;
      conditions.push({ type: 'RESTOCK', value: true });
    } else if (preset === 'CUSTOM') {
      html = `
        <div class="form-row">
          <label>Descreva sua regra em português:</label>
          <textarea id="nga-nl" rows="3" placeholder="Ex: Compra esse fone se cair pra menos de R$ 800 e se eu tiver mais de R$ 2.000 na conta até o dia 20"></textarea>
        </div>`;
      conditions.push({ type: 'NATURAL_LANGUAGE', value: null, refField: 'nl' });
    }

    formArea.innerHTML = html;
    submitBtn.disabled = false;
    submitBtn.dataset.preset = preset;
    submitBtn.dataset.conditions = JSON.stringify(conditions);
  }

  async function submitTrigger(offer) {
    const submitBtn = shadowRoot.querySelector('[data-action="submit"]');
    const preset = submitBtn.dataset.preset;
    const conditions = JSON.parse(submitBtn.dataset.conditions);

    // Coleta valores
    const values = {};
    if (preset === 'PRICE_DROP') values.price = parseFloat(shadowRoot.getElementById('nga-price').value);
    if (preset === 'BALANCE_DATE') {
      values.balance = parseFloat(shadowRoot.getElementById('nga-balance').value);
      values.date = shadowRoot.getElementById('nga-date').value;
    }
    if (preset === 'SALARY') values.salary = parseFloat(shadowRoot.getElementById('nga-salary').value);
    if (preset === 'SAVINGS') values.weekly = parseFloat(shadowRoot.getElementById('nga-weekly').value);
    if (preset === 'CUSTOM') values.nl = shadowRoot.getElementById('nga-nl').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando gatilho...';

    try {
      // Cria o gatilho via API
      const response = await fetch(`${API_BASE}/v1/triggers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({
          partnerId: config.partnerId || 'demo-partner-001',
          userId: config.userId || this.getOrCreateUserId(),
          offerId: offer.offerId,
          offerTitle: offer.title,
          offerPriceBrl: offer.price,
          offerSku: offer.sku,
          offerImage: offer.image,
          code: preset === 'CUSTOM' ? 'CUSTOM_NL' : preset,
          name: `${offer.title} - ${preset}`,
          params: {
            conditions: conditions.map(c => ({ ...c, value: values[c.refField] })),
            logic: 'AND',
            preset
          }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'API error');
      }

      const trigger = await response.json();
      showSuccess(trigger);
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Configurar Gatilho';
    }
  }

  function showSuccess(trigger) {
    const modal = shadowRoot.querySelector('.nga-modal');
    modal.innerHTML = `
      <div class="nga-success">
        <div class="success-icon">✅</div>
        <h2>Gatilho criado!</h2>
        <p>Vamos monitorar e te avisar quando executar.</p>
        <div class="trigger-info">
          <code>${escapeHtml(trigger.id)}</code>
        </div>
        <button class="btn-primary" data-action="close">Fechar</button>
      </div>
    `;
    modal.querySelector('[data-action="close"]').addEventListener('click', closeModal);
  }

  function showError(msg) {
    const formArea = shadowRoot.getElementById('nga-form-area');
    if (formArea) {
      formArea.innerHTML = `<div class="error">⚠️ ${escapeHtml(msg)}</div>` + formArea.innerHTML;
    }
  }

  function closeModal() {
    const modal = shadowRoot.querySelector('.nga-modal-backdrop');
    if (modal) modal.remove();
    modalOpen = false;
  }

  // ============================================
  //  STYLES (Shadow DOM)
  // ============================================
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; font-family: -apple-system, system-ui, sans-serif; }

      .nga-trigger-wrapper { margin: 12px 0; }
      .nga-trigger-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 12px 20px; border: none; border-radius: ${config.theme.radius}px;
        background: linear-gradient(135deg, ${config.theme.primary}, #8b5cf6);
        color: white; font-size: 15px; font-weight: 600; cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .nga-trigger-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(91, 108, 255, 0.3); }
      .nga-trigger-btn .icon { font-size: 18px; }

      .nga-floating-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 999999;
        padding: 14px 22px; border: none; border-radius: 999px;
        background: linear-gradient(135deg, ${config.theme.primary}, #8b5cf6);
        color: white; font-weight: 600; cursor: pointer; font-size: 14px;
        box-shadow: 0 8px 24px rgba(91, 108, 255, 0.4);
      }

      .nga-modal-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center; z-index: 9999999;
        padding: 20px;
      }
      .nga-modal {
        background: white; border-radius: 16px; max-width: 560px; width: 100%;
        max-height: 90vh; overflow-y: auto; padding: 28px; position: relative;
        box-shadow: 0 24px 48px rgba(0,0,0,0.2);
      }
      .nga-close {
        position: absolute; top: 16px; right: 16px;
        background: #f3f4f6; border: none; width: 32px; height: 32px;
        border-radius: 50%; cursor: pointer; font-size: 20px; color: #666;
      }
      .nga-modal header { margin-bottom: 24px; }
      .nga-modal .badge {
        display: inline-block; background: #f0f4ff; color: ${config.theme.primary};
        padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
      }
      .nga-modal h2 { font-size: 24px; margin: 12px 0 8px; color: #111; }
      .nga-modal .price { font-size: 28px; font-weight: 700; color: ${config.theme.primary}; }

      .nga-modal h3 { font-size: 16px; color: #111; margin: 20px 0 12px; }

      .preset { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
      .preset-btn {
        background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 10px;
        padding: 14px; text-align: left; cursor: pointer; transition: all 0.15s;
      }
      .preset-btn:hover { border-color: ${config.theme.primary}; background: #f0f4ff; }
      .preset-btn strong { display: block; font-size: 14px; color: #111; margin-bottom: 4px; }
      .preset-btn span { display: block; font-size: 12px; color: #6b7280; }

      .form-area { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
      .form-row { margin-bottom: 12px; }
      .form-row label { display: block; font-size: 13px; color: #374151; margin-bottom: 6px; font-weight: 500; }
      .form-row input, .form-row textarea {
        width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px;
        font-size: 14px;
      }
      .input-group { display: flex; align-items: center; gap: 8px; }
      .input-group span { color: #6b7280; font-size: 14px; }

      .nga-modal footer { display: flex; justify-content: flex-end; gap: 10px; }
      .btn-primary {
        background: ${config.theme.primary}; color: white; border: none;
        padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;
        font-size: 14px;
      }
      .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-secondary {
        background: transparent; color: #6b7280; border: 1px solid #d1d5db;
        padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;
        font-size: 14px;
      }

      .nga-success { text-align: center; padding: 40px 20px; }
      .success-icon { font-size: 64px; margin-bottom: 16px; }
      .nga-success h2 { font-size: 24px; color: #16a34a; margin-bottom: 12px; }
      .trigger-info { margin: 20px 0; padding: 12px; background: #f0fdf4; border-radius: 8px; }
      .trigger-info code { font-size: 12px; color: #166534; }

      .error { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
    `;
    shadowRoot.appendChild(style);
  }

  // ============================================
  //  HELPERS
  // ============================================
  function getOrCreateUserId() {
    // FIXO: usa o demo-user-001 (criado no seed do Supabase)
    // Em prod, deveria ser o ID do usuário logado no site parceiro
    return 'demo-user-001';
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function formatPrice(p) {
    return (p || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function today() { return new Date().toISOString().split('T')[0]; }
  function nextMonth() {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }

  // ============================================
  //  EXPORT
  // ============================================
  window.NGAWidget = { init, version: VERSION, open: openModal };

  // Auto-init: se o <script> tem data-nga-auto="true" e DOM ta pronto
  if (_autoConfig) {
    const tryAutoInit = () => {
      init({ apiKey: _autoScript.dataset.apiKey || 'demo', mode: 'auto' });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryAutoInit);
    } else {
      tryAutoInit();
    }
  }
})();
