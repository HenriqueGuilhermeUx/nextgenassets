import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pix Automático com repasse D+1 | NextGen Assets',
  description: 'Conheça o Pix Automático NextGen: autorização bancária única, mensalidades recorrentes, acompanhamento de pagamentos e repasse previsto em D+1 dia útil após a confirmação.',
};

const steps = [
  ['01', 'Cadastre o contrato', 'Defina cliente, valor, frequência, vencimento e duração no painel NextGen.'],
  ['02', 'O pagador autoriza no banco', 'Seu cliente recebe a solicitação, confere valores e limites e autoriza uma vez no aplicativo bancário.'],
  ['03', 'A NextGen acompanha os ciclos', 'A cada vencimento, acompanhamos agendamento, resultado e eventual falha da cobrança autorizada.'],
  ['04', 'Recebimento e conciliação', 'O pagamento chega à conta recebedora da NextGen. Identificamos a empresa e conciliamos a entrada bancária.'],
  ['05', 'Crédito previsto em D+1 útil', 'Após o pagamento efetivamente confirmado e conciliado, o repasse à empresa está previsto para o próximo dia útil bancário.']
];

const questions = [
  ['O pagador precisa abrir o banco todo mês?', 'Não, enquanto existir autorização bancária válida e a cobrança respeitar as condições autorizadas. O pagador pode revogar a autorização pelo banco.'],
  ['Quem aparece como recebedor no banco?', 'No modelo centralizado, a conta recebedora é a da NextGen ou da entidade contratualmente identificada na autorização. A empresa contratante é identificada na cobrança e no painel.'],
  ['O dinheiro cai direto na conta da minha empresa?', 'Não nesta modalidade. Ele é recebido primeiro pela NextGen, conciliado e repassado depois à conta cadastrada da sua empresa.'],
  ['O que significa D+1?', 'D é o dia útil bancário em que o pagamento é efetivamente recebido e conciliado pela NextGen; +1 é o próximo dia útil bancário para o crédito previsto do repasse. Sábados, domingos e feriados bancários não contam como dia útil.'],
  ['Paguei na sexta-feira. Quando é previsto o repasse?', 'Na segunda-feira seguinte, se for dia útil bancário, não houver feriado ou bloqueio, e o pagamento tiver sido confirmado e conciliado na sexta-feira.'],
  ['O que ocorre se faltar saldo na conta do pagador?', 'Uma tentativa pode falhar. Acompanhamos o status e a eventual retentativa dependerá das condições autorizadas e das regras disponíveis na infraestrutura bancária. A NextGen não marca o valor como recebido antes da liquidação.'],
  ['A conta da minha empresa precisa ser cadastrada?', 'Sim. Para repasse é necessário cadastrar e validar a conta de titularidade da empresa, sujeita às verificações contratuais e de segurança.'],
  ['O Pix Automático já está disponível para toda a base?', 'Ainda não. O produto está em implantação e homologação. Você pode solicitar uma apresentação e informações sobre o piloto assistido.']
];

