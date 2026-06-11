// ============================================
// AMAZON BR — detector de produto + preço
// ============================================

(function() {
  'use strict';

  const SEL = {
    title: '#productTitle, h1#title span, h1.a-size-large',
    priceMain: '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice',
    priceSymbol: '.a-price-symbol',
    priceWhole: '.a-price-whole',
    priceFraction: '.a-price-fraction',
    category: '#wayfinding-breadcrumbs_container ul li a, #nav-subnav a.nav-a'
  };

  function parsePriceBRL(text) {
    if (!text) return null;
    // Amazon BR usa formato "R$ 1.299,99" ou "1299.99"
    const clean = text.replace(/[^\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }

  function detect() {
    const titleEl = document.querySelector(SEL.title);
    const priceEl = document.querySelector(SEL.priceMain);

    if (!titleEl || !priceEl) return null;

    const priceBrl = parsePriceBRL(priceEl.textContent || priceEl.getAttribute('aria-label') || '');
    if (!priceBrl) return null;

    return {
      marketplace: 'amazon',
      url: window.location.href,
      title: titleEl.textContent.trim().substring(0, 200),
      priceBrl,
      priceText: priceEl.textContent.trim(),
      currency: 'BRL',
      detectedAt: new Date().toISOString()
    };
  }

  function buildRule(detection) {
    const targetPrice = (detection.priceBrl * 0.80).toFixed(2); // dip 20% Amazon
    return `Comprar "${detection.title}" (Amazon) se o preço cair para R$ ${targetPrice} ou menos (atual R$ ${detection.priceBrl.toFixed(2)})`;
  }

  window.NxtAmazon = { detect, buildRule, parsePriceBRL };
})();
