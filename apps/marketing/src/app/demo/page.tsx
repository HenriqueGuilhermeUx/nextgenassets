'use client';
import Script from 'next/script';
import { useEffect } from 'react';

export default function DemoPage() {
  useEffect(() => {
    // Inicializa o widget quando a página carrega
    if (typeof window !== 'undefined' && (window as any).NGAWidget) {
      (window as any).NGAWidget.init({
        apiKey: 'demo_key_widget',
        mode: 'auto',
        theme: { primary: '#5B6CFF', radius: 12 }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">N</div>
            <div>
              <div className="font-bold">Loja Demo NextGen</div>
              <div className="text-xs text-gray-500">Loja parceira com widget NextGen Assets</div>
            </div>
          </div>
          <a href="/" className="text-sm text-brand-500">← Voltar</a>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-500 to-purple-600 text-white py-3">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          🎯 <strong>Nova feature:</strong> Compre por gatilho! Configure condições e a gente compra pra você.
        </div>
      </div>

      {/* Widget script */}
      <Script src="/nga-widget.js" strategy="afterInteractive" />

      {/* Produtos */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Produtos em destaque</h1>
        <p className="text-gray-500 mb-8">Cada produto abaixo tem o widget NextGen Assets integrado. Clique em "Comprar por Gatilho" pra ver.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PRODUTO 1: Eletrônico (e-commerce) */}
          <div
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition"
            data-nga-offer-id="offer-demo-001"
            data-nga-title="Fone Bluetooth Sony WH-1000XM5"
            data-nga-price="1899.99"
            data-nga-sku="MLB123456789"
            data-nga-image="https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"
          >
            <div className="aspect-square bg-gray-100 relative">
              <img
                src="https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"
                alt="Fone Sony"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">EM ESTOQUE</span>
            </div>
            <div className="p-5">
              <span className="text-xs text-gray-500">Eletrônicos</span>
              <h3 className="font-bold text-lg mt-1 mb-2" data-nga-title>Fone Bluetooth Sony WH-1000XM5</h3>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-brand-500" data-nga-price>R$ 1.899,99</span>
                <span className="text-sm text-gray-400 line-through">R$ 2.499,99</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                <span>★★★★★</span>
                <span>(238 avaliações)</span>
              </div>
              <div className="text-xs text-brand-500 font-semibold mb-2">⚡ 3x mais conversões com gatilho</div>
            </div>
          </div>

          {/* PRODUTO 2: Streaming (subscription) */}
          <div
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition"
            data-nga-offer-id="offer-demo-002"
            data-nga-title="Netflix Premium 4 Telas"
            data-nga-price="55.90"
            data-nga-sku="SUB-NETFLIX-PREMIUM"
            data-nga-image="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400"
          >
            <div className="aspect-square bg-gradient-to-br from-red-600 to-red-800 relative flex items-center justify-center">
              <div className="text-white text-7xl font-black">N</div>
              <span className="absolute top-3 left-3 bg-yellow-400 text-red-900 text-xs font-bold px-2 py-1 rounded">PLANO 4K</span>
            </div>
            <div className="p-5">
              <span className="text-xs text-gray-500">Streaming</span>
              <h3 className="font-bold text-lg mt-1 mb-2" data-nga-title>Netflix Premium - 4 Telas 4K</h3>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-brand-500" data-nga-price>R$ 55,90</span>
                <span className="text-sm text-gray-400">/mês</span>
              </div>
              <div className="text-xs text-gray-600 mb-3">✓ 4 telas simultâneas ✓ Qualidade 4K ✓ Sem anúncios</div>
              <div className="text-xs text-brand-500 font-semibold mb-2">🎯 Assine automaticamente no dia do salário</div>
            </div>
          </div>

          {/* PRODUTO 3: Investimento (ação) */}
          <div
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition"
            data-nga-offer-id="offer-demo-003"
            data-nga-title="Ação ITSA4 (Itausa)"
            data-nga-price="10.45"
            data-nga-sku="STOCK-ITSA4"
            data-nga-image="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400"
          >
            <div className="aspect-square bg-gradient-to-br from-blue-600 to-indigo-700 relative flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-5xl font-black">ITSA4</div>
                <div className="text-sm mt-2 opacity-80">Itausa PN</div>
              </div>
              <span className="absolute top-3 right-3 bg-green-400 text-green-900 text-xs font-bold px-2 py-1 rounded">+2.3% HOJE</span>
            </div>
            <div className="p-5">
              <span className="text-xs text-gray-500">Investimento</span>
              <h3 className="font-bold text-lg mt-1 mb-2" data-nga-title>ITSA4 - Itausa PN (lote 100)</h3>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-brand-500" data-nga-price>R$ 10,45</span>
                <span className="text-sm text-green-600">+2.3%</span>
              </div>
              <div className="text-xs text-gray-600 mb-3">📊 100 ações = R$ 1.045,00</div>
              <div className="text-xs text-brand-500 font-semibold mb-2">💹 Compra se cair 5% e tiver saldo</div>
            </div>
          </div>
        </div>

        {/* CTA pro Admin */}
        <div className="mt-12 p-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Quer ver os gatilhos criados?</h2>
          <p className="mb-6 text-white/90">Acesse o painel admin pra ver os gatilhos em tempo real</p>
          <a
            href="https://admin.nextgenassets.com.br"
            className="inline-block bg-white text-brand-600 font-bold px-6 py-3 rounded-lg hover:shadow-lg transition"
          >
            Abrir Admin →
          </a>
        </div>

        {/* Como instalar */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-2xl font-bold mb-4">Como instalar no seu site</h2>
          <p className="text-gray-600 mb-4">3 linhas de código, igual Google Analytics:</p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
{`<!-- Cole no <head> do seu site -->
<script src="https://nextgenassets.com.br/nga-widget.js"></script>
<script>
  NGAWidget.init({
    apiKey: 'pk_live_xxxxxxxxxxxxx',
    mode: 'auto'
  });
</script>`}
          </pre>
          <p className="text-sm text-gray-500 mt-4">
            O widget detecta automaticamente produtos na sua página e injeta o botão "Comprar por Gatilho" em cada um.
          </p>
        </div>
      </main>
    </div>
  );
}
