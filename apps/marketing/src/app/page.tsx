// ============================================
//  NextGen Assets — Home: Recebimentos Inteligentes
// ============================================

const segments = [
  ['Serviços e consultorias', 'Propostas, contratos, parcelas, sinal, saldo, lembretes e confirmação de pagamento.'],
  ['Condomínios e associações', 'Cotas, acordos, segunda via, comunicação com moradores e conciliação do financeiro.'],
  ['Escolas, cursos e clubes', 'Mensalidades, matrículas, recorrência, avisos aos responsáveis e baixa automática.'],
  ['Academias, clínicas e recorrência', 'Planos, pacotes, consultas, retornos, renovações e lembretes de pagamento.'],
  ['SaaS e assinaturas digitais', 'Assinaturas, upgrades, renovações, pagamentos não concluídos e conciliação via API.'],
  ['E-commerce e infoprodutos', 'Links Pix, recuperação de pedidos, carrinho abandonado, campanhas e comunicação pós-venda.']
];

const broadExamples = [
  'vendas avulsas',
  'mensalidades',
  'assinaturas',
  'contratos',
  'serviços',
  'consultorias',
  'condomínios',
  'escolas',
  'academias',
  'clínicas',
  'SaaS',
  'e-commerces',
  'infoprodutos',
  'associações',
  'seguros',
  'operações com parceiros'
];

const features = [
  ['Criar pagamentos', 'Pix, link, QR Code, Pix Cobrança e Pix Automático para vendas pontuais, parcelas ou recorrências.'],
  ['Comunicar clientes', 'Avisos por WhatsApp/e-mail antes, no dia e depois do vencimento, sem parecer cobrança agressiva.'],
  ['Acompanhar recebimentos', 'Status de pagamento, pendências, atrasos, baixa automática e painel em tempo real.'],
  ['Recuperar pagamentos', 'Pedidos não pagos, carrinhos abandonados, links expirados e clientes que esqueceram de pagar.'],
  ['Conciliar e repassar', 'Controle de taxas, splits, repasses manuais ou automáticos e histórico financeiro.'],
  ['Integrar via API', 'Conecte ERP, CRM, checkout, plataforma própria, sistema vertical ou ambiente white-label.']
];

const flow = [
  ['1', 'Crie o pagamento', 'Informe cliente, valor, vencimento e forma de recebimento.'],
  ['2', 'Avise no momento certo', 'A NextGen agenda lembretes e mensagens automáticas.'],
  ['3', 'Receba e acompanhe', 'O painel mostra pendente, pago, vencido, conciliado e repassado.'],
  ['4', 'Concilie sem planilha', 'Logs, webhooks e histórico deixam a operação auditável.']
];

const pricing = [
  ['Starter', 'R$ 149/mês', 'até 500 recebimentos/mês', 'R$ 1,99 por Pix pago'],
  ['Growth', 'R$ 499/mês', 'até 2.000 recebimentos/mês', 'R$ 1,49 por Pix pago'],
  ['Scale', 'R$ 1.499/mês', 'alto volume e API', 'R$ 0,99 por Pix pago'],
  ['Enterprise', 'Custom', 'white-label + SLA', 'preço por contrato']
];

