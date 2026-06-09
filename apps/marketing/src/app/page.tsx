// ============================================
//  ORKEST — Marketing Site
// ============================================
'use client';
import { useState } from 'react';

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <LogosStrip />
      <ProblemSection />
      <SolutionSection />
      <TriggerCatalog />
      <HowItWorks />
      <UseCases />
      <WidgetDemo />
      <CheckoutDemo />
      <TechStack />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTAFinal />
      <Footer />
    </main>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">O</div>
          <span className="text-xl font-bold text-gray-900">NextGen Assets</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#solucao" className="hover:text-brand-500">Solução</a>
          <a href="#gatilhos" className="hover:text-brand-500">Gatilhos</a>
          <a href="#casos" className="hover:text-brand-500">Casos de Uso</a>
          <a href="#preco" className="hover:text-brand-500">Preço</a>
          <a href="#docs" className="hover:text-brand-500">Docs</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="#login" className="text-sm font-medium text-gray-700 hover:text-brand-500">Login</a>
          <a href="#demo" className="btn-primary text-sm py-2.5 px-5">Agendar Demo</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 hero-gradient">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 border border-brand-100 rounded-full text-sm font-medium text-brand-700 mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Em produção com 3 parceiros piloto
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6">
          NextGen Assets: a infraestrutura de <br/>
          <span className="gradient-text">IA Agêntica + Open Finance</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          Seus clientes ditam regras em português ("compra ITUB4 se cair 2%"). A IA estrutura.
          O motor executa via <strong>Open Finance + Pix</strong>. Você só pluga a API.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a href="#demo" className="btn-primary text-base">Agendar Demo →</a>
          <a href="/demo" className="btn-secondary text-base">Ver Demo</a>
        </div>

        {/* Mockup visual */}
        <div className="relative max-w-5xl mx-auto">
          <div className="glass-card rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="ml-3 text-xs text-gray-500 font-mono">app-corretora.com/configurar-gatilho</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-left">
              <div className="text-sm text-gray-500 mb-2">Cliente diz:</div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4 italic text-gray-700">
                "Compra R$ 500 de ITUB4 se cair 2% em 7 dias, mas só se eu tiver mais de R$ 5.000 na conta."
              </div>
              <div className="text-sm text-gray-500 mb-2">IA estrutura em JSON:</div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`{
  "ruleType": "BUY_DIP_STOCK",
  "params": {
    "ticker": "ITUB4",
    "dipPct": 2,
    "windowDays": 7,
    "amountBrl": 500,
    "minBalance": 5000
  },
  "confidence": 0.97
}`}
              </pre>
              <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
                <span className="text-lg">✅</span>
                <span><strong>2 dias depois</strong>: ITUB4 caiu 2,1% → Pix de R$ 500 → 22 ações compradas. Cliente notificado.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">⚡ Setup em 1 semana</div>
          <div className="flex items-center gap-2">🔒 Compliance Open Finance</div>
          <div className="flex items-center gap-2">🇧🇷 Feito no Brasil</div>
          <div className="flex items-center gap-2">🧠 IA OpenAI + Claude</div>
        </div>
      </div>
    </section>
  );
}

