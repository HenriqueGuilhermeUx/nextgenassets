// ============================================
// MERCADO LIVRE — detector de produto + preço
// ============================================
// Seletores atualizados em 2025
// Documentação: https://developers.mercadolivre.com.br/

(function() {
  'use strict';

  const SEL = {
    title: 'h1.ui-pdp-title, .item-title h1, h1[class*="title"]',
    priceMain: '.andes-money-amount[aria-label*="reais"], .ui-pdp-price__second-line .andes-money-amount',
    priceFraction: '.andes-money-amount__fraction',
    priceCents: '.andes-money-amount__cents',
    currency: '.andes-money-amount__currency-symbol',
    seller: '.ui-pdp-seller__header__title, [class*="seller"]',
    available: '.ui-pdp-buybox__quantity input, [data-testid*="available"]',
    breadcrumbCategory: '.andes-breadcrumb__item a'
  };

  // Converte "1.299,99" → 1299.99
  function parsePriceBRL(text) {
    if (!text) return null;
    const clean = text.replace(/[^\d,]/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }

  // Extrai dados do produto da página atual
  function detect() {
    const titleEl = document.querySelector(SEL.title);
    const priceFractionEl = document.querySelector(SEL.priceFraction);
    const priceCentsEl = document.querySelector(SEL.priceCents);

    if (!titleEl || !priceFractionEl) return null;

    const priceMain = priceFractionEl.textContent.trim();
    const priceCents = priceCentsEl ? priceCentsEl.textContent.trim() : '00';
    const priceText = `${priceMain},${priceCents}`;

    const priceBrl = parsePriceBRL(priceText);
    if (!priceBrl) return null;

    // Categoria via breadcrumb (ex: "Eletrônicos > Áudio > Fones")
    const breadcrumbItems = Array.from(document.querySelectorAll(SEL.breadcrumbCategory))
      .map(a => a.textContent.trim())
      .filter(Boolean);
    const category = breadcrumbItems[breadcrumbItems.length - 1] || null;

    return {
      marketplace: 'mercadolivre',
      url: window.location.href,
      title: titleEl.textContent.trim(),
      priceBrl,
      priceText,
      category,
      currency: 'BRL',
      detectedAt: new Date().toISOString()
    };
  }

  // Cria regra em linguagem natural baseada no produto
  function buildRule(detection) {
    const title = detection.title;
    const price = detection.priceBrl.toFixed(2);
    // dip 15% — se cair 15% desse preço, dispara compra
    const targetPrice = (detection.priceBrl * 0.85).toFixed(2);
    return `Comprar "${title}" (Mercado Livre) se o preço cair para R$ ${targetPrice} ou menos (preço atual R$ ${price}, queda de 15%)`;
  }

  // Expõe pro detector global
  window.NxtMercadoLivre = { detect, buildRule, parsePriceBRL };
})();