const roadmap = [
  ['Hoje', 'Recebimentos Inteligentes', 'Pix, links de pagamento, comunicação automática, conciliação e controle de repasses.'],
  ['Próximo', 'Recovery Commerce', 'Recuperação de pedidos não pagos, carrinhos abandonados e vendas perdidas com WhatsApp e link Pix.'],
  ['Depois', 'Wallet do pagador', 'Ambiente para controlar autorizações, assinaturas, consentimentos e pagamentos recorrentes.']
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-24 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #22c55e 0, transparent 30%), radial-gradient(circle at 80% 10%, #60a5fa 0, transparent 25%)' }} />
        <div className="relative mx-auto max-w-7xl">
          <nav className="mb-20 flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight">NextGen Assets</a>
            <div className="hidden gap-6 text-sm text-white/70 md:flex">
              <a href="#produto" className="hover:text-white">Produto</a>
              <a href="#como-funciona" className="hover:text-white">Como funciona</a>
              <a href="#usos" className="hover:text-white">Quem usa</a>
              <a href="#precos" className="hover:text-white">Preços</a>
            </div>
          </nav>

          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Pix + mensagens + conciliação + recorrência
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Receba melhor com Pix, mensagens automáticas e conciliação.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                A NextGen ajuda empresas a criar pagamentos, lembrar clientes, automatizar recorrências, recuperar pagamentos não concluídos e controlar repasses em um só painel.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                Para vendas avulsas, mensalidades, assinaturas, contratos, serviços, e-commerces e operações com parceiros.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20receber%20melhor%20com%20a%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Quero receber melhor
                </a>
                <a href="#como-funciona" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">
                  Ver como funciona
                </a>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a href="/painel-empresa" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-center text-sm font-bold text-emerald-100 hover:bg-emerald-400/20">
                  Ver painel empresa
                </a>
                <a href="/notificacoes" className="rounded-xl border border-blue-300/30 bg-blue-300/10 px-5 py-3 text-center text-sm font-bold text-blue-100 hover:bg-blue-300/20">
                  Testar notificações
                </a>
              </div>

              <div className="mt-10 grid gap-4 text-sm text-white/75 sm:grid-cols-3">
                <div>✅ Pagamentos pontuais ou recorrentes</div>
                <div>✅ Lembretes automáticos</div>
                <div>✅ Conciliação e repasses</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-emerald-200">
                <div className="text-white/50">Jornada de recebimento</div>
                <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{
  "cliente": "cliente-001",
  "valor": "100.00",
  "vencimento": "2026-07-05",
  "pagamento": "pix",
  "mensagens": ["D-3", "D-1", "D0", "D+1"],
  "status": "pendente"
}`}</pre>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-400 p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide">Resultado</div>
                  <p className="mt-2 text-lg font-black">Pagamento criado, cliente avisado e financeiro conciliado.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Status</div>
                  <p className="mt-2 text-lg font-black">Pendente → Pago → Baixado → Repassado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">PRODUTO</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Não é só cobrança. É a jornada completa do recebimento.</h2>
            <p className="mt-4 text-lg text-gray-600">A NextGen organiza o caminho entre vender, avisar, receber, confirmar, conciliar e repassar.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-gray-200 p-7 shadow-sm">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-emerald-300">COMO FUNCIONA</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Da venda ao recebimento, tudo conectado.</h2>
            <p className="mt-4 text-lg text-white/70">O cliente não precisa entender Pix, régua, webhook, split ou conciliação. Ele vê uma operação simples e organizada.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {flow.map(([number, title, text]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 font-black text-slate-950">{number}</div>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="usos" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">QUEM PODE USAR</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Para qualquer empresa que precisa receber melhor.</h2>
            <p className="mt-4 text-lg text-gray-600">Serve para pagamentos pontuais, recorrentes, parcelados, pendentes ou vinculados a repasses.</p>
          </div>

          <div className="mb-10 flex flex-wrap gap-3">
            {broadExamples.map((item) => (
              <span key={item} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">{item}</span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {segments.map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-blue-100 bg-blue-50 p-6 text-blue-950">
            <h3 className="text-xl font-black">Observação importante para mercados regulados</h3>
            <p className="mt-2 text-sm leading-6 text-blue-900/80">
              Em previdência, seguros, investimentos e outros setores regulados, a NextGen atua como infraestrutura tecnológica de pagamentos, autorização, comunicação e conciliação. A oferta financeira, suitability, contrato e regulação ficam com a instituição autorizada ou parceira responsável.
            </p>
          </div>
        </div>
      </section>

      <section id="ideias" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">EVOLUÇÃO DO PRODUTO</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Recebimento hoje. Inteligência financeira em camadas.</h2>
            <p className="mt-4 text-lg text-gray-600">A base começa no recebimento, mas evolui para recuperação de vendas, automação de consentimentos e controle do pagador.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {roadmap.map(([when, title, text]) => (
              <div key={title} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{when}</span>
                <h3 className="mt-5 text-2xl font-black">{title}</h3>
                <p className="mt-3 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">PREÇOS SUGERIDOS</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Valor maior que gateway. Mais simples que planilha.</h2>
            <p className="mt-4 text-lg text-gray-600">Comece simples: mensalidade + taxa por Pix pago. Enterprise entra com API, white-label e SLA.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {pricing.map(([plan, price, volume, fee]) => (
              <div key={plan} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <h3 className="text-2xl font-black">{plan}</h3>
                <div className="mt-4 text-3xl font-black text-blue-700">{price}</div>
                <p className="mt-3 text-sm text-gray-600">{volume}</p>
                <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm font-bold text-slate-800">{fee}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-slate-950 to-blue-950 px-6 py-20 text-center text-white">
        <h2 className="mx-auto max-w-4xl text-4xl font-black md:text-5xl">Quer receber melhor no seu negócio?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">Em 10 minutos mostramos como adaptar a NextGen para venda avulsa, mensalidade, assinatura, contrato, serviço, e-commerce ou operação com parceiro autorizado.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href="https://wa.me/5511947984328?text=Quero%20uma%20demo%20da%20NextGen%20para%20receber%20melhor" className="rounded-xl bg-emerald-400 px-7 py-4 font-bold text-slate-950 hover:bg-emerald-300">Quero uma demo</a>
          <a href="/painel-empresa" className="rounded-xl border border-white/20 px-7 py-4 font-bold text-white hover:bg-white/10">Ver painel empresa</a>
        </div>
      </section>
    </main>
  );
}
