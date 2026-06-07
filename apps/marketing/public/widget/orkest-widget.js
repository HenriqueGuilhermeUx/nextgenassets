/*!
 * Orkest Widget v1.0
 * Snippet de integração para qualquer e-commerce
 *
 * Como usar (cole no <head> do site):
 *   <script src="https://widget.orkest.com.br/v1/orkest-widget.js"></script>
 *   <script>
 *     OrkestWidget.init({
 *       apiKey: 'pk_live_xxxxx',
 *       mode: 'auto',        // 'auto' detecta o produto da página
 *       theme: 'light',      // 'light' | 'dark'
 *       position: 'inline'   // 'inline' | 'modal' | 'floating'
 *     });
 *   </script>
 *
 * Ou via data attributes no botão custom:
 *   <div data-orkest-button
 *        data-orkest-sku="PERFUME_X"
 *        data-orkest-price="489"
 *        data-orkest-name="Perfume Importado X 100ml">
 *   </div>
 */
(function () {
  'use strict';

  const ORKEST_API = 'https://api.orkest.com.br/v1';
  const ORKEST_WIDGET_URL = 'https://widget.orkest.com.br';

  // Estado global
  let config = {
    apiKey: null,
    mode: 'auto',
    theme: 'light',
    position: 'inline',
    partnerId: null
  };

  let currentProduct = null;

  /**
   * Inicializa o widget
   */
  function init(options) {
    Object.assign(config, options);

    if (!config.apiKey) {
      console.error('[Orkest] apiKey é obrigatório');
      return;
    }

    // Injeta CSS
    injectStyles();

    // Modo AUTO: detecta produto e injeta botão
    if (config.mode === 'auto') {
      detectProduct();
    }

    // Modo DATA-ATTRIBUTE: procura divs com data-orkest-button
    document.querySelectorAll('[data-orkest-button]').forEach(el => {
      mountInlineButton(el);
    });

    // Expõe API pública
    window.OrkestWidget = Object.assign(window.OrkestWidget || {}, {
      init,
      setProduct,
      open
    });
  }

  /**
   * Detecta produto da página (Schema.org, Open Graph, meta tags)
   */
  function detectProduct() {
    let product = null;

    // 1. Schema.org Product (JSON-LD)
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        const item = Array.isArray(data) ? data.find(d => d['@type'] === 'Product') : data;
        if (item && item['@type'] === 'Product') {
          product = {
            sku: item.sku || item.mpn || item['@id'],
            name: item.name,
            price: typeof item.offers === 'object' ? item.offers.price : item.offers,
            currency: typeof item.offers === 'object' ? item.offers.priceCurrency : 'BRL',
            image: Array.isArray(item.image) ? item.image[0] : item.image,
            url: item.url || window.location.href
          };
        }
      } catch (e) { /* ignore */ }
    }

    // 2. Open Graph product
    if (!product) {
      const ogPrice = document.querySelector('meta[property="product:price:amount"]');
      const ogName = document.querySelector('meta[property="product:price:currency"]');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogPrice && ogTitle) {
        product = {
          name: ogTitle.getAttribute('content'),
          price: parseFloat(ogPrice.getAttribute('content')),
          currency: ogName ? ogName.getAttribute('content') : 'BRL',
          url: window.location.href
        };
      }
    }

    // 3. Variáveis JS comuns em e-commerces BR
    if (!product) {
      if (window.productData) product = window.productData;
      else if (window.ShopifyAnalytics?.meta?.product) product = window.ShopifyAnalytics.meta.product;
      else if (window.__NEXT_DATA__?.props?.pageProps?.product) product = window.__NEXT_DATA__.props.pageProps.product;
    }

    // 4. Fallback: procura padrões no DOM
    if (!product) {
      const priceEl = document.querySelector('[class*="price"]');
      const nameEl = document.querySelector('h1');
      if (priceEl && nameEl) {
        const priceText = priceEl.textContent || '';
        const priceMatch = priceText.match(/R?\$?\s*([\d.,]+)/);
        if (priceMatch) {
          product = {
            name: nameEl.textContent.trim().slice(0, 100),
            price: parseFloat(priceMatch[1].replace('.', '').replace(',', '.')),
            currency: 'BRL',
            url: window.location.href
          };
        }
      }
    }

    if (product) {
      setProduct(product);
    } else {
      console.warn('[Orkest] Produto não detectado automaticamente. Use OrkestWidget.setProduct().');
    }
  }

  /**
   * Define o produto manualmente
   */
  function setProduct(product) {
    currentProduct = {
      sku: product.sku || `manual-${Date.now()}`,
      name: product.name || 'Produto',
      price: parseFloat(product.price),
      currency: product.currency || 'BRL',
      image: product.image,
      url: product.url || window.location.href
    };

    // Injeta botão depois de "Comprar agora" se modo auto
    if (config.mode === 'auto') {
      injectAutoButton();
    }
  }

  /**
   * Tenta injetar o botão ao lado do "Comprar agora"
   */
  function injectAutoButton() {
    if (!currentProduct) return;

    // Padrões comuns de botão "Comprar"
    const selectors = [
      'button[name="add"]',
      'button[type="submit"][name="add"]',
      'input[type="submit"][name="add"]',
      '[class*="buy-now"]',
      '[class*="comprar"]',
      '#add-to-cart',
      '#comprar',
      'button:contains("Comprar")'
    ];

    let buyButton = null;
    for (const sel of selectors) {
      try {
        buyButton = document.querySelector(sel);
        if (buyButton) break;
      } catch (e) { continue; }
    }

    if (buyButton && buyButton.parentElement) {
      const container = document.createElement('div');
      container.id = 'orkest-widget-auto-mount';
      container.style.cssText = 'margin-top: 8px;';
      container.innerHTML = renderButton();
      buyButton.parentElement.insertBefore(container, buyButton.nextSibling);
    } else {
      // Fallback: floating button
      injectFloatingButton();
    }

    bindEvents();
  }

  /**
   * Renderiza HTML do botão
   */
  function renderButton() {
    return `
      <button type="button" id="orkest-trigger-btn" data-orkest-open
        style="
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(91, 108, 255, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s;
        "
        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 8px 20px rgba(91, 108, 255, 0.4)';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(91, 108, 255, 0.3)';"
      >
        <span style="font-size: 18px;">🎯</span>
        <span>Comprar por Gatilho Inteligente</span>
        <span style="background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">NOVO</span>
      </button>
      <p style="
        font-size: 11px;
        color: #6b7280;
        text-align: center;
        margin-top: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        💡 Pague quando puder — configurado pela sua realidade financeira
      </p>
    `;
  }

  /**
   * Floating button (fallback)
   */
  function injectFloatingButton() {
    if (document.getElementById('orkest-floating-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'orkest-floating-btn';
    btn.innerHTML = renderButton();
    btn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; max-width: 320px;';
    document.body.appendChild(btn);
    bindEvents();
  }

  /**
   * Monta botão inline em div data-orkest-button
   */
  function mountInlineButton(el) {
    const sku = el.getAttribute('data-orkest-sku');
    const price = parseFloat(el.getAttribute('data-orkest-price') || '0');
    const name = el.getAttribute('data-orkest-name') || 'Produto';
    if (!sku || !price) return;

    setProduct({ sku, price, name, url: window.location.href });
    el.innerHTML = renderButton();
    el.querySelector('#orkest-trigger-btn')?.addEventListener('click', open);
  }

  /**
   * Bind click events
   */
  function bindEvents() {
    document.querySelectorAll('[data-orkest-open]').forEach(btn => {
      btn.removeEventListener('click', open);
      btn.addEventListener('click', open);
    });
  }

  /**
   * Abre o modal de configuração
   */
  function open() {
    if (!currentProduct) {
      alert('Produto não detectado. Configure manualmente.');
      return;
    }

    // Cria iframe com a página de configuração
    const overlay = document.createElement('div');
    overlay.id = 'orkest-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: orkestFadeIn 0.2s ease-out;
    `;

    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      sku: currentProduct.sku,
      name: currentProduct.name,
      price: currentProduct.price.toString(),
      currency: currentProduct.currency || 'BRL',
      image: currentProduct.image || '',
      url: currentProduct.url,
      apiKey: config.apiKey
    });
    iframe.src = `${ORKEST_WIDGET_URL}/configure?${params.toString()}`;
    iframe.style.cssText = `
      width: 100%;
      max-width: 520px;
      height: 90vh;
      max-height: 720px;
      border: none;
      border-radius: 20px;
      background: white;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Fecha ao receber mensagem
    window.addEventListener('message', (e) => {
      if (e.data?.source === 'orkest-widget') {
        if (e.data.type === 'close') {
          overlay.remove();
        } else if (e.data.type === 'configured') {
          overlay.remove();
          showSuccessToast(e.data.message || 'Gatilho ativado! Você será notificado quando a compra for executada.');
        }
      }
    });

    // Fecha com ESC
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') overlay.remove();
    });
  }

  /**
   * Toast de sucesso
   */
  function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
      z-index: 99999999;
      animation: orkestSlideUp 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    toast.textContent = '✅ ' + message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  /**
   * Injeta CSS animations
   */
  function injectStyles() {
    if (document.getElementById('orkest-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'orkest-widget-styles';
    style.textContent = `
      @keyframes orkestFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes orkestSlideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @media (max-width: 600px) {
        #orkest-floating-btn { left: 12px !important; right: 12px !important; max-width: none !important; bottom: 12px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // Auto-init se data attributes presentes
  if (document.currentScript?.getAttribute('data-orkest-autoload') === 'true') {
    init({ apiKey: document.currentScript.getAttribute('data-orkest-key') });
  }
})();
