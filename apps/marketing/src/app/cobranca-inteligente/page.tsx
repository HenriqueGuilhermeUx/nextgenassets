// ============================================
//  NextGen Assets — Cobrança Inteligente
// ============================================

const segments = [
  ['Condomínios', 'Mensalidades, acordos, segunda via, inadimplência e baixa automática.'],
  ['Escolas e cursos', 'Mensalidades recorrentes com lembretes antes do vencimento.'],
  ['Academias', 'Pix Automático para recorrência sem depender só de cartão.'],
  ['Clínicas', 'Planos, pacotes, consultas recorrentes e cobrança por WhatsApp.'],
  ['SaaS B2B', 'Assinaturas, upgrades, inadimplência e conciliação via API.'],
  ['Associações', 'Mensalidades, anuidades, campanhas e contribuições recorrentes.']
];

const painPoints = [
  ['Boleto caro', 'Tarifas bancárias, emissão, baixa manual e atraso de compensação.'],
  ['Cliente esquece', 'O pagador recebe PDF, código enorme ou precisa lembrar do vencimento.'],
  ['Baixa lenta', 'Financeiro perde tempo conciliando pagamento, planilha e sistema.'],
  ['Inadimplência invisível', 'A empresa só percebe tarde que vários clientes não pagaram.']
];

const features = [
  ['Pix Automático', 'Autorização uma vez, cobrança recorrente dentro das regras aprovadas.'],
  ['Pix cobrança', 'QR Code, Copia e Cola e link de pagamento com marca do cliente.'],
  ['Régua multicanal', 'WhatsApp, e-mail e lembretes antes, no dia e depois do vencimento.'],
  ['Conciliação em tempo real', 'Webhook e painel atualizados quando o pagamento acontece.'],
  ['Juros e multa', 'Valor atualizado automaticamente para cobranças vencidas.'],
  ['API e white-label', 'Integre com ERP, sistema de condomínio, escola, academia ou SaaS.']
];

const pricing = [
  ['Starter', 'R$ 149/mês', 'até 500 cobranças/mês', 'R$ 1,99 por Pix pago'],
  ['Growth', 'R$ 499/mês', 'até 2.000 cobranças/mês', 'R$ 1,49 por Pix pago'],
  ['Scale', 'R$ 1.499/mês', 'alto volume e API', 'R$ 0,99 por Pix pago'],
  ['Enterprise', 'Custom', 'white-label + SLA', 'preço por contrato']
];

const steps = [
  ['1', 'Importa a carteira', 'O cliente sobe uma planilha ou conecta o sistema atual.'],
  ['2', 'Cria a régua', 'Definimos vencimento, recorrência, mensagens e canais.'],
  ['3', 'Cliente paga melhor', 'Pix, Pix Automático ou link com QR Code e marca da empresa.'],
  ['4', 'Financeiro acompanha', 'Baixa, status, inadimplência e relatório em tempo real.']
];

export default function CobrancaInteligentePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-24 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #22c55e 0, transparent 30%), radial-gradient(circle at 80% 10%, #60a5fa 0, transparent 25%)' }} />
        <div className="relative mx-auto max-w-7xl">
          <nav className="mb-20 flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight">NextGen Assets</a>
            <div className="hidden gap-6 text-sm text-white/70 md:flex">
              <a href="/empresas" className="hover:text-white">Empresas</a>
              <a href="#como-funciona" className="hover:text-white">Como funciona</a>
              <a href="#precos" className="hover:text-white">Preços</a>
              <a href="#demo" className="hover:text-white">Demo</a>
            </div>
          </nav>

          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Pix Automático + cobrança recorrente + conciliação
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Troque boleto por cobrança inteligente.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                Reduza inadimplência, receba mais rápido e automatize a cobrança de mensalidades com Pix, Pix Automático, WhatsApp e baixa em tempo real.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20migrar%20boletos%20para%20Pix%20com%20a%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Quero migrar meus boletos
                </a>
                <a href="#precos" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">
                  Ver planos
                </a>
              </div>
              <div className="mt-10 grid gap-4 text-sm text-white/75 sm:grid-cols-3">
                <div>✅ Menos custo que boleto</div>
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

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">O PROBLEMA</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Boleto não é só tarifa. É atraso, esquecimento e trabalho manual.</h2>
            <p className="mt-4 text-lg text-gray-600">A NextGen resolve a cobrança inteira: pagamento, lembrete, status, inadimplência e conciliação.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {painPoints.map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
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

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">FUNCIONALIDADES</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Não é um botão Pix. É uma máquina de cobrança.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-gray-200 p-7">
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
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Migração simples para empresas que ainda vivem de boleto.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map(([number, title, text]) => (
              <div key={number} className="rounded-3xl border border-white/10 bg-white/10 p-6">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 font-black text-slate-950">{number}</div>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm text-white/70">{text}</p>
              </div>
            ))}
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

      <section id="demo" className="bg-gradient-to-br from-slate-950 to-blue-950 px-6 py-20 text-center text-white">
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
