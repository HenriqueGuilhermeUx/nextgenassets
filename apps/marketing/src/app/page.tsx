// ============================================
//  NextGen Assets — Home: Cobrança Inteligente
// ============================================

const segments = [
  ['Condomínios e associações', 'Cotas mensais, acordos, segunda via, inadimplência e baixa automática.'],
  ['Escolas, cursos e clubes', 'Mensalidades, assinaturas, turmas, clubes de livros e recorrência educacional.'],
  ['Academias, clínicas e serviços', 'Planos, pacotes, consultas recorrentes e cobrança por WhatsApp.'],
  ['SaaS e assinaturas digitais', 'Assinaturas, upgrades, renovações, inadimplência e conciliação via API.'],
  ['E-commerce e infoprodutos', 'Links Pix, recuperação de carrinho, cobrança recorrente e campanhas.'],
  ['Financeiro regulado', 'Previdência, seguros e investimentos autorizados como infraestrutura de cobrança e consentimento.']
];

const broadExamples = [
  'condomínios',
  'escolas',
  'academias',
  'clínicas',
  'SaaS',
  'clubes de livros',
  'assinaturas',
  'consultorias',
  'infoprodutos',
  'associações',
  'previdência privada',
  'seguros',
  'serviços recorrentes',
  'e-commerces'
];

const features = [
  ['Pix Automático', 'Autorização uma vez, cobrança recorrente dentro das regras aprovadas pelo pagador.'],
  ['Pix Cobrança', 'QR Code, Copia e Cola e link de pagamento com a marca do seu negócio.'],
  ['Régua multicanal', 'WhatsApp, e-mail e lembretes antes, no dia e depois do vencimento.'],
  ['Conciliação em tempo real', 'Webhook e painel atualizados quando o pagamento acontece.'],
  ['Juros, multa e segunda via', 'Valor atualizado automaticamente para cobranças vencidas.'],
  ['API e white-label', 'Integração com ERP, sistema próprio, checkout, CRM ou plataforma vertical.']
];

const pricing = [
  ['Starter', 'R$ 149/mês', 'até 500 cobranças/mês', 'R$ 1,99 por Pix pago'],
  ['Growth', 'R$ 499/mês', 'até 2.000 cobranças/mês', 'R$ 1,49 por Pix pago'],
  ['Scale', 'R$ 1.499/mês', 'alto volume e API', 'R$ 0,99 por Pix pago'],
  ['Enterprise', 'Custom', 'white-label + SLA', 'preço por contrato']
];

