// ============================================
//  NextGen Assets — Landing Empresas
// ============================================

const products = [
  {
    title: 'Pix Split para marketplaces',
    badge: 'Mais fácil de vender',
    text: 'Receba Pix e divida automaticamente entre loja, vendedor, parceiro e NextGen. Ideal para marketplaces, franquias, infoprodutos e redes de serviços.',
    bullets: ['Split por subconta', 'Comissão configurável', 'Webhook de pagamento', 'Dashboard do parceiro']
  },
  {
    title: 'Pix recorrente para assinaturas',
    badge: 'Receita previsível',
    text: 'Transforme mensalidades, clubes, SaaS e serviços recorrentes em cobrança Pix automatizada, com aviso, confirmação e split.',
    bullets: ['Assinatura mensal', 'Cobrança por dia fixo', 'Aviso antes do vencimento', 'Retenção sem boleto/cartão']
  },
  {
    title: 'Gatilhos comerciais inteligentes',
    badge: 'Diferencial NextGen',
    text: 'Monitore eventos de negócio e dispare ações automáticas: cupom, cobrança, WhatsApp, webhook, split ou alerta para o time comercial.',
    bullets: ['Carrinho abandonado', 'Cliente inativo', 'Estoque baixo', 'Meta de vendas']
  }
];

const triggers = [
  ['Carrinho abandonado', 'Envia cupom ou link Pix depois de X horas sem finalizar.'],
  ['Cliente inativo', 'Reativa quem não compra há 30/60/90 dias.'],
  ['PIX recebido', 'Marca pedido como pago e dispara entrega/webhook.'],
  ['Subscription vencendo', 'Avisa antes da cobrança e reduz churn.'],
  ['Meta de vendas', 'Libera bônus, ranking ou campanha quando bater a meta.'],
  ['Estoque baixo', 'Avisa seller ou aciona reposição.'],
  ['Preço caiu', 'Converte intenção capturada pela extensão em compra/oportunidade.'],
  ['NPS baixo', 'Abre ticket e aciona atendimento antes do churn.']
];

const steps = [
  ['1', 'Conecta a API', 'O parceiro recebe API Key, webhook secret e ambiente de teste.'],
  ['2', 'Cria cobrança ou gatilho', 'Pode vir por API, dashboard, extensão ou formulário guiado.'],
  ['3', 'Cliente paga ou evento dispara', 'A NextGen processa Pix, split, assinatura ou ação comercial.'],
  ['4', 'Empresa recebe resultado', 'Webhook, dashboard, audit log e relatório comercial.']
];

export default function EmpresasPage() {
  return (
    <main className="min-h-screen bg-white text-gray-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-20 flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight">NextGen Assets</a>
            <div className="hidden gap-6 text-sm text-white/70 md:flex">
              <a href="#produtos" className="hover:text-white">Produtos</a>
              <a href="#gatilhos" className="hover:text-white">Gatilhos</a>
              <a href="#precos" className="hover:text-white">Preços</a>
              <a href="/docs" className="hover:text-white">Docs</a>
            </div>
          </nav>

          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Para empresas, marketplaces, ERPs, SaaS e e-commerces
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Venda mais com Pix inteligente e gatilhos comerciais.
              </h1>
              <p className="mt-7 max-w-3xl text-xl leading-8 text-white/75">
                A NextGen coloca split Pix, assinaturas recorrentes, webhooks e automações comerciais dentro do seu negócio. Não somos só gateway: somos o motor que transforma eventos em venda.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="https://wa.me/5511947984328?text=Quero%20uma%20demo%20B2B%20da%20NextGen%20Assets" className="rounded-xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Quero uma demo de 10 minutos
                </a>
                <a href="/api-docs" className="rounded-xl border border-white/20 px-7 py-4 text-center font-bold text-white hover:bg-white/10">
                  Ver documentação
                </a>
              </div>
              <div className="mt-10 grid gap-4 text-sm text-white/70 sm:grid-cols-3">
                <div>✅ API + SDK + Postman</div>
                <div>✅ Split e webhooks</div>
                <div>✅ Gatilhos prontos</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-950 p-5 font-mono text-sm text-emerald-200">
                <div className="text-white/50">POST /v1/triggers</div>
                <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{
  "catalogCode": "GATILHO_CARRINHO_ABANDONADO",
  "naturalLanguageRule": "Se o cliente abandonar o carrinho por 1h, enviar cupom de 10% e link Pix",
  "source": "PARTNER_API",
  "externalUserId": "cliente-123"
}`}</pre>
              </div>
              <div className="mt-4 rounded-2xl bg-emerald-400 p-5 text-slate-950">
                <div className="text-sm font-bold uppercase tracking-wide">Resultado</div>
                <p className="mt-2 text-lg font-black">Webhook + cupom + cobrança Pix criados automaticamente.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produtos" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">O QUE VENDEMOS</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Três produtos simples para gerar negócio agora.</h2>
            <p className="mt-4 text-lg text-gray-600">Sem confundir o cliente com 45 possibilidades. Primeiro vendemos o que aumenta receita, reduz inadimplência e automatiza operação.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.title} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{product.badge}</span>
                <h3 className="mt-5 text-2xl font-black">{product.title}</h3>
                <p className="mt-3 text-gray-600">{product.text}</p>
                <ul className="mt-6 space-y-2 text-sm text-gray-700">
                  {product.bullets.map((bullet) => <li key={bullet}>✓ {bullet}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="gatilhos" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">GATILHOS QUE EMPRESAS ENTENDEM</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Oito gatilhos prontos para vender sem enrolação.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {triggers.map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="font-bold text-blue-600">COMO FUNCIONA</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Integração simples, resultado rastreável.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map(([number, title, text]) => (
              <div key={number} className="rounded-3xl border border-gray-200 p-6">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 font-black text-white">{number}</div>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="font-bold text-emerald-300">MODELO COMERCIAL</p>
            <h2 className="mt-3 text-4xl font-black md:text-5xl">Comece com uma oferta fácil de aprovar.</h2>
            <p className="mt-5 text-lg text-white/70">Para empresas pequenas, vendemos setup + mensalidade + take rate. Para enterprise, white-label e SLA.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Start', 'R$ 497/mês', 'Pix split + 3 gatilhos'],
              ['Growth', 'R$ 1.997/mês', 'Split, assinaturas e 10 gatilhos'],
              ['Enterprise', 'Custom', 'White-label, Open Finance e SLA']
            ].map(([plan, price, text]) => (
              <div key={plan} className="rounded-2xl border border-white/10 bg-white/10 p-6">
                <h3 className="text-xl font-black">{plan}</h3>
                <div className="mt-3 text-2xl font-black text-emerald-300">{price}</div>
                <p className="mt-3 text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <h2 className="mx-auto max-w-4xl text-4xl font-black md:text-5xl">Pronto para transformar eventos em venda?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">Mostramos em 10 minutos como uma empresa pode usar Pix, split e gatilhos comerciais com a NextGen.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href="https://wa.me/5511947984328?text=Quero%20vender%20com%20gatilhos%20NextGen" className="rounded-xl bg-slate-950 px-7 py-4 font-bold text-white hover:bg-slate-800">Falar no WhatsApp</a>
          <a href="/docs" className="rounded-xl border border-gray-300 px-7 py-4 font-bold text-slate-950 hover:bg-gray-50">Ver docs</a>
        </div>
      </section>
    </main>
  );
}
