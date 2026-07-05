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

const features = [
  ['Cobranças Pix', 'Crie cobranças avulsas ou recorrentes com link, QR Code, vencimento e controle de status.'],
  ['Régua de cobrança', 'Mensagens antes, no dia e depois do vencimento para reduzir esquecimento e atraso.'],
  ['Painel da empresa', 'Acompanhe pendentes, pagos, saldo estimado, repasses e próximas ações em uma visão simples.'],
  ['Conciliação', 'Webhook, histórico, status e logs para o financeiro não depender de planilha manual.'],
  ['Repasses controlados', 'Pedidos de repasse, agenda por plano e operação manual segura no piloto.'],
  ['API e operação assistida', 'Evolua para integrações com ERP, CRM, checkout, sistemas próprios e white-label.']
];

const flow = [
  ['1', 'Configure a empresa', 'Salve a conta recebedora uma vez e deixe o sistema usar essa configuração nas cobranças.'],
  ['2', 'Crie a cobrança', 'Informe cliente, valor e vencimento. A NextGen gera o Pix e o link de pagamento.'],
  ['3', 'Comunique o pagador', 'Use mensagens prontas para lembrar, recuperar e confirmar pagamentos.'],
  ['4', 'Acompanhe e repasse', 'Veja status, saldo, solicitações e operação de repasse em painéis separados.']
];

const pricing = [
  ['Starter', 'R$ 79/mês', 'até 50 cobranças/mês', '0% NextGen por Pix'],
  ['Growth', 'R$ 149/mês', 'até 200 cobranças/mês', '0% NextGen por Pix'],
  ['Pro', 'R$ 299/mês', 'até 1.000 cobranças/mês', '0% NextGen por Pix'],
  ['Enterprise', 'Sob consulta', 'alto volume, API e white-label', 'contrato sob medida']
];

const revenue = [
  ['Assinatura mensal', 'Receita previsível por plano, sem pedágio NextGen por Pix no plano base.'],
  ['Excedente de volume', 'Cobranças acima do limite mensal podem entrar como pacote adicional.'],
  ['Comunicação premium', 'Régua avançada, recuperação de pagamentos e campanhas de reativação.'],
  ['Repasse antecipado', 'Produto extra para empresas que querem sair da agenda padrão do plano.']
];

const routes = [
  ['/painel-empresa', 'Painel'],
  ['/nova-cobranca', 'Nova cobrança'],
  ['/cobrancas', 'Cobranças'],
  ['/regua-cobranca', 'Régua'],
  ['/planos', 'Planos'],
  ['/piloto', 'Piloto']
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
                Pix + cobranças + mensagens + repasses
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Receba melhor com Pix, comunicação e controle de repasses.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                A Conta NextGen ajuda empresas a criar cobranças Pix, lembrar clientes, acompanhar pagamentos e organizar repasses em um painel simples.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                No plano base, a NextGen não cobra percentual por Pix. A receita vem de assinatura, automações premium, excedente de volume e repasse antecipado.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20conhecer%20a%20Conta%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Quero conhecer
                </a>
                <a href="/piloto" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">
                  Ver piloto
                </a>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <a href="/painel-empresa" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-center text-sm font-bold text-emerald-100 hover:bg-emerald-400/20">Painel</a>
                <a href="/nova-cobranca" className="rounded-xl border border-blue-300/30 bg-blue-300/10 px-5 py-3 text-center text-sm font-bold text-blue-100 hover:bg-blue-300/20">Nova cobrança</a>
                <a href="/planos" className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/20">Planos</a>
              </div>

              <div className="mt-10 grid gap-4 text-sm text-white/75 sm:grid-cols-3">
                <div>✅ 0% NextGen por Pix</div>
                <div>✅ Régua de cobrança</div>
                <div>✅ Repasses organizados</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-emerald-200">
                <div className="text-white/50">Jornada de recebimento</div>
                <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{
  "cobranca": "Pix",
  "valor": "100.00",
  "vencimento": "hoje",
  "comunicacao": ["lembrete", "pendencia", "confirmacao"],
  "status": "pago",
  "repasse": "controlado"
}`}</pre>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-400 p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide">Empresa</div>
                  <p className="mt-2 text-lg font-black">Cobra, acompanha e solicita repasse.</p>
                </div>
                <div className="rounded-2xl bg-white p-5 text-slate-950">
                  <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Cliente</div>
                  <p className="mt-2 text-lg font-black">Recebe link, paga Pix e recebe confirmação.</p>
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
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Não é só Pix. É a operação de recebimentos.</h2>
            <p className="mt-4 text-lg text-gray-600">A NextGen organiza o caminho entre vender, cobrar, lembrar, receber, confirmar, conciliar e repassar.</p>
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
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Da cobrança ao repasse, tudo conectado.</h2>
            <p className="mt-4 text-lg text-white/70">A empresa não precisa entender termos técnicos. Ela vê cobrança criada, cliente avisado, pagamento confirmado e saldo acompanhado.</p>
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
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Para empresas que dependem de recebimento recorrente ou organizado.</h2>
            <p className="mt-4 text-lg text-gray-600">Serve para pagamentos pontuais, mensalidades, contratos, parcelas, assinaturas, acordos ou operações com repasse.</p>
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
            <p className="font-bold text-blue-600">MODELO DE RECEITA</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Sem pedágio NextGen por Pix no plano base.</h2>
            <p className="mt-4 text-lg text-gray-600">O produto ganha força na assinatura e nas camadas de automação, não em punir cada recebimento.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {revenue.map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">PLANOS</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Preço simples para começar.</h2>
            <p className="mt-4 text-lg text-gray-600">Mensalidade por plano, volume incluído e 0% NextGen por Pix no plano base.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {pricing.map(([plan, price, volume, fee]) => (
              <div key={plan} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <h3 className="text-2xl font-black">{plan}</h3>
                <div className="mt-4 text-3xl font-black text-blue-700">{price}</div>
                <p className="mt-3 text-sm text-gray-600">{volume}</p>
                <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{fee}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/planos" className="inline-flex rounded-xl bg-slate-950 px-7 py-4 font-bold text-white hover:bg-slate-800">Ver detalhes dos planos</a>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">ATALHOS DO PILOTO</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Teste o fluxo completo.</h2>
            <p className="mt-4 text-lg text-gray-600">As telas abaixo já formam o piloto assistido da Conta NextGen.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {routes.map(([href, label]) => (
              <a key={href} href={href} className="rounded-2xl border border-gray-200 bg-white p-5 text-center font-black text-slate-800 shadow-sm hover:border-blue-300 hover:text-blue-700">{label}</a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-slate-950 to-blue-950 px-6 py-20 text-center text-white">
        <h2 className="mx-auto max-w-4xl text-4xl font-black md:text-5xl">Quer organizar os recebimentos do seu negócio?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">Em 10 minutos mostramos como a Conta NextGen cria cobranças Pix, comunicação, conciliação e repasses para sua operação.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href="https://wa.me/5511947984328?text=Quero%20uma%20demo%20da%20Conta%20NextGen" className="rounded-xl bg-emerald-400 px-7 py-4 font-bold text-slate-950 hover:bg-emerald-300">Quero uma demo</a>
          <a href="/painel-empresa" className="rounded-xl border border-white/20 px-7 py-4 font-bold text-white hover:bg-white/10">Ver painel empresa</a>
        </div>
      </section>
    </main>
  );
}