const roadmap = [
  ['Hoje', 'Cobrança Inteligente', 'Substituição de boletos, Pix Automático, régua de cobrança e conciliação.'],
  ['Próximo', 'Recovery Commerce', 'Recuperação de carrinhos abandonados com WhatsApp, cupom e link Pix.'],
  ['Depois', 'Wallet PF', 'Carteira do pagador para controlar assinaturas, consentimentos e pagamentos autorizados.']
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
              <a href="#usos" className="hover:text-white">Quem usa</a>
              <a href="#ideias" className="hover:text-white">Ideias que vêm aí</a>
              <a href="#precos" className="hover:text-white">Preços</a>
            </div>
          </nav>

          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Pix Automático + cobrança recorrente + conciliação
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Cobrança inteligente para qualquer negócio recorrente.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                A NextGen ajuda empresas que cobram, vendem, parcelam ou recebem de forma recorrente a reduzir inadimplência, receber mais rápido e automatizar cobranças com Pix, Pix Automático, WhatsApp e baixa em tempo real.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20usar%20Cobran%C3%A7a%20Inteligente%20NextGen%20no%20meu%20neg%C3%B3cio" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Quero usar no meu negócio
                </a>
                <a href="#usos" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">
                  Ver exemplos de uso
                </a>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a href="#ideias" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-center text-sm font-bold text-emerald-100 hover:bg-emerald-400/20">
                  Ideias que vêm aí
                </a>
                <a href="#novidades" className="rounded-xl border border-blue-300/30 bg-blue-300/10 px-5 py-3 text-center text-sm font-bold text-blue-100 hover:bg-blue-300/20">
                  Novidades e funcionalidades
                </a>
              </div>

              <div className="mt-10 grid gap-4 text-sm text-white/75 sm:grid-cols-3">
                <div>✅ Serve para qualquer recorrência</div>
                <div>✅ Baixa em tempo real</div>
                <div>✅ Régua automática</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-emerald-200">
                <div className="text-white/50">Cobrança recorrente</div>
                <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{
  "cliente": "cliente-001",
  "valor": "100.00",
  "vencimento": "2026-07-05",
  "pagamento": "pix_automatico",
  "status": "pendente"
}`}</pre>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-400 p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide">Resultado</div>
                  <p className="mt-2 text-lg font-black">Cobrança enviada, Pix agendado e financeiro conciliado.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Status</div>
                  <p className="mt-2 text-lg font-black">Pendente → Pago → Baixado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">PRODUTO ATUAL</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Hoje somos especialistas em cobrança inteligente.</h2>
            <p className="mt-4 text-lg text-gray-600">A porta de entrada é simples: qualquer empresa que cobra clientes pode usar a NextGen para enviar cobranças, lembrar o pagador, receber por Pix e conciliar tudo.</p>
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

      <section id="usos" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">QUEM PODE USAR</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Não é só para condomínio. É para qualquer negócio que cobra.</h2>
            <p className="mt-4 text-lg text-gray-600">Começamos por mensalidades e cobranças recorrentes, mas o serviço pode atender qualquer operação que precise receber melhor.</p>
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
              Em previdência, seguros, investimentos e outros setores regulados, a NextGen atua como infraestrutura de cobrança, autorização, lembretes e conciliação. A oferta financeira, suitability, contrato e regulação ficam com a instituição autorizada ou parceira responsável.
            </p>
          </div>
        </div>
      </section>

      <section id="ideias" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">IDEIAS QUE VÊM AÍ</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">A cobrança é o começo. A inteligência vem em camadas.</h2>
            <p className="mt-4 text-lg text-gray-600">Não confundimos o cliente no início, mas mostramos que a plataforma está evoluindo para recuperar vendas, controlar assinaturas e criar uma wallet do pagador.</p>
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

      <section id="novidades" className="bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-bold text-emerald-300">NOVIDADES E FUNCIONALIDADES</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">O que entra depois da cobrança inteligente.</h2>
            <p className="mt-5 text-lg text-white/70">A base técnica já conversa com Open Finance, Pix Automático, webhooks e transações. Agora cada nova função vira produto.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h3 className="text-2xl font-black">Recovery Commerce</h3>
              <p className="mt-3 text-sm text-white/70">Recuperação de carrinhos abandonados, pedidos não pagos e vendas perdidas com WhatsApp, cupom inteligente e link Pix.</p>
              <div className="mt-5 rounded-xl bg-white/10 p-3 text-sm font-bold text-emerald-200">Em breve para e-commerces e vendas digitais</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h3 className="text-2xl font-black">Wallet PF</h3>
              <p className="mt-3 text-sm text-white/70">Carteira do pagador para controlar autorizações, assinaturas, cobranças, benefícios e pagamentos recorrentes.</p>
              <div className="mt-5 rounded-xl bg-white/10 p-3 text-sm font-bold text-emerald-200">Em breve para pessoas físicas</div>
            </div>
          </div>
        </div>
      </section>

      <section id="precos" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">PREÇOS SUGERIDOS</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Preço menor que boleto. Valor maior que gateway.</h2>
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
        <h2 className="mx-auto max-w-4xl text-4xl font-black md:text-5xl">Quer automatizar cobrança no seu negócio?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">Em 10 minutos mostramos como adaptar a NextGen para condomínio, assinatura, curso, serviço, venda recorrente, e-commerce ou operação regulada com parceiro autorizado.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href="https://wa.me/5511947984328?text=Quero%20uma%20demo%20da%20Cobran%C3%A7a%20Inteligente%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 font-bold text-slate-950 hover:bg-emerald-300">Quero uma demo</a>
          <a href="/painel-empresa" className="rounded-xl border border-white/20 px-7 py-4 font-bold text-white hover:bg-white/10">Ver painel empresa</a>
        </div>
      </section>
    </main>
  );
}
