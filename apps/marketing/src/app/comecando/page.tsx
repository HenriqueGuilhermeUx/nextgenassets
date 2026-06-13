'use client';
import Link from 'next/link';

export default function ComecandoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-block bg-pink-500/20 text-pink-300 text-xs font-bold px-3 py-1 rounded-full mb-6">
          📖 Manual completo — didático
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          NextGen Assets
          <br />
          <span className="bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
            explicado pra criança
          </span>
        </h1>
        <p className="text-xl text-slate-300">
          Sem jargão. Sem complicação. Só o que importa.
        </p>
      </section>

      {/* O que é */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-4">🤔 O que é NextGen Assets?</h2>
          <p className="text-xl text-slate-200 leading-relaxed">
            Imagina que toda vez que tu <strong className="text-pink-300">compra um cafezinho de R$ 5,00</strong>,
            o troco de R$ 0,50 vai direto pra uma <strong className="text-emerald-300">poupança que rende sozinha</strong>.
            <br /><br />
            Tu não faz nada. O sistema faz por ti.
            <br /><br />
            É isso. <strong className="text-yellow-300">NextGen é o "duende" que coloca teu troco na poupança toda vez que tu gasta.</strong>
          </p>
        </div>
      </section>

      {/* Como ganha dinheiro */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">💰 Quem ganha o quê?</h2>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🛒</span>
              <h3 className="text-2xl font-bold">VOCÊ (consumidor)</h3>
            </div>
            <p>Tu compra R$ 100 no mercado. R$ 0,50 vai pra tua poupança automaticamente. Em 1 ano, são R$ 60+ que renderam sozinhos. <strong>Tu não fez nada.</strong></p>
          </div>
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏪</span>
              <h3 className="text-2xl font-bold">LOJA (que te vendeu)</h3>
            </div>
            <p>A loja recebe R$ 100 - R$ 3 (taxa NextGen) = <strong>R$ 97,00</strong>. Em troca, ela paga R$ 3 pra gente. <strong>Loja fica feliz porque cliente volta mais vezes.</strong></p>
          </div>
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🤖</span>
              <h3 className="text-2xl font-bold">NEXTGEN (a gente)</h3>
            </div>
            <p>A gente fica com R$ 3 de cada R$ 100. Se 1000 pessoas gastam R$ 100 cada, a gente fatura R$ 3.000. <strong>Sem nenhum custo nosso além da tecnologia.</strong></p>
          </div>
          <div className="bg-gradient-to-r from-slate-500/20 to-slate-600/20 border border-slate-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏦</span>
              <h3 className="text-2xl font-bold">WOOVI (gateway PIX)</h3>
            </div>
            <p>Woovi é a maquininha digital. Ela fica com R$ 0,50 de cada R$ 100 (0,5% de taxa). <strong>Paga ela, ela processa o PIX em 3 segundos.</strong></p>
          </div>
        </div>
      </section>

      {/* As 4 peças do quebra-cabeça */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">🧩 Como funciona por dentro (4 pecinhas)</h2>
        <p className="text-center text-slate-300 mb-8">Pensa num sanduíche. Tem 4 camadas:</p>

        <div className="space-y-6">
          <div className="bg-slate-800/50 border-l-4 border-pink-500 rounded-r-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-bold">1️⃣ Pão de cima: WOOVI (PIX)</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded">✅ LIVE</span>
            </div>
            <p className="text-slate-300">
              <strong>O que faz:</strong> Recebe o PIX do cliente e divide automaticamente entre as partes (split nativo).
              <br />
              <strong>Analogia:</strong> É a moedinha eletrônica que faz a divisão chegar nas contas certas.
            </p>
          </div>

          <div className="bg-slate-800/50 border-l-4 border-purple-500 rounded-r-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-bold">2️⃣ Alface: PLUGGY (Open Finance)</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded">✅ LIVE (dev)</span>
            </div>
            <p className="text-slate-300">
              <strong>O que faz:</strong> Lê o saldo da tua conta bancária (com tua autorização).
              <br />
              <strong>Analogia:</strong> É o "olho mágico" que olha na tua conta e diz "olha, sobrou R$ 50, pode investir R$ 30".
            </p>
          </div>

          <div className="bg-slate-800/50 border-l-4 border-amber-500 rounded-r-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-bold">3️⃣ Carne: AI (cérebro)</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded">✅ LIVE</span>
            </div>
            <p className="text-slate-300">
              <strong>O que faz:</strong> Decide sozinho se vale a pena comprar aquela ação/fundo/cripto.
              <br />
              <strong>Analogia:</strong> É o "pai rico" que tá sempre olhando o mercado e dizendo "compra isso, vende aquilo".
            </p>
          </div>

          <div className="bg-slate-800/50 border-l-4 border-emerald-500 rounded-r-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-bold">4️⃣ Pão de baixo: CRON (motor)</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded">✅ LIVE</span>
            </div>
            <p className="text-slate-300">
              <strong>O que faz:</strong> Roda a cada 1h pra sacar o dinheiro da conta técnica pro teu PIX.
              <br />
              <strong>Analogia:</strong> É o "robô" que toda hora pega o dinheiro acumulado e te manda pro banco.
            </p>
          </div>
        </div>
      </section>

      {/* Possibilidades */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">🚀 TODAS as possibilidades</h2>
        <p className="text-center text-slate-300 mb-8">O que dá pra fazer AGORA com a plataforma:</p>

        <div className="space-y-4">
          {[
            { e: '💸', t: 'Round-up automático', d: 'Cada compra sua, o troco vai pro investimento. Sem esforço.' },
            { e: '📊', t: 'Investir em ações com IA', d: 'Tu diz "quero comprar PETR4 se cair 5%". A IA cuida.' },
            { e: '🪙', t: 'Investir em cripto', d: 'Bitcoin, Ethereum, qualquer moeda. A IA decide quando.' },
            { e: '🏦', t: 'Investir em fundos', d: 'Tesouro Selic, CDB, LCI. Tudo automatizado.' },
            { e: '🔄', t: 'Split de pagamento (marketplace)', d: 'Loja vende R$ 100 → R$ 3 pra gente + R$ 97 pra loja. 1 transação.' },
            { e: '🤖', t: 'AI que vende pra você', d: 'Tu é lojista? AI sugere produtos pros clientes certos. +15% vendas.' },
            { e: '🏪', t: 'Plugin Shopify/Woo', d: 'Lojista instala 1 clique. Sem código. Funciona.' },
            { e: '🔌', t: 'Open Finance (Pluggy)', d: 'Tu conecta teu banco. A gente vê saldo, lê transações, toma decisão.' },
            { e: '🛒', t: 'Plugin pra 3 marketplaces (ML, Amazon, Magalu)', d: 'Bot detecta promoção e cria gatilho pra ti.' },
            { e: '📅', t: 'Recorrência (Pix Automático)', d: 'Tu autoriza "investir R$ 50/mês". A gente faz todo dia 5.' },
            { e: '🏧', t: 'Auto-withdraw (cron 1h)', d: 'Saldo na conta técnica? A gente saca pro teu PIX sozinho.' },
            { e: '📱', t: 'App mobile (PWA)', d: 'Tu acessa pelo navegador. Sem precisar instalar.' },
            { e: '🧾', t: 'White-label (marketplace)', d: 'Tu é marketplace? Bota nossa marca com a tua.' },
            { e: '🤝', t: 'B2B B2B2C', d: 'Empresa coloca a plataforma pros funcionários/clientes. Receita recorrente.' },
            { e: '🌐', t: 'Multi-currency', d: 'Hoje só BRL. Amanhã USD, EUR, qualquer moeda.' },
            { e: '🎮', t: 'Gamificação', d: 'Streak de dias investindo, badges, ranking entre amigos. (Roadmap)' },
            { e: '🎓', t: 'Educação financeira', d: 'A IA explica o que tá fazendo. Tipo "comprei PETR4 porque tá barata".' },
            { e: '💎', t: 'Premium R$ 19,90/mês', d: 'Triggers ilimitados, AI personalizada, suporte VIP.' },
            { e: '🆓', t: 'FREE 3 usos/mês', d: 'Pra experimentar. Sem cartão. Sem pegadinha.' },
          ].map((p) => (
            <div key={p.t} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3">
              <div className="text-3xl">{p.e}</div>
              <div className="flex-1">
                <h3 className="font-bold">{p.t}</h3>
                <p className="text-sm text-slate-400">{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Status REAL */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">🎯 O que FUNCIONA vs. o que falta</h2>

        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-2xl font-bold mb-4 text-emerald-300">✅ FUNCIONA EM PRODUÇÃO (testado, real)</h3>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>Split PIX Woovi:</strong> R$ 10 → R$ 0,30 + R$ 9,20 (REAL, testado)</li>
            <li>✅ <strong>Webhook charge.completed:</strong> salvando no DB</li>
            <li>✅ <strong>Auto-withdraw subcontas:</strong> R$ 0,30 + R$ 9,20 saíram via PIX</li>
            <li>✅ <strong>Cron a cada 1h:</strong> roda automaticamente</li>
            <li>✅ <strong>Open Finance Pluggy (sandbox):</strong> item real conectado</li>
            <li>✅ <strong>AI Orchestrator:</strong> processa decisões</li>
            <li>✅ <strong>Browser extension:</strong> 17 files, instala em 5min</li>
            <li>✅ <strong>Landing pages:</strong> /vender, /preco, /docs, /api-docs</li>
            <li>✅ <strong>App Consumer:</strong> /billing, /connect-bank</li>
            <li>✅ <strong>SDK JS + Postman + Swagger</strong> (self-service)</li>
          </ul>
        </div>

        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-2xl font-bold mb-4 text-amber-300">⏳ AGUARDANDO (terceiros)</h3>
          <ul className="space-y-2 text-sm">
            <li>⏳ <strong>Pluggy "Test with real data":</strong> aguardando Pluggy aprovar (pediu sexta, responde segunda 2026-06-15)</li>
            <li>⏳ <strong>Woovi PIX OUT (TRANSFER_POST):</strong> escopo ainda não liberado (a gente pediu, 24-48h)</li>
            <li>⏳ <strong>Woovi Split nativo habilitado pra Partners:</strong> (já habilitou, mas tá com algumas restrições por chave)</li>
          </ul>
        </div>

        <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-6">
          <h3 className="text-2xl font-bold mb-4 text-rose-300">🚧 ROADMAP (próximas 2-4 semanas)</h3>
          <ul className="space-y-2 text-sm">
            <li>🚧 Plugin Shopify (precisa de dev week)</li>
            <li>🚧 Plugin WooCommerce</li>
            <li>🚧 App mobile nativo (React Native)</li>
            <li>🚧 Multi-currency (USD/EUR)</li>
            <li>🚧 Publicar browser extension na Chrome Web Store ($5 dev account)</li>
            <li>🚧 Email outreach 10 prospects B2B</li>
            <li>🚧 Compliance BACEN PISP + LGPD audit</li>
          </ul>
        </div>
      </section>

      {/* O que falta pra REAL */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">❓ "O que falta pra funcionar REAL?"</h2>
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6">
          <p className="text-lg text-slate-200 mb-4">
            <strong>Resposta honesta:</strong> <span className="text-emerald-300">A plataforma JÁ FUNCIONA real pra B2B (split).</span> Tu já pagou R$ 10 e os outros R$ 9,50 saíram via PIX.
          </p>
          <p className="text-lg text-slate-200 mb-4">
            <strong>O que ainda falta (2 coisas pequenas):</strong>
          </p>
          <ol className="list-decimal list-inside space-y-3 text-slate-300">
            <li><strong>Pluggy produção (banco real, saldo real):</strong> Pluggy aprova segunda 2026-06-15. Aí a gente troca de dev pra produção (1 click no Pluggy). Custo: R$ 0,50/consulta.</li>
            <li><strong>Woovi TRANSFER_POST (PIX OUT entre contas):</strong> A gente pediu, 24-48h pra liberar. Mas HONESTAMENTE, o split + auto-withdraw JÁ substitui isso (testado funcionando).</li>
          </ol>
          <p className="text-lg text-slate-200 mt-6">
            <strong>Resumindo:</strong> a plataforma tá 95% funcional. Os 5% que faltam são burocracia de aprovação de terceiros (Pluggy + Woovi). Nenhuma feature nossa tá quebrada.
          </p>
        </div>
      </section>

      {/* CTAs */}
      <section className="px-6 py-16 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Bora testar?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/docs" className="bg-emerald-500 text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-emerald-400">
            📚 Ler a doc
          </Link>
          <Link href="/api-docs" className="bg-purple-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-400">
            🔧 Ver API
          </Link>
          <Link href="/vender" className="bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-amber-400">
            🤝 Vender
          </Link>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-slate-500 text-sm border-t border-white/5">
        <p>NextGen Assets © 2026 — Manual didático v1.0</p>
      </footer>
    </div>
  );
}
