// ============================================
//  NextGen — Payments & Financial Engine
// ============================================

const capabilities = [
  ['Pix para receber de verdade', 'Cobrança avulsa, QR Code, link, vencimento, status e conciliação conectados à operação.'],
  ['Subcontas e split', 'Cada empresa pode ter sua própria conta de recebimento e o valor é direcionado para ela sem depender de BaaS completo.'],
  ['Pix recorrente', 'Mensalidades, contratos e receitas recorrentes com criação e cancelamento governados.'],
  ['Conciliação automática', 'Pagamento confirmado vira evento operacional e baixa o recebível original em vez de criar um financeiro paralelo.'],
  ['Payout Engine', 'Políticas Econômico, Diário e Receber agora para acumular saldo e controlar quando o dinheiro sai da conta de recebimento.'],
  ['Payments orchestration', 'Uma única camada para Pix hoje e cartões, assinaturas e outros meios de pagamento através de providers especializados.']
];

const platformUseCases = [
  ['ERP e software de gestão', 'Transforme contas a receber em cobrança, pagamento e conciliação dentro do próprio produto.'],
  ['SaaS vertical', 'Adicione recebimentos, recorrência e repasses sem precisar reconstruir infraestrutura financeira.'],
  ['Marketplaces e redes', 'Crie contas de recebimento, splits e políticas de payout por participante.'],
  ['Clínicas, escolas e serviços', 'Mensalidades, consultas, contratos e parcelas com cobrança e baixa conectadas.'],
  ['Condomínios e associações', 'Cotas, acordos, segunda via, conciliação e repasses centralizados.'],
  ['NexOffice', 'A NextGen é o motor financeiro invisível que transforma venda, contrato e recebível em dinheiro conciliado.']
];

const architecture = [
  ['1', 'Seu produto entende o negócio', 'ERP, CRM ou NexOffice sabem quem é o cliente, quanto deve, por quê e quando vence.'],
  ['2', 'NextGen executa o pagamento', 'A camada financeira cria cobrança, split, recorrência e acompanha o provider certo.'],
  ['3', 'O dinheiro vai para o recebedor', 'A empresa recebe na própria conta de recebimento conforme a política configurada.'],
  ['4', 'O resultado volta para a operação', 'Pagamento, falha, saldo e payout retornam como eventos para conciliação e automação.']
];

const providers = [
  ['Pix Brasil', 'Woovi', 'Cobranças Pix, subcontas, split, Pix Automático e saque.'],
  ['Cartões & Billing', 'Stripe Connect', 'Cartões, assinaturas, onboarding de contas, application fees e payouts.'],
  ['Brasil-first opcional', 'Asaas', 'Cartão, boleto, Pix, recorrência e split como adapter complementar.']
];

const payoutModes = [
  ['Econômico', 'Acumula saldo e prioriza saque consolidado para reduzir custo operacional.'],
  ['Diário', 'Um repasse consolidado por dia, em vez de um saque para cada venda.'],
  ['Receber agora', 'Saque sob demanda com custo exibido antes da confirmação.']
];

