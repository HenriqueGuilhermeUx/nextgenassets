'use client';
import Link from 'next/link';

export default function PrecoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-5xl mx-auto">
        <div className="inline-block bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
          ✨ NOVO: Round-up + AI Orchestrator + Extensão Chrome
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Invista o troco das suas compras.
          <br />
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Automaticamente.
          </span>
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Cada compra vira um micro-investimento. R$ 9,90 no café? R$ 0,10 vai pra sua carteira de ações.
          Sem pensar, sem esforço, sem taxa.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="https://app.nextgenassets.com.br"
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            Começar grátis →
          </Link>
          <a
            href="#pricing"
            className="border border-slate-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-800 transition"
          >
            Ver planos
          </a>
        </div>
        <p className="text-sm text-slate-400 mt-4">
          ✓ Sem cartão de crédito &nbsp; ✓ 3 gatilhos grátis &nbsp; ✓ Cancele quando quiser
        </p>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Step
            num="1"
            emoji="🔌"
            title="Conecta seu banco"
            desc="Open Finance oficial Bacen. Tu escolhe o valor máximo por mês (ex: R$ 50)."
          />
          <Step
            num="2"
            emoji="🛒"
            title="Compra no dia a dia"
            desc="Cada compra sua aciona um gatilho. A gente arredonda e investe o troco."
          />
          <Step
            num="3"
            emoji="📈"
            title="Carteira cresce sozinha"
            desc="R$ 0,10 aqui, R$ 0,50 ali. Em 1 ano pode ter R$ 500+ investido sem perceber."
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">Preço justo</h2>
        <p className="text-center text-slate-300 mb-12">Sem letras miúdas, sem taxa escondida</p>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
            <div className="text-sm text-slate-400 mb-1">Para experimentar</div>
            <h3 className="text-3xl font-bold mb-4">Free</h3>
            <div className="mb-6">
              <span className="text-5xl font-bold">R$ 0</span>
              <span className="text-slate-400">/sempre</span>
            </div>
            <ul className="space-y-3 mb-8">
              <Feature>3 gatilhos ativos</Feature>
              <Feature>3 PIX no mês</Feature>
              <Feature>Suporte por email</Feature>
              <Feature>App mobile</Feature>
              <Feature muted>Round-up consolidado</Feature>
              <Feature muted>AI insights mensais</Feature>
              <Feature muted>Volatility Hunter</Feature>
            </ul>
            <Link
              href="https://app.nextgenassets.com.br"
              className="block w-full text-center border border-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition"
            >
              Começar grátis
            </Link>
          </div>

          {/* Premium - destaque */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full">
              ⭐ MAIS POPULAR
            </div>
            <div className="text-sm text-green-300 mb-1">Para quem quer ir além</div>
            <h3 className="text-3xl font-bold mb-4">Premium</h3>
            <div className="mb-6">
              <span className="text-5xl font-bold">R$ 19,90</span>
              <span className="text-slate-400">/mês</span>
            </div>
            <ul className="space-y-3 mb-8">
              <Feature>Gatilhos ilimitados</Feature>
              <Feature>PIX ilimitado</Feature>
              <Feature>Pix Automático (Bacen)</Feature>
              <Feature>AI insights mensais</Feature>
              <Feature>Volatility Hunter (sniper)</Feature>
              <Feature>Suporte prioritário</Feature>
              <Feature>Round-up consolidado</Feature>
            </ul>
            <Link
              href="https://app.nextgenassets.com.br"
              className="block w-full text-center bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Assinar agora →
            </Link>
            <p className="text-xs text-center text-slate-400 mt-3">
              Cancele a qualquer momento. Sem fidelidade.
            </p>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-4">🔒 Segurança primeiro</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-green-400 font-bold mb-1">Open Finance</div>
              <div className="text-slate-400">Conexão oficial Bacen, regulada</div>
            </div>
            <div>
              <div className="text-green-400 font-bold mb-1">LGPD</div>
              <div className="text-slate-400">Tu controla seus dados</div>
            </div>
            <div>
              <div className="text-green-400 font-bold mb-1">Sem custódia</div>
              <div className="text-slate-400">PIX direto, sem intermediário</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Pronto pra começar?</h2>
        <Link
          href="https://app.nextgenassets.com.br"
          className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white px-10 py-4 rounded-lg font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
        >
          Criar conta grátis →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-slate-500 border-t border-slate-800">
        NextGen Assets · CNPJ XX.XXX.XXX/0001-XX · Open Finance regulado pelo Bacen
      </footer>
    </div>
  );
}

function Step({ num, emoji, title, desc }: { num: string; emoji: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 text-3xl mb-4">
        {emoji}
      </div>
      <div className="text-xs text-green-400 font-mono mb-2">PASSO {num}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Feature({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className={`flex items-start gap-2 text-sm ${muted ? 'text-slate-500' : 'text-slate-200'}`}>
      <span className={muted ? 'text-slate-600' : 'text-green-400'}>{muted ? '○' : '✓'}</span>
      <span>{children}</span>
    </li>
  );
}