export default function PixAutomaticoNextGen() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-16 text-white md:py-24">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-14 flex flex-wrap items-center justify-between gap-4">
            <a href="/" className="text-xl font-black">NextGen Assets</a>
            <div className="flex flex-wrap gap-5 text-sm font-bold text-white/70">
              <a href="#como-funciona" className="hover:text-white">Como funciona</a>
              <a href="#repasse" className="hover:text-white">Repasse D+1</a>
              <a href="#duvidas" className="hover:text-white">Dúvidas</a>
            </div>
          </nav>
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100">
            Lançamento em homologação · Piloto assistido sob consulta
          </div>
          <h1 className="mt-6 max-w-5xl text-4xl font-black leading-tight md:text-6xl">
            Seu cliente autoriza uma vez. A NextGen organiza cada recebimento.
          </h1>
          <p className="mt-7 max-w-4xl text-lg leading-8 text-white/75">
            Pix Automático para mensalidades, planos e contratos. A NextGen recebe os pagamentos,
            confere cada entrada e programa o crédito para sua empresa em <strong>D+1 dia útil bancário</strong>
            após a confirmação e conciliação.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a className="rounded-xl bg-emerald-400 px-7 py-4 font-black text-slate-950 hover:bg-emerald-300"
              href="https://wa.me/5511947984328?text=Quero%20conhecer%20o%20Pix%20Automatico%20NextGen%20e%20o%20piloto%20D%2B1">
              Conhecer o piloto
            </a>
            <a href="/recorrencias/pix-automatico"
              className="rounded-xl border border-white/30 px-7 py-4 font-bold text-white hover:bg-white/10">
              Ver demonstração da jornada
            </a>
          </div>
          <p className="mt-6 max-w-4xl text-sm leading-6 text-white/55">
            Importante: a jornada bancária e os repasses automatizados ainda estão em homologação.
            A previsão D+1 não representa crédito garantido de valores não recebidos ou pendentes de verificação.
          </p>
        </div>
      </section>

      <section id="como-funciona" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-wider text-blue-700">Uma operação simples</p>
          <h2 className="mt-3 text-3xl font-black md:text-4xl">Da autorização do pagador ao repasse da empresa</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <article key={number} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-800">{number}</div>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="repasse" className="bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Como funciona o dinheiro</p>
            <h2 className="mt-4 text-4xl font-black">Recebimento centralizado. Crédito previsto em D+1 útil.</h2>
            <p className="mt-5 leading-8 text-white/70">
              A conta recebedora exibida na autorização bancária é a da NextGen (ou a entidade recebedora
              identificada na contratação). Depois que o Pix é liquidado e conciliado, atribuímos o valor à
              empresa correta, descontamos as tarifas aplicáveis e programamos o repasse bancário.
            </p>
            <p className="mt-4 text-sm leading-6 text-white/50">
              D+1 conta a partir do recebimento <strong>confirmado e conciliado</strong>, em dias úteis bancários.
              Operações recebidas fora da janela operacional, revisões, bloqueios, feriados e indisponibilidades
              podem alterar a previsão, conforme as condições contratuais que serão divulgadas no lançamento.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-7">
            <p className="font-bold text-white/55">Exemplo ilustrativo — pagamento confirmado e conciliado</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-950 p-5">
                <span className="text-xs font-bold text-emerald-300">D — SEGUNDA-FEIRA</span>
                <p className="mt-2 font-black">Pix recebido na conta NextGen</p>
                <p className="mt-1 text-sm text-white/60">Validação bancária e conciliação por empresa</p>
              </div>
              <div className="flex justify-center text-2xl text-emerald-300">↓</div>
              <div className="rounded-2xl bg-slate-950 p-5">
                <span className="text-xs font-bold text-emerald-300">D+1 — TERÇA-FEIRA ÚTIL</span>
                <p className="mt-2 font-black">Crédito previsto na conta da empresa</p>
                <p className="mt-1 text-sm text-white/60">Mediante disponibilidade e transferência efetivamente concluída</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/45">
              Exemplo sem feriado bancário. O prazo efetivo constará do contrato e do comprovante de repasse.
            </p>
          </div>
        </div>
      </section>

      <section id="duvidas" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black md:text-4xl">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {questions.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
                <summary className="cursor-pointer list-none font-bold">{question} <span className="float-right text-blue-700">+</span></summary>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-950 px-6 py-16 text-center text-white">
        <h2 className="text-3xl font-black">Sua empresa pode participar do piloto NextGen.</h2>
        <p className="mx-auto mt-4 max-w-3xl text-white/65">
          Apresentamos o fluxo, explicamos o recebimento centralizado e as condições previstas de repasse.
          A ativação depende da conclusão da homologação e da aprovação da operação.
        </p>
        <a href="https://wa.me/5511947984328?text=Quero%20informacoes%20sobre%20Pix%20Automatico%20NextGen%20D%2B1"
          className="mt-8 inline-flex rounded-xl bg-emerald-400 px-7 py-4 font-black text-slate-950">
          Falar com a NextGen
        </a>
      </section>
    </main>
  );
}
