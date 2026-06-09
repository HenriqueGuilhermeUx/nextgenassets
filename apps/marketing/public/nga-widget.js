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
            <button class="preset-btn" data-preset="OPPORTUNITY_BUY">
              <strong>🎯 Vantagem matemática</strong>
              <span>Preço alvo + CDI compensando</span>
            </button>
            <button class="preset-btn" data-preset="DETACHMENT_BUY">
              <strong>♻️ Desapego concretizado</strong>
              <span>Vende o antigo → compra o novo</span>
            </button>
            <button class="preset-btn" data-preset="SCARCITY_BUY">
              <strong>🔥 Escassez + margem</strong>
              <span>Estoque baixo E saldo OK</span>
            </button>
            <button class="preset-btn" data-preset="ROUND_UP_PIX">
              <strong>🪙 Arredondamento PIX</strong>
              <span>Troco do café vai pra ações</span>
            </button>
            <button class="preset-btn" data-preset="IMPULSE_REWARD">
              <strong>🏆 Recompensa do impulso</strong>
              <span>Não gastou em delivery? Ganha ação</span>
            </button>
            <button class="preset-btn" data-preset="VOLATILITY_HEDGE">
              <strong>⛈️ Para-raios do mercado</strong>
              <span>Ibovespa/IFIX caiu 3%+</span>
            </button>
            <button class="preset-btn" data-preset="ACCOUNT_SWEEP">
              <strong>🧹 Conta corrente limpa</strong>
              <span>Dia 28 varre sobra pra CDB</span>
            </button>
            <button class="preset-btn" data-preset="CREDIT_SCORE_BOOST">
              <strong>📈 Score de crédito</strong>
              <span>Paga fatura antes do fechamento</span>
            </button>
            <button class="preset-btn" data-preset="EMERGENCY_FUND">
              <strong>🛟 Reserva emergência</strong>
              <span>30% de receita extra vai pra reserva</span>
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
      conditions.push({ type: 'ACCUMULATE_WEEKLY', value: null, refField: 'weekly' }); else if (preset === 'RESTOCK') {
      html = `
        <div class="form-row">
          <label>Comprar quando voltar ao estoque (até R$ ${formatPrice(offer.price * 1.1)})</label>
        </div>`;
      conditions.push({ type: 'RESTOCK', value: true });
    } else if (preset === 'ROUND_UP_PIX') {
      html = `
        <div class="form-row">
          <label>Escolha o nível do arredondamento:</label>
          <select id="nga-tier" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            <option value="1">Nível 1: Clássico (arredonda pro R$ 10 mais próximo)</option>
            <option value="2">Nível 2: Turbinado (arredonda × 2)</option>
            <option value="3">Nível 3: Fixo (R$ 2,00 por compra)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Ativo de destino (ex: HGLG11, ITSA4)</label>
          <input type="text" id="nga-asset" value="HGLG11" placeholder="HGLG11">
        </div>
        <div class="form-row">
          <label>Mínimo acumulado pra disparar Pix (R$)</label>
          <input type="number" id="nga-min" value="10" step="0.01">
        </div>
        <div class="form-row" style="background:#f0fdf4;padding:10px;border-radius:8px;font-size:12px;color:#166534;">
          💡 O robô <strong>consolida</strong> todos os trocos do dia em <strong>1 único PIX</strong> às 23:55.
        </div>`;
      conditions.push({ type: 'ROUND_UP', value: null, refField: 'tier' });
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
    if (preset === 'ROUND_UP_PIX') {
      values.tier = parseInt(shadowRoot.getElementById('nga-tier').value);
      values.asset = shadowRoot.getElementById('nga-asset').value;
      values.min = parseFloat(shadowRoot.getElementById('nga-min').value);
    }
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
            preset,
            // Campos especificos do round-up
            tier: values.tier,
            destinationAsset: values.asset,
            minAccumulatedBrl: values.min
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
    // REGULATÓRIO: TODOS os 14 presets exigem Open Finance consent
    // (qualquer gatilho financeiro precisa ler dados do usuário)
    const scopes = getScopesForPreset(trigger.code);

    // Tela de "Revisão de Consentimento" (LGPD/BACEN compliant)
    modal.innerHTML = `
      <div class="nga-success">
        <div class="success-icon">🏦</div>
        <h2>Conecte seu banco</h2>
        <p>Para monitorar suas condições em tempo real, precisamos de acesso via <strong>Open Finance</strong> (regulamentado pelo Banco Central do Brasil).</p>

        <div style="text-align:left;background:#f9fafb;padding:14px;border-radius:10px;margin:14px 0;font-size:13px;">
          <div style="font-weight:600;margin-bottom:6px;">🔐 O que vamos acessar:</div>
          <ul style="margin:0 0 0 18px;line-height:1.6;color:#374151;">
            ${scopes.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <div style="text-align:left;background:#fef3c7;padding:12px;border-radius:10px;margin:0 0 14px;font-size:12px;color:#78350f;">
          <div style="font-weight:600;margin-bottom:4px;">🛡️ Seus direitos (LGPD + BACEN):</div>
          <ul style="margin:0 0 0 18px;line-height:1.5;">
            <li>Limite por transação: <strong>R$ 1.000</strong></li>
            <li>Limite por dia: <strong>R$ 3.000</strong></li>
            <li>Limite por mês: <strong>R$ 15.000</strong></li>
            <li>Expira em: <strong>12 meses</strong> (renovável)</li>
            <li><strong>Revogável</strong> a qualquer momento</li>
          </ul>
        </div>

        <div class="trigger-info">
          <code>Gatilho: ${escapeHtml(trigger.id)}</code>
        </div>

        <button class="btn-primary" data-action="consent" style="background:#16a34a;">
          ✅ Autorizar Open Finance
        </button>
        <button class="btn-secondary" data-action="close" style="margin-top:8px;">
          Mais tarde
        </button>
      </div>
    `;
    modal.querySelector('[data-action="consent"]').addEventListener('click', () => startOpenFinance(trigger, scopes));
    modal.querySelector('[data-action="close"]').addEventListener('click', closeModal);
  }

  // ============================================
  //  ESCOPOS DINAMICOS POR TIPO DE GATILHO
  // ============================================
  function getScopesForPreset(code) {
    const scopeMap = {
      'PRICE_DROP': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)',
        '📊 Histórico de transações (90 dias)'
      ],
      'OPPORTUNITY_BUY': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'DETACHMENT_BUY': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)',
        '📊 Histórico de transações (verificar venda)'
      ],
      'SCARCITY_BUY': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'BALANCE_DATE': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'SALARY': [
        '👁️ Consultar saldo da conta',
        '📊 Histórico de transações (detectar salário)',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'MATH_EDGE': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'SAVINGS': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'RESTOCK': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'ROUND_UP_PIX': [
        '👁️ Consultar saldo da conta',
        '📊 Histórico de transações do cartão (todos os gastos)',
        '💸 Enviar PIX diário (consolidador 23:55)',
        '🔁 Arredondar troco automaticamente'
      ],
      'IMPULSE_REWARD': [
        '👁️ Consultar saldo da conta',
        '📊 Histórico de transações (detectar delivery)',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'VOLATILITY_HEDGE': [
        '👁️ Consultar saldo da conta',
        '📈 Cotações em tempo real',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'ACCOUNT_SWEEP': [
        '👁️ Consultar saldo da conta',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'CREDIT_SCORE_BOOST': [
        '💳 Consultar fatura do cartão de crédito',
        '💸 Enviar PIX (pagar fatura automaticamente)'
      ],
      'EMERGENCY_FUND': [
        '👁️ Consultar saldo da conta',
        '📊 Histórico de receitas (detectar receita extra)',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ],
      'CUSTOM_NL': [
        '👁️ Consultar saldo da conta',
        '📊 Histórico de transações (90 dias)',
        '💸 Enviar PIX (até R$ 1.000 / transação)'
      ]
    };
    return scopeMap[code] || scopeMap['PRICE_DROP'];
  }

  // ============================================
  //  OPEN FINANCE CONSENT FLOW
  // ============================================
  async function startOpenFinance(trigger, scopes) {
    const modal = shadowRoot.querySelector('.nga-modal');
    modal.innerHTML = `
      <div class="nga-success">
        <div class="success-icon">🔄</div>
        <h2>Conectando seu banco...</h2>
        <p>Você será redirecionado pro site do banco.</p>
        <div class="loading-bar"></div>
      </div>
    `;

    try {
      // Cria consent na nossa API
      // Escopos técnicos baseados no que o usuário autorizou visualmente
      const technicalScopes = ['accounts.read', 'transactions.read', 'pix.send'];
      // Adiciona escopos específicos baseado nos escopos visuais selecionados
      if (scopes && scopes.some(s => s.includes('fatura'))) {
        technicalScopes.push('credit-cards.read');
      }
      if (scopes && scopes.some(s => s.includes('Cotações'))) {
        technicalScopes.push('market-data.read');
      }

      const response = await fetch(`${API_BASE}/v1/consents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({
          userId: config.userId,
          partnerId: config.partnerId,
          provider: 'efi',
          scopes: technicalScopes,
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao iniciar Open Finance');
      }

      const consent = await response.json();

      // Redireciona pro usuário autorizar no banco (sandbox Efí)
      // Em produção, isso vai pra tela real do banco
      // Em dev/sandbox, mostramos info
      if (consent.authorizationUrl) {
        window.open(consent.authorizationUrl, '_blank', 'width=600,height=700');
      }

      // Mostra tela de sucesso
      setTimeout(() => {
        modal.innerHTML = `
          <div class="nga-success">
            <div class="success-icon">✅</div>
            <h2>Conectado!</h2>
            <p>Seu gatilho está ativo. Vamos monitorar 24/7.</p>
            <div class="trigger-info">
              <code>Consent: ${escapeHtml(consent.consentId)}</code>
            </div>
            <button class="btn-primary" data-action="close">Fechar</button>
          </div>
        `;
        modal.querySelector('[data-action="close"]').addEventListener('click', closeModal);
      }, 1500);
    } catch (err) {
      modal.innerHTML = `
        <div class="nga-success">
          <div class="success-icon">⚠️</div>
          <h2>Erro ao conectar</h2>
          <p>${escapeHtml(err.message)}</p>
          <button class="btn-primary" data-action="close">Fechar</button>
        </div>
      `;
      modal.querySelector('[data-action="close"]').addEventListener('click', closeModal);
    }
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

      .loading-bar {
        height: 4px; background: linear-gradient(90deg, ${config.theme.primary}, #8b5cf6, ${config.theme.primary});
        background-size: 200% 100%; border-radius: 2px; margin: 20px 0;
        animation: loading 1.5s infinite;
      }
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
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
