// ============================================
// BACKGROUND SERVICE WORKER (Manifest V3)
// ============================================
// Roda em background, escuta eventos, faz syncs
// Tem acesso a chrome.* APIs

importScripts('../lib/api.js'); // service worker não suporta ES modules direto

// Log de inicialização
console.log('[NextGen Background] Service worker started');

// Escuta instalação
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[NextGen] Extension installed:', details.reason);
  // Abre popup de boas-vindas no primeiro install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://nextgenassets.com.br/extension-welcome' });
  }
});

// Escuta mensagens do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NXT_DETECTION') {
    console.log('[NextGen] Detection from tab:', sender.tab?.id, message.data);
    // Aqui poderia disparar uma notificação ou abrir popup
  }
  if (message.type === 'NXT_GET_AUTH') {
    chrome.storage.local.get(['nxt_token', 'nxt_partner_slug'], (data) => {
      sendResponse({ token: data.nxt_token, partnerSlug: data.nxt_partner_slug });
    });
    return true; // indica resposta assíncrona
  }
});

// Alarme periódico pra revalidar token (a cada 6h)
chrome.alarms.create('nxt-revalidate', { periodInMinutes: 360 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'nxt-revalidate') {
    const result = await self.NxtAPI.checkAuth();
    if (!result.ok) {
      console.warn('[NextGen] Token inválido, limpando');
      await self.NxtAPI.clearToken();
    }
  }
});
