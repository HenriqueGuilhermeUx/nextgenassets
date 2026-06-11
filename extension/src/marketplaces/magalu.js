// ============================================
// MAGAZINE LUIZA — detector de produto + preço
// ============================================

(function() {
  'use strict';

  const SEL = {
    title: 'h1[data-testid="product-title"], h1.product-title, h1',
    priceMain: '[data-testid="price-value"] .sc-kpDqfm, .price-template__content, [class*="price"] [class*="value"]',
    priceContainer: 'div[data-testid="price-value"]'
  };

  function parsePriceBRL(text) {
    if (!text) return null;
    const clean = text.replace(/[^\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }

  function detect() {
    const titleEl = document.querySelector(SEL.title);
    if (!titleEl) return null;

    // Magalu renderiza preço com classes hasheadas. Procura padrão "R$ X,XX"
    const allText = document.body.textContent;
    const match = allText.match(/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (!match) return null;

    const priceBrl = parsePriceBRL(match[0]);
    if (!priceBrl) return null;

    return {
      marketplace: 'magalu',
      url: window.location.href,
      title: titleEl.textContent.trim().substring(0, 200),
      priceBrl,
      priceText: match[0],
      currency: 'BRL',
      detectedAt: new Date().toISOString()
    };
  }

  function buildRule(detection) {
    const targetPrice = (detection.priceBrl * 0.85).toFixed(2);
    return `Comprar "${detection.title}" (Magalu) se o preço cair para R$ ${targetPrice} ou menos (atual R$ ${detection.priceBrl.toFixed(2)})`;
  }

  window.NxtMagalu = { detect, buildRule, parsePriceBRL };
})();
