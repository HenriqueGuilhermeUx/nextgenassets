'use client';
import Link from 'next/link';

export default function VenderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-5xl mx-auto">
        <div className="inline-block bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
          🤝 3 públicos. 1 plataforma. Receita recorrente.
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Transforme cada compra em
          <br />
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            micro-investimento automático.
          </span>
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
          <strong>Lojas ganham mais clientes.</strong> <strong>Marketplaces ganham comissão.</strong> <strong>Consumidores ganham dinheiro.</strong>
          <br />
          Split de PIX nativo, Open Finance, AI orchestrator. Tudo em uma API.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/5511947984328?text=Quero+vender+NextGen+Assets"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            💬 Falar com vendas
          </a>
          <a
            href="https://app.nextgenassets.com.br"
            className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/20 transition-all"
          >
            Ver demo →
          </a>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">
          Como funciona <span className="text-amber-400">(em 30 segundos)</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '1', t: 'Cliente paga R$ 100', d: 'Na loja parceira (mercado, e-commerce, marketplace).' },
            { n: '2', t: 'Split automático', d: 'R$ 3 → NextGen (taxa). R$ 97 → Loja. R$ 0,50 → Woovi (gateway).' },
            { n: '3', t: 'Round-up investido', d: 'R$ 0,10 do troco vira micro-investimento em ação/fundo/cripto.' },
          ].map((s) => (
            <div key={s.n} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-5xl font-bold text-amber-400 mb-3">{s.n}</div>
              <h3 className="text-xl font-bold mb-2">{s.t}</h3>
              <p className="text-slate-300">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para Lojas (B2C-SMB) */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl p-8 md:p-12">
          <div className="text-amber-400 text-sm font-bold mb-2">🏪 PARA LOJAS</div>
          <h2 className="text-4xl font-bold mb-6">Pequenas e médias lojas</h2>
          <p className="text-xl text-slate-300 mb-8">
            Cada R$ 100 de venda = R$ 3 de comissão. <strong>Sem mensalidade, sem setup fee.</strong>
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-2xl mb-2">📈</div>
              <h4 className="font-bold mb-2">Mais clientes</h4>
              <p className="text-sm text-slate-300">Seu cliente ganha cashback (troco vira investimento). Volta mais vezes.</p>
            </div>
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="font-bold mb-2">AI vende por você</h4>
              <p className="text-sm text-slate-300">Orquestrador multi-agente sugere produtos pro cliente certo. +15% conversão.</p>
            </div>
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-bold mb-2">PIX split nativo</h4>
              <p className="text-sm text-slate-300">R$ 100 → R$ 97 pra você, R$ 3 pra NextGen. Tudo numa transação. Liquidação D+0.</p>
            </div>
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-2xl mb-2">🔌</div>
              <h4 className="font-bold mb-2">Integra em 1h</h4>
              <p className="text-sm text-slate-300">Plugin Shopify, WooCommerce, Mercado Livre, Nuvemshop, ou API REST.</p>
            </div>
          </div>
          <div className="text-center">
            <a
              href="https://wa.me/5511947984328?text=Lojista:+quero+integrar+NextGen"
              className="bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-amber-400 transition-all inline-block"
            >
              💬 Quero ser loja parceira
            </a>
          </div>
        </div>
      </section>

      {/* Para Marketplaces (B2B) */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-8 md:p-12">
          <div className="text-blue-400 text-sm font-bold mb-2">🛒 PARA MARKETPLACES</div>
          <h2 className="text-4xl font-bold mb-6">Plataformas com 10+ vendedores</h2>
          <p className="text-xl text-slate-300 mb-8">
            Ofereça round-up investido pra todos os teus vendedores. <strong>Você fica com 30% da comissão NextGen.</strong>
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-3xl mb-2">💰</div>
              <h4 className="font-bold mb-2">Receita recorrente</h4>
              <p className="text-sm text-slate-300">R$ 5-20/mês por vendedor ativo. MRR escalável.</p>
            </div>
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-3xl mb-2">🧠</div>
              <h4 className="font-bold mb-2">AI por seller</h4>
              <p className="text-sm text-slate-300">Orquestrador aprende padrões de cada vendedor. Recomenda preço, estoque, gatilhos.</p>
            </div>
            <div className="bg-black/30 rounded-xl p-5">
              <div className="text-3xl mb-2">🔄</div>
              <h4 className="font-bold mb-2">API white-label</h4>
              <p className="text-sm text-slate-300">SDK JS/PHP/Java. Webhook em 5min. Docs Swagger.</p>
            </div>
          </div>
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6 mb-6">
            <h4 className="font-bold mb-2">📊 Case de uso real:</h4>
            <p className="text-slate-200">
              Marketplace de 500 sellers × R$ 50k vendas/mês cada = R$ 750k MRR do marketplace (1.5% take rate).
              <br />
              <span className="text-amber-300">+ 30% da comissão NextGen = R$ 45k/mês extra (15% × R$ 100k × 30%).</span>
            </p>
          </div>
          <div className="text-center">
            <a
              href="https://wa.me/5511947984328?text=Marketplace:+quero+parceria+white-label"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-400 transition-all inline-block"
            >
              🤝 Quero white-label
            </a>
          </div>
        </div>
      </section>

      {/* Para Consumidores */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-3xl p-8 md:p-12">
          <div className="text-green-400 text-sm font-bold mb-2">💚 PARA CONSUMIDORES</div>
          <h2 className="text-4xl font-bold mb-6">Pessoas físicas</h2>
          <p className="text-xl text-slate-300 mb-8">
            Cada compra que tu faz rende dinheiro pra ti. <strong>Sem pensar. Sem esforço.</strong>
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-black/30 rounded-xl p-6">
              <h3 className="text-2xl font-bold mb-3 text-green-300">FREE</h3>
              <p className="text-3xl font-bold mb-2">R$ 0</p>
              <p className="text-slate-300 mb-4">3 micro-investimentos/mês</p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>✓ 3 triggers de round-up</li>
                <li>✓ 3 PIX recebidos/mês</li>
                <li>✓ Suporte por email</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-bold text-amber-300">PREMIUM</h3>
                <span className="text-xs bg-amber-500 text-slate-900 px-2 py-1 rounded font-bold">MAIS POPULAR</span>
              </div>
              <p className="text-3xl font-bold mb-2">R$ 19,90<span className="text-sm text-slate-400">/mês</span></p>
              <p className="text-slate-300 mb-4">Tudo ilimitado</p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>✓ Triggers ilimitados</li>
                <li>✓ PIX Automático (assinatura)</li>
                <li>✓ Open Finance (Pluggy)</li>
                <li>✓ AI Orchestrator personalizado</li>
                <li>✓ Suporte prioritário</li>
              </ul>
            </div>
          </div>
          <div className="text-center">
            <a
              href="https://app.nextgenassets.com.br"
              className="bg-green-500 text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-green-400 transition-all inline-block"
            >
              🚀 Começar grátis
            </a>
          </div>
        </div>
      </section>

      {/* Stack técnica */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">Stack técnica</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { tech: 'Woovi', desc: 'PIX IN/OUT + Split nativo' },
            { tech: 'Pluggy', desc: 'Open Finance (141 bancos)' },
            { tech: 'OpenAI', desc: 'AI multi-agent orchestrator' },
            { tech: 'NextGen Cron', desc: 'Auto-withdraw a cada 1h' },
          ].map((s) => (
            <div key={s.tech} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="font-bold text-amber-300 mb-1">{s.tech}</div>
              <div className="text-xs text-slate-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Pronto pra vender mais?
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          1 hora pra integrar. 24h pra começar a faturar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/5511947984328?text=Quero+vender+NextGen+Assets"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            💬 Falar com vendas
          </a>
          <Link
            href="/preco"
            className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/20 transition-all"
          >
            Ver preços →
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Resposta em até 4h. Demo gratuita. Onboarding white-glove.
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-slate-500 text-sm border-t border-white/5">
        <p>NextGen Assets © 2026 — Split PIX nativo. Open Finance. AI.</p>
        <p className="mt-2">
          <a href="/preco" className="hover:text-white">Preços</a> ·{' '}
          <a href="/vender" className="hover:text-white">Vender</a> ·{' '}
          <a href="https://app.nextgenassets.com.br" className="hover:text-white">App</a>
        </p>
      </footer>
    </div>
  );
}