const safety = [
  'Ações financeiras desligadas por padrão até ativação explícita.',
  'Aprovação e confirmação humana para criar ou cancelar operações sensíveis.',
  'Idempotência para evitar cobranças duplicadas.',
  'Resultado incerto bloqueia retry automático.',
  'Credenciais dos providers ficam no backend e nunca no frontend.',
  'Cada workspace recebe somente na conta de recebimento que cadastrou.'
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-24 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 18% 12%, #22c55e 0, transparent 28%), radial-gradient(circle at 82% 8%, #60a5fa 0, transparent 28%)' }} />
        <div className="relative mx-auto max-w-7xl">
          <nav className="mb-20 flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight">NextGen</a>
            <div className="hidden gap-6 text-sm text-white/70 md:flex">
              <a href="#engine" className="hover:text-white">Engine</a>
              <a href="#arquitetura" className="hover:text-white">Como funciona</a>
              <a href="#providers" className="hover:text-white">Providers</a>
              <a href="#payouts" className="hover:text-white">Repasses</a>
              <a href="#integracao" className="hover:text-white">Integração</a>
            </div>
          </nav>

          <div className="grid gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Payments & Financial Engine
              </div>
              <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Da venda ao dinheiro recebido. Uma camada financeira para qualquer produto.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                A NextGen conecta cobrança, Pix, split, recorrência, conciliação e repasses em uma infraestrutura única — pronta para operar por trás de ERPs, SaaS, marketplaces e do NexOffice.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                O cliente final não precisa aprender outro sistema. A NextGen trabalha por baixo: recebe a intenção do produto, executa no provider certo e devolve o resultado financeiro para a operação.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20integrar%20o%20Payments%20Engine%20da%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">Quero integrar</a>
                <a href="#arquitetura" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">Ver arquitetura</a>
              </div>
              <div className="mt-10 grid gap-4 text-sm text-white/75 sm:grid-cols-3">
                <div>✓ Pix + split + subcontas</div>
                <div>✓ Recorrência + conciliação</div>
                <div>✓ Cartões no roadmap Connect</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-emerald-200">
                <div className="text-white/50">Uma única interface financeira</div>
                <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{
  "receivable": "R$ 1.500,00",
  "method": "PIX",
  "destination": "workspace_account",
  "split": "subaccount",
  "status": "PAID",
  "reconciliation": "completed",
  "payoutPolicy": "economic"
}`}</pre>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-400 p-5 text-slate-950"><div className="text-sm font-bold uppercase tracking-wide">Hoje</div><p className="mt-2 text-lg font-black">Pix, subcontas, split, recorrência e conciliação.</p></div>
                <div className="rounded-2xl bg-white p-5 text-slate-950"><div className="text-sm font-bold uppercase tracking-wide text-slate-500">Evolução</div><p className="mt-2 text-lg font-black">Cartões, Billing e Connect no mesmo motor.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="engine" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-4xl"><p className="font-bold text-blue-600">O MOTOR</p><h2 className="mt-3 text-4xl font-black md:text-5xl">Não é mais um painel financeiro. É infraestrutura que faz o financeiro acontecer.</h2><p className="mt-4 text-lg text-gray-600">A NextGen recebe comandos de negócio, governa a execução financeira e devolve evidências para o sistema que já conhece o cliente e a operação.</p></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{capabilities.map(([title, text]) => <div key={title} className="rounded-3xl border border-gray-200 p-7 shadow-sm"><h3 className="text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-gray-600">{text}</p></div>)}</div>
        </div>
      </section>

      <section id="arquitetura" className="bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-4xl"><p className="font-bold text-emerald-300">ARQUITETURA</p><h2 className="mt-3 text-4xl font-black md:text-5xl">O produto pensa. A NextGen executa. O recebedor recebe.</h2><p className="mt-4 text-lg text-white/70">Essa separação permite colocar pagamentos dentro de qualquer software sem criar um segundo ERP, um segundo CRM ou uma segunda fonte da verdade.</p></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{architecture.map(([number, title, text]) => <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-7"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 font-black text-slate-950">{number}</div><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-20"><div className="mx-auto max-w-7xl"><div className="mb-12 max-w-4xl"><p className="font-bold text-blue-600">ONDE ENTRA</p><h2 className="mt-3 text-4xl font-black md:text-5xl">Um engine para produtos que precisam transformar recebível em dinheiro.</h2></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{platformUseCases.map(([title, text]) => <div key={title} className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{text}</p></div>)}</div></div></section>

      <section id="providers" className="px-6 py-20"><div className="mx-auto max-w-7xl"><div className="mb-12 max-w-4xl"><p className="font-bold text-blue-600">ORQUESTRAÇÃO MULTI-PROVIDER</p><h2 className="mt-3 text-4xl font-black md:text-5xl">O método de pagamento muda. A interface da sua aplicação não precisa mudar.</h2><p className="mt-4 text-lg text-gray-600">A NextGen isola detalhes de provider e expõe uma camada comum para criar, acompanhar, conciliar e repassar pagamentos.</p></div><div className="grid gap-6 lg:grid-cols-3">{providers.map(([rail, provider, text]) => <div key={provider} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">{rail}</div><h3 className="mt-3 text-2xl font-black">{provider}</h3><p className="mt-3 text-sm leading-6 text-gray-600">{text}</p></div>)}</div><p className="mt-6 text-sm text-gray-500">Providers e métodos futuros entram como adapters. O produto integrador continua falando com o mesmo Payments Engine.</p></div></section>

      <section id="payouts" className="bg-blue-950 px-6 py-20 text-white"><div className="mx-auto max-w-7xl"><div className="mb-12 max-w-4xl"><p className="font-bold text-emerald-300">PAYOUT ENGINE</p><h2 className="mt-3 text-4xl font-black md:text-5xl">Receber não precisa significar sacar a cada venda.</h2><p className="mt-4 text-lg text-white/70">A NextGen pode acumular saldo por empresa e aplicar uma política de repasse compatível com custo, urgência e operação.</p></div><div className="grid gap-6 md:grid-cols-3">{payoutModes.map(([title, text]) => <div key={title} className="rounded-3xl border border-white/10 bg-white/10 p-7"><h3 className="text-2xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{text}</p></div>)}</div></div></section>

      <section className="px-6 py-20"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-start"><div><p className="font-bold text-blue-600">NEXOFFICE + NEXTGEN</p><h2 className="mt-3 text-4xl font-black md:text-5xl">O cérebro operacional ganha braços financeiros.</h2><p className="mt-5 text-lg leading-8 text-gray-600">No NexOffice, CRM, contratos, recebíveis, cobrança e inteligência continuam pertencendo ao workspace. A NextGen entra só para executar a operação financeira autorizada e devolver o resultado.</p><div className="mt-8 rounded-3xl bg-slate-950 p-6 font-mono text-sm text-emerald-200"><pre className="whitespace-pre-wrap leading-7">{`Cliente → Venda → Contrato → Recebível
                         ↓
                 NextGen Payments
                         ↓
            Pix / Cartão / Recorrência
                         ↓
             Pagamento + Conciliação`}</pre></div></div><div className="rounded-3xl border border-gray-200 p-7"><h3 className="text-2xl font-black">Governança financeira por padrão</h3><div className="mt-6 grid gap-3">{safety.map(item => <div key={item} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">✓ {item}</div>)}</div></div></div></section>

      <section id="integracao" className="bg-gray-50 px-6 py-20"><div className="mx-auto max-w-7xl rounded-3xl bg-slate-950 p-10 text-white md:p-14"><p className="font-bold text-emerald-300">PARA PLATAFORMAS</p><h2 className="mt-3 max-w-4xl text-4xl font-black md:text-5xl">Adicione pagamentos ao seu produto sem transformar pagamentos no seu produto.</h2><p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">Integre uma vez. Use Pix agora. Adicione cartão, assinatura e novos providers depois sem reescrever o núcleo da sua aplicação.</p><div className="mt-8 flex flex-col gap-4 sm:flex-row"><a href="https://wa.me/5511947984328?text=Quero%20integrar%20a%20NextGen%20ao%20meu%20produto" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 hover:bg-emerald-300">Falar sobre integração</a><a href="/api-docs" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold hover:bg-white/10">Ver API</a></div></div></section>

      <footer className="border-t border-gray-200 px-6 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between"><div><b className="text-slate-950">NextGen</b> · Payments & Financial Engine</div><div>Pix hoje. Cartões e novos trilhos pela mesma arquitetura.</div></div></footer>
    </main>
  );
}
