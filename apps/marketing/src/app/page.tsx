// ============================================
//  NextGen Assets — Home: Cobrança Inteligente
// ============================================

const segments = [
  ['Condomínios', 'Cotas mensais, acordos, segunda via, inadimplência e baixa automática.'],
  ['Escolas e cursos', 'Mensalidades recorrentes com lembretes antes do vencimento.'],
  ['Academias', 'Pix Automático para recorrência sem depender apenas de cartão.'],
  ['Clínicas', 'Planos, pacotes, consultas recorrentes e cobrança por WhatsApp.'],
  ['SaaS B2B', 'Assinaturas, upgrades, inadimplência e conciliação via API.'],
  ['Associações', 'Mensalidades, anuidades, campanhas e contribuições recorrentes.']
];

const features = [
  ['Pix Automático', 'Autorização uma vez, cobrança recorrente dentro das regras aprovadas.'],
  ['Pix Cobrança', 'QR Code, Copia e Cola e link de pagamento com a marca do cliente.'],
  ['Régua multicanal', 'WhatsApp, e-mail e lembretes antes, no dia e depois do vencimento.'],
  ['Conciliação em tempo real', 'Webhook e painel atualizados quando o pagamento acontece.'],
  ['Juros e multa', 'Valor atualizado automaticamente para cobranças vencidas.'],
  ['API e white-label', 'Integração com ERP, sistema de condomínio, escola, academia ou SaaS.']
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
              <a href="#ideias" className="hover:text-white">Ideias que vêm aí</a>
              <a href="#novidades" className="hover:text-white">Novidades</a>
              <a href="#precos" className="hover:text-white">Preços</a>
            </div>
          </nav>

          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Pix Automático + cobrança recorrente + conciliação
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Troque boletos por cobrança inteligente.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                A NextGen ajuda condomínios, escolas, academias, clínicas e SaaS a reduzir inadimplência, receber mais rápido e automatizar cobranças com Pix, Pix Automático, WhatsApp e baixa em tempo real.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20migrar%20boletos%20para%20Pix%20com%20a%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Quero migrar meus boletos
                </a>
                <a href="#precos" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">
                  Ver planos
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
                <div>✅ Menos atrito que boleto</div>
                <div>✅ Baixa em tempo real</div>
                <div>✅ Régua automática</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-emerald-200">
                <div className="text-white/50">Cobrança recorrente</div>
                <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{
  "cliente": "Unidade 1204",
  "valor": "890.00",
  "vencimento": "2026-07-05",
  "pagamento": "pix_automatico",
  "status": "pendente"
}`}</pre>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-400 p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide">Resultado</div>
                  <p className="mt-2 text-lg font-black">Pix agendado, webhook ativo e financeiro conciliado.</p>
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
            <p className="mt-4 text-lg text-gray-600">Começamos com a dor mais clara: empresas que ainda dependem de boleto, baixa manual e cobrança atrasada.</p>
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

      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">PARA QUEM É</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Primeiro dominamos mensalidades. Depois dominamos recorrência.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {segments.map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ideias" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">IDEIAS QUE VÊM AÍ</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">A cobrança é o começo. A inteligência vem em camadas.</h2>
            <p className="mt-4 text-lg text-gray-600">Não confundimos o cliente no início, mas mostramos que a plataforma está evoluindo.</p>
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
              <p className="mt-3 text-sm text-white/70">Recuperação de carrinhos abandonados com WhatsApp, cupom inteligente e link Pix.</p>
              <div className="mt-5 rounded-xl bg-white/10 p-3 text-sm font-bold text-emerald-200">Em breve para e-commerces</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h3 className="text-2xl font-black">Wallet PF</h3>
              <p className="mt-3 text-sm text-white/70">Carteira do pagador para controlar autorizações, assinaturas, cobranças e benefícios.</p>
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
        <h2 className="mx-auto max-w-4xl text-4xl font-black md:text-5xl">Vamos migrar seus boletos para Pix inteligente?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">Em 10 minutos mostramos como condomínios, escolas, academias e SaaS podem receber melhor com NextGen.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href="https://wa.me/5511947984328?text=Quero%20uma%20demo%20da%20Cobran%C3%A7a%20Inteligente%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 font-bold text-slate-950 hover:bg-emerald-300">Quero uma demo</a>
          <a href="/empresas" className="rounded-xl border border-white/20 px-7 py-4 font-bold text-white hover:bg-white/10">Ver todos os produtos B2B</a>
        </div>
      </section>
    </main>
  );
}