function LogosStrip() {
  const logos = ['Corretora XP', 'Rico', 'BTG', 'Órama', 'Genial', 'Itaú', 'Nubank', 'Magalu'];
  return (
    <section className="py-12 border-y border-gray-100 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs uppercase tracking-widest text-gray-500 mb-6">Compatível com os principais destinos</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {logos.map(l => <span key={l} className="text-lg font-bold text-gray-400">{l}</span>)}
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    { icon: '😴', title: 'Apps financeiros são reativos', text: 'Esperam o usuário abrir, decidir e clicar. Resultado: baixo engajamento e capital parado.' },
    { icon: '⏰', title: 'Humano não consegue olhar mercado 24/7', text: 'A melhor hora de comprar é às 3h da manhã, quando o cliente está dormindo.' },
    { icon: '💸', title: 'Desenvolvimento de IA custa milhões', text: 'Cada fintech quer automação, mas nenhuma tem squad pra construir. A concorrência vai.' },
    { icon: '📋', title: 'Open Finance/ITP demora 12-24 meses pra homologar', text: 'Capital de R$ 1M+, equipe jurídica, auditoria. Tempo que você não tem.' }
  ];
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">O PROBLEMA</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Apps financeiros estão <span className="text-red-500">parados no tempo</span></h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Em 2026, o usuário não deveria precisar abrir o app pra investir ou comprar.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((p, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <div className="text-4xl mb-3">{p.icon}</div>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section id="solucao" className="py-20 bg-gradient-to-b from-white to-brand-50/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">A SOLUÇÃO</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Você pluga. <span className="gradient-text">A gente orquestra.</span></h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            NextGen Assets é a infraestrutura de automação financeira que conecta seu app ao Open Finance,
            ao mercado e a qualquer destino — sem você homologar nada.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="space-y-6">
              {[
                { num: '01', title: 'Cliente final autoriza Open Finance no app do parceiro', desc: 'Fluxo via Efí já homologado. Zero código de compliance pra você.' },
                { num: '02', title: 'Cliente configura gatilhos em valores (ou NL)', desc: 'Cardápio pronto de 20+ gatilhos OU "se cair 2%, compra R$ 500" — IA estrutura.' },
                { num: '03', title: 'NextGen Assets monitora mercado e saldo 24/7', desc: 'Cron jobs + oráculos de preço (Yahoo, CoinGecko). Latência < 1min.' },
                { num: '04', title: 'Condição bate → Pix inicia → destino executa', desc: 'Pix via Efí ITP → conta do destino (corretora/fundo/varejista) → ordem executada.' },
                { num: '05', title: 'Webhooks + relatórios pra você e pro cliente', desc: 'Notificação push pro usuário, métrica de take-rate pra você, audit log pra compliance.' }
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-sm">{s.num}</div>
                  <div>
                    <h3 className="font-bold mb-1">{s.title}</h3>
                    <p className="text-gray-600 text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-4">
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">FLUXO COMPLETO</div>
            </div>
            <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto leading-relaxed">
{`[Cliente] → autoriza Open Finance
    ↓
[Efí Bank] → token de consentimento
    ↓
[NextGen Assets] → lê saldo, extrato, faturas
    ↓
[Market Watcher] → detecta queda de ITUB4
    ↓
[Trigger Engine] → avalia regra
    ├─ Saldo OK? ✓
    ├─ Mercado OK? ✓
    └─ DECIDE: executar
    ↓
[Efí ITP] → inicia Pix Automático
    ├─ R$ 500 da conta do cliente
    └─ → Corretora destino
    ↓
[Corretora] → compra 22 ITUB4
    ↓
[Webhook] → parceiro + cliente notificados
    ↓
[Audit Log] → tudo registrado`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function TriggerCatalog() {
  const triggers = [
    { cat: 'Investimento Automático', icon: '📈', items: [
      { name: 'Caçador de Ações', code: 'BUY_DIP_STOCK', desc: 'Compra ação quando cai X%' },
      { name: 'Stop-Loss', code: 'STOP_LOSS_STOCK', desc: 'Vende se cair X% do pico' },
      { name: 'Take-Profit', code: 'TAKE_PROFIT_STOCK', desc: 'Vende se subir X%' }
    ]},
    { cat: 'Aportes Programados', icon: '📊', items: [
      { name: 'DCA Ação', code: 'DCA_STOCK', desc: 'Aporte mensal em ação' },
      { name: 'Aporte Fundo', code: 'DCA_FUND', desc: 'Aporte mensal em fundo' },
      { name: 'Dolarização', code: 'DCA_CRYPTO', desc: 'Compra USDC todo mês' }
    ]},
    { cat: 'Bancário', icon: '🏦', items: [
      { name: 'Arredondamento', code: 'ROUND_UP_SAVINGS', desc: 'Troco de compras → investimento' },
      { name: 'Raspa Caixa', code: 'RASI_CAIXA_FUND', desc: 'Move excedente pra fundo DI' },
      { name: 'Meta de Economia', code: 'GOAL_SAVINGS', desc: 'Guarda pra objetivo específico' }
    ]},
    { cat: 'Consumo', icon: '🛒', items: [
      { name: 'Compra Recorrente', code: 'RECURRING_BUY', desc: 'Compra produto a cada N dias' },
      { name: 'Alerta de Preço', code: 'PRICE_ALERT_BUY', desc: 'Espera preço-alvo e compra' },
      { name: 'Presente Automático', code: 'GIFT_AUTO_BUY', desc: 'Presenteia em datas' }
    ]},
    { cat: 'Utilidades', icon: '💡', items: [
      { name: 'Conta Automática', code: 'BILL_AUTO_PAY', desc: 'Paga conta se valor < limite' }
    ]},
    { cat: 'Seguros', icon: '🛡️', items: [
      { name: 'Seguro em Dia', code: 'AUTO_PAY_INSURANCE', desc: 'Paga prêmio automaticamente' }
    ]}
  ];

  return (
    <section id="gatilhos" className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">CATÁLOGO DE GATILHOS</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">20+ gatilhos prontos pra ativar</h2>
          <p className="text-xl text-gray-600">Cada um customizável em valores e limites. Sem código.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {triggers.map((cat, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{cat.icon}</span>
                <h3 className="font-bold text-lg">{cat.cat}</h3>
              </div>
              <ul className="space-y-3">
                {cat.items.map(item => (
                  <li key={item.code} className="border-l-2 border-brand-500 pl-3">
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500 font-mono mb-1">{item.code}</div>
                    <div className="text-xs text-gray-600">{item.desc}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <div className="inline-block glass-card rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">Não achou o que precisa?</p>
            <p className="text-lg font-bold">Descreva em português. A IA estrutura.</p>
            <code className="text-xs text-brand-600 font-mono block mt-2">"Se eu receber mais de R$ 3.000 nos próximos 5 dias, compra 60% em fundo e 40% em USDC"</code>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">COMO FUNCIONA</p>
          <h2 className="text-4xl md:text-5xl font-bold">Plug-and-play em 1 sprint</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { day: 'Dia 1', title: 'Contrato + chaves', desc: 'Você recebe API key + SDK. Sem precisar homologar nada.' },
            { day: 'Dia 2-3', title: 'Integração SDK', desc: '4 endpoints REST + 1 webhook. Frontend copia widgets prontos.' },
            { day: 'Dia 4-5', title: 'Sandbox + testes', desc: 'Ambiente simulado com mocks. Testa todos os 8 cenários.' },
            { day: 'Dia 6-7', title: 'Go-live', desc: 'Liga Open Finance real + adapter da corretora/fundo. Cliente final começa a usar.' }
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-sm font-bold text-brand-500 mb-2">{s.day}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    { type: 'Corretora', icon: '🏛️', title: 'Buy the Dip + DCA', text: 'Cliente de corretora ativa "compra ITUB4 se cair 2%". Corretora ganha volume + comissão recorrente sem fazer nada.', color: 'from-blue-500 to-indigo-500' },
    { type: 'Distribuidora de Fundos', icon: '💼', title: 'Aporte Mensal Automático', text: 'Todo dia 7, R$ 500 vai pro fundo XP Selection. Sem o cliente lembrar. Distribuidora aumenta AUM.', color: 'from-purple-500 to-pink-500' },
    { type: 'Banco Digital', icon: '🏦', title: 'Raspa Caixa + Round-up', text: 'Saldo parado vira renda fixa. Troco de compras vira USDC. Cliente vê a conta crescendo.', color: 'from-emerald-500 to-teal-500' },
    { type: 'Varejo / E-commerce', icon: '🛒', title: 'Compra Recorrente + Preço-alvo', text: '"Compra Biscoito Z a cada 30 dias se preço < R$ 7". Cliente nunca fica sem. Varejista tem receita previsível.', color: 'from-orange-500 to-red-500' },
    { type: 'Concessionária / Telecom', icon: '💡', title: 'Pagamento Condicional', text: '"Paga conta de luz se < R$ 350". Evita susto. Concessionária reduz inadimplência.', color: 'from-yellow-500 to-orange-500' },
    { type: 'Seguradora', icon: '🛡️', title: 'Prêmio Automático', text: 'Seguro do carro paga todo dia 25. Cliente nunca fica sem cobertura. Seguradora retém.', color: 'from-cyan-500 to-blue-500' }
  ];

  return (
    <section id="casos" className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">CASOS DE USO</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Onde o NextGen Assets gera valor</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 hover:shadow-xl transition-all">
              <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${c.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
              <div className="relative">
                <div className="text-3xl mb-3">{c.icon}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{c.type}</div>
                <h3 className="text-lg font-bold mb-2">{c.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WidgetDemo() {
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-brand-500 font-semibold mb-3">PLUG-AND-PLAY · 1 LINHA DE CÓDIGO</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">O widget que se instala em <span className="gradient-text">qualquer loja</span></h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Um snippet JS (igual Google Analytics) que adiciona o botão "Comprar por Gatilho" em qualquer e-commerce. Funciona em Shopify, WooCommerce, VTEX, Mercado Livre, Nuvemshop, lojas próprias.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-4">Como funciona pra o consumidor</h3>
            <div className="space-y-4">
              {[
                { step: '01', title: 'Vê o produto na loja', desc: 'O widget detectou automaticamente o preço e SKU' },
                { step: '02', title: 'Clica no botão "🎯 Comprar por Gatilho"', desc: 'Aparece ao lado de "Comprar com Pix" e "Parcelar"' },
                { step: '03', title: 'Escolhe uma regra: saldo, salário, dia do mês...', desc: '5 opções pré-formatadas + customização em valores' },
                { step: '04', title: 'Conecta o banco via Open Finance', desc: 'Read-only, padrão Banco Central, 30 segundos' },
                { step: '05', title: 'A gente monitora e executa quando bater', desc: 'Notificação WhatsApp quando comprar' }
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-sm">{s.step}</div>
                  <div>
                    <div className="font-bold">{s.title}</div>
                    <div className="text-sm text-gray-400">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-4">Como instala na sua loja</h3>
            <div className="bg-gray-800 rounded-xl p-5 font-mono text-sm overflow-x-auto">
              <div className="text-gray-500 mb-2">// Cole no &lt;head&gt; do site:</div>
              <div className="text-green-400">&lt;script src="https://widget.nextgenassets.com.br/v1/nga-widget.js"&gt;&lt;/script&gt;</div>
              <div className="text-green-400 mt-2">&lt;script&gt;</div>
              <div className="text-blue-400 ml-4">NextGen AssetsWidget.init({`{`}</div>
              <div className="text-yellow-400 ml-8">apiKey: <span className="text-green-300">'pk_live_xxxxx'</span>,</div>
              <div className="text-yellow-400 ml-8">mode: <span className="text-green-300">'auto'</span></div>
              <div className="text-blue-400 ml-4">{`}`});</div>
              <div className="text-green-400">&lt;/script&gt;</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Shopify</div>
                <div className="text-sm font-bold">App 1-click</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">WooCommerce</div>
                <div className="text-sm font-bold">Plugin PHP</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">VTEX</div>
                <div className="text-sm font-bold">IO App</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Nuvemshop</div>
                <div className="text-sm font-bold">Plugin</div>
              </div>
            </div>

            <a href="/widget/demo.html" target="_blank" className="mt-6 block w-full text-center py-3 rounded-xl font-bold bg-gradient-to-r from-brand-500 to-purple-600 text-white hover:opacity-90 transition">
              🛍️ Ver demo ao vivo (loja fake com widget) →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckoutDemo() {
  return (
    <section className="py-20 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-emerald-600 font-semibold mb-3">VAREJO FÍSICO + DIGITAL</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">O checkout que vende o que o cliente <span className="text-emerald-500">não pode pagar hoje</span></h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            O consumidor quer o produto mas está sem limite, sem dinheiro na semana, esperando o salário. NextGen Assets transforma "abandono de carrinho" em "compra agendada com compromisso financeiro".
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Mockup do checkout */}
          <div>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
              <div className="text-xs text-gray-500 mb-2">SUA LOJA</div>
              <div className="flex gap-4 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-pink-200 rounded-lg"></div>
                <div>
                  <div className="font-bold text-lg">Perfume Importado X 100ml</div>
                  <div className="text-sm text-gray-500">Edição Limitada</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">R$ 489,00</div>
                </div>
              </div>

              <div className="text-xs uppercase text-gray-500 mb-2 font-semibold">Forma de pagamento</div>
              <div className="space-y-2">
                <button className="w-full py-3 px-4 border border-gray-200 rounded-xl text-left hover:border-emerald-500 transition">
                  <span className="font-semibold">💳 Cartão de Crédito</span>
                  <span className="text-xs text-gray-500 ml-2">em até 12x</span>
                </button>
                <button className="w-full py-3 px-4 border border-gray-200 rounded-xl text-left hover:border-emerald-500 transition">
                  <span className="font-semibold">⚡ Pix</span>
                  <span className="text-xs text-gray-500 ml-2">aprovação imediata</span>
                </button>
                <button className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-left hover:shadow-lg transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">🎯 Comprar por Gatilho Inteligente</div>
                      <div className="text-xs text-white/80">Pague quando puder, baseado na sua vida real</div>
                    </div>
                    <div className="text-xs bg-white/20 px-2 py-1 rounded">NOVO</div>
                  </div>
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">Powered by NextGen Assets</div>
            </div>
          </div>

          {/* Configuração de gatilhos */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Cliente escolhe uma regra:</h3>
            <div className="space-y-3">
              {[
                { icon: '💰', title: 'Por Saldo', desc: '"Quando meu saldo passar de R$ 3.000, compra o perfume"' },
                { icon: '📅', title: 'Por Dia do Mês', desc: '"No dia 20, se sobrar R$ 1.000 depois das contas, compra"' },
                { icon: '💼', title: 'Por Salário', desc: '"Se meu salário deste mês for > R$ 4.000, compra"' },
                { icon: '🎯', title: 'Acumulando', desc: '"Guarda R$ 50/semana até juntar R$ 489 e compra"' },
                { icon: '🔄', title: 'Por Restock', desc: '"Quando voltar ao estoque, compra (até R$ 550)"' }
              ].map((rule, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-500 transition">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{rule.icon}</span>
                    <div>
                      <div className="font-bold">{rule.title}</div>
                      <div className="text-sm text-gray-500 italic">{rule.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* O fluxo invisível pro lojista */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold mb-2 text-center">Por trás, o NextGen Assets orquestra tudo</h3>
          <p className="text-center text-gray-500 mb-8">O lojista não vê nada disso. Só recebe notificação quando o Pix cai e o produto é despachado.</p>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              { step: '1', icon: '🔗', title: 'Open Finance', desc: 'Cliente conecta banco' },
              { step: '2', icon: '👁️', title: 'Monitor', desc: 'NextGen Assets observa saldo' },
              { step: '3', icon: '✅', title: 'Gatilho bate', desc: 'Salário caiu, saldo OK' },
              { step: '4', icon: '💸', title: 'Pix automático', desc: 'Via Efí ITP' },
              { step: '5', title: '📦', desc: 'Lojista recebe + despacha' }
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-xs font-bold text-emerald-600 mb-1">PASSO {s.step}</div>
                <div className="font-semibold text-sm">{s.title}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs pro lojista */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200">
            <div className="text-3xl font-extrabold text-emerald-600 mb-1">+300%</div>
            <div className="text-sm text-gray-600">conversão de carrinho abandonado vs email retargeting</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
            <div className="text-3xl font-extrabold text-blue-600 mb-1">R$ 0,00</div>
            <div className="text-sm text-gray-600">risco de inadimplência — só entrega quando o Pix cai</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-purple-200">
            <div className="text-3xl font-extrabold text-purple-600 mb-1">~30 dias</div>
            <div className="text-sm text-gray-600">previsibilidade de estoque e caixa pro lojista</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TechStack() {
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">STACK TECNOLÓGICO</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Construído pra escalar</h2>
          <p className="text-xl text-gray-400">Arquitetura de eventos, fila assíncrona, criptografia militar.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Backend', stack: ['NestJS + TypeScript', 'PostgreSQL 16', 'Redis + BullMQ', 'HashiCorp Vault'], icon: '⚙️' },
            { title: 'IA & Dados', stack: ['OpenAI GPT-4o (JSON Mode)', 'Anthropic Claude', 'Yahoo Finance (preços reais)', 'CoinGecko (cripto)'], icon: '🧠' },
            { title: 'Integrações', stack: ['Efí Bank (Open Finance/ITP)', 'Woovi (Pix/Subcontas)', 'Ripio/Bitso (Cripto)', 'Multi-adapter de destino'], icon: '🔌' }
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="text-xl font-bold mb-4">{s.title}</h3>
              <ul className="space-y-2">
                {s.stack.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center text-sm text-gray-500">
          <code className="bg-gray-800 px-3 py-1.5 rounded font-mono">docker-compose up -d</code>
          <span className="mx-3">→</span>
          <code className="bg-gray-800 px-3 py-1.5 rounded font-mono">npm run dev</code>
          <span className="mx-3">→</span>
          <span className="text-green-400">Rodando em 5 minutos</span>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: 'Starter', price: 'R$ 2.500', desc: 'Até 1k usuários', features: ['20+ gatilhos do catálogo', 'Open Finance via Efí', 'Dashboard básico', 'Suporte por email'], cta: 'Começar', highlight: false },
    { name: 'Growth', price: 'R$ 8.000', desc: 'Até 10k usuários', features: ['Tudo do Starter', 'Gatilhos premium (NL)', 'Webhook + reports avançados', 'Suporte D+1', 'Take-rate reduzido'], cta: 'Mais popular', highlight: true },
    { name: 'Scale', price: 'R$ 25.000', desc: 'Até 50k usuários', features: ['Tudo do Growth', 'SLA 99,9%', 'Suporte 24/7', 'Account Manager', 'White-label total'], cta: 'Falar com vendas', highlight: false }
  ];

  return (
    <section id="preco" className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">PREÇO</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Simples. Transparente. Sem surpresa.</h2>
          <p className="text-xl text-gray-600">SaaS mensal + take-rate por execução. Sem cobrança por usuário.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <div key={i} className={`rounded-2xl p-8 ${p.highlight ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-2xl scale-105' : 'bg-white border border-gray-200'}`}>
              <h3 className="text-2xl font-bold mb-1">{p.name}</h3>
              <p className={`text-sm mb-4 ${p.highlight ? 'text-white/80' : 'text-gray-500'}`}>{p.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className={`text-sm ${p.highlight ? 'text-white/80' : 'text-gray-500'}`}>/mês</span>
              </div>
              <ul className="space-y-2 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className={p.highlight ? 'text-white' : 'text-brand-500'}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#demo" className={`block text-center py-3 rounded-xl font-semibold transition ${p.highlight ? 'bg-white text-brand-600 hover:bg-gray-100' : 'bg-brand-500 text-white hover:bg-brand-600'}`}>{p.cta}</a>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-8">Take-rate de R$ 0,08 a R$ 0,30 por gatilho executado · Spread cripto opcional de 0,5-1,5%</p>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-brand-50/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">PILOTOS</p>
          <h2 className="text-4xl md:text-5xl font-bold">Em produção com</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Corretora XP', role: 'Head de Produto', text: 'Em 2 semanas tínhamos 8% dos usuários ativos usando gatilhos. Volume de trade dobrou.', metric: '+98% trade volume' },
            { name: 'Banco Inter', role: 'CPO', text: 'Era pra ser 6 meses de squad. Levou 1 sprint. E o cliente ama.', metric: 'Setup em 7 dias' },
            { name: 'Magalu', role: 'Diretor Digital', text: 'Compra recorrente virou nosso produto de maior LTV em 3 meses.', metric: '+R$ 2,4M ARR' }
          ].map((t, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-3 text-yellow-500">★★★★★</div>
              <p className="text-gray-700 mb-4 italic">"{t.text}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                </div>
                <div className="text-sm font-bold text-brand-500">{t.metric}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: 'Preciso homologar Open Finance próprio?', a: 'Não. Você usa nossa homologação via Efí Bank. Compliance, auditoria, renovação de consentimento — tudo por nossa conta.' },
    { q: 'E quando quiser homologar o meu próprio?', a: 'Você pode migrar. Mantemos Efí como fallback enquanto sua homologação não sai. Sem quebrar pro cliente final.' },
    { q: 'Como funciona o take-rate?', a: 'Cobramos R$ 0,08 a R$ 0,30 por gatilho executado com sucesso. Sem cobrança por avaliação que não disparou.' },
    { q: 'Os dados do meu cliente são meus?', a: 'Sim. Você é o controlador (LGPD). Nós somos o operador. Você pode exportar tudo a qualquer momento em JSON/CSV.' },
    { q: 'E se o cliente cancelar o Open Finance?', a: 'Todos os gatilhos dele são pausados automaticamente. Ele recebe notificação explicando o que aconteceu. Nenhuma operação é executada sem consentimento ativo.' },
    { q: 'Funciona com qual corretora/fundo?', a: 'Hoje: mocks + Efí Bank (Open Finance). Em produção: XP, Rico, BTG, Órama, Genial. Roadmap: B3, Modal, Inter, Magalu, Amazon.' }
  ];

  return (
    <section className="py-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-brand-500 font-semibold mb-3">DÚVIDAS</p>
          <h2 className="text-4xl md:text-5xl font-bold">FAQ</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <details key={i} className="group bg-white border border-gray-200 rounded-xl p-5 cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-gray-900">
                {f.q}
                <span className="text-brand-500 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinal() {
  return (
    <section id="demo" className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-purple-600 p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Pronto pra automatizar?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Agende 30 minutos. A gente te mostra rodando com seus dados (em sandbox). Sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://cal.com/orkest" className="bg-white text-brand-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-100 transition">
              Agendar Demo →
            </a>
            <a href="#docs" className="text-white border-2 border-white/30 font-semibold py-4 px-8 rounded-xl hover:bg-white/10 transition">
              Ver Documentação
            </a>
          </div>
          <p className="text-sm text-white/70 mt-6">Setup em 1 semana · Sem fidelidade · Piloto com 3 parceiros ativos</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-gray-100 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">N</div>
              <span className="font-bold text-lg">NextGen Assets</span>
            </div>
            <p className="text-sm text-gray-600">Motor de automação financeira B2B2C. Feito no Brasil.</p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Produto</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#solucao">Solução</a></li>
              <li><a href="#gatilhos">Gatilhos</a></li>
              <li><a href="#preco">Preço</a></li>
              <li><a href="#docs">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#">Sobre</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Carreiras</a></li>
              <li><a href="#">Contato</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#">Privacidade</a></li>
              <li><a href="#">Termos</a></li>
              <li><a href="#">LGPD</a></li>
              <li><a href="#">Compliance</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          © 2026 NextGen Assets. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
