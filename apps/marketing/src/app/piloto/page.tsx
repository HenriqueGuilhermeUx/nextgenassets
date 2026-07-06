const readyItems = [
  'Conta NextGen configurável',
  'Nova cobrança avulsa',
  'Painel de cobranças',
  'Pagamento Pix com split para subconta',
  'Webhook de pagamento',
  'Painel de saldo e repasses',
  'Admin operacional protegido por token',
  'Planos comerciais com 0% por Pix'
];

const testFlow = [
  'Escolher alvos em /alvos-piloto',
  'Enviar /proposta-piloto para a empresa',
  'Abrir /comece com a empresa piloto',
  'Configurar a Conta NextGen da empresa',
  'Criar uma nova cobrança de teste',
  'Gerar o Pix usando a conta salva',
  'Pagar o Pix',
  'Conferir a cobrança como paga',
  'Conferir saldo no painel de repasses',
  'Registrar o pedido no admin operacional'
];

const commercialRoutes = [
  ['/alvos-piloto', 'Alvos do piloto', 'Segmentos ideais, critério de escolha e lista dos primeiros contatos.'],
  ['/proposta-piloto', 'Proposta para empresa piloto', 'Página para apresentar a solução e explicar o piloto.'],
  ['/comece', 'Guia de início', 'Página simples para a empresa configurar e testar.'],
  ['/kit-piloto', 'Kit comercial', 'Mensagens, objeções, qualificação e roteiro de reunião.'],
  ['/validacao-piloto', 'Validação do piloto', 'Checklist para validar o fluxo de ponta a ponta.']
];

const productRoutes = [
  ['/operacao', 'Central de operação'],
  ['/painel-empresa', 'Painel diário da empresa'],
  ['/conta-nextgen', 'Configuração da empresa'],
  ['/nova-cobranca', 'Nova cobrança'],
  ['/cobrancas', 'Gestão de cobranças'],
  ['/regua-cobranca', 'Régua de cobrança'],
  ['/repasses', 'Saldo e repasses'],
  ['/repasses-admin', 'Admin operacional'],
  ['/planos', 'Planos comerciais']
];

export default function PilotoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm font-black text-emerald-300">← NextGen Assets</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Central do Piloto</div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Tudo pronto para abordar e testar com uma empresa.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">Use esta página como hub do piloto: escolha de alvos, proposta, abordagem comercial, onboarding da empresa e validação final.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric title="Modelo" value="0% por Pix" />
            <Metric title="Produto" value="Recebimentos" />
            <Metric title="Operação" value="Assistida" />
            <Metric title="Status" value="Piloto" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {commercialRoutes.map(([href, title, text]) => (
            <a key={href} href={href} className="group rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 transition hover:-translate-y-1 hover:bg-emerald-400/15">
              <div className="text-sm font-black uppercase text-emerald-300">Comercial</div>
              <h2 className="mt-4 text-2xl font-black group-hover:text-emerald-300">{title}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-white/65">{text}</p>
              <div className="mt-5 text-sm font-black text-emerald-300">Abrir {href} →</div>
            </a>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Checklist title="Funcionalidades prontas" items={readyItems} />
          <Checklist title="Roteiro de teste" items={testFlow} />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-6">
          <h2 className="text-3xl font-black">Telas do produto</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {productRoutes.map(([href, text]) => (
              <a key={href} href={href} className="rounded-2xl bg-slate-950 p-4 transition hover:bg-white/10">
                <div className="font-black text-emerald-300">{href}</div>
                <div className="mt-2 text-sm text-white/60">{text}</div>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-7">
          <h2 className="text-3xl font-black">Mensagem para cliente piloto</h2>
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-white/70">
            <p>A Conta NextGen ajuda sua empresa a organizar recebimentos Pix, gerar cobranças, acompanhar pagamentos e controlar solicitações de repasse em um painel simples.</p>
            <p className="mt-3">No piloto, a operação é assistida para garantir segurança, conciliação correta e evolução do produto com base no uso real.</p>
            <p className="mt-3 text-emerald-300">Link recomendado para enviar primeiro: https://nextgenassets.com.br/proposta-piloto</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
      <h2 className="text-2xl font-black text-emerald-300">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item) => <div key={item} className="rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white/70">✓ {item}</div>)}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-slate-950 p-5"><div className="text-xs font-black uppercase text-white/45">{title}</div><div className="mt-2 text-xl font-black text-emerald-300">{value}</div></div>;
}
