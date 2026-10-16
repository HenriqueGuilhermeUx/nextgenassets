'use client';

import { useMemo, useState } from 'react';

/**
 * Preview UI only. Merchant authentication and tenant-scoped endpoints must be
 * available before connecting this page to the Efí backend. No tokens or
 * sensitive data stored in browser or transmitted to APIs.
 */
export default function PixAutomaticoPage() {
  const [view, setView] = useState<'empresa'|'pagador'>('empresa');
  const [amount, setAmount] = useState('350');
  const [count, setCount] = useState('12');
  const [dueDay, setDueDay] = useState('10');
  const [description, setDescription] = useState('Mensalidade escolar');
  const value = Number(amount.replace(',', '.'));
  const months = Number(count);
  const day = Number(dueDay);
  const valid = Number.isFinite(value) && value > 0 &&
    Number.isInteger(months) && months >= 1 && months <= 120 &&
    Number.isInteger(day) && day >= 1 && day <= 28;
  const total = useMemo(() => valid ? value * months : 0, [value, months, valid]);
  const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="/recorrencias" className="text-sm font-bold text-emerald-300">← Recorrências NextGen</a>
          <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
            Em homologação · Sem débitos reais
          </div>
        </div>
        <header className="mt-7 rounded-3xl border border-white/10 bg-white/5 p-7 md:p-10">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-emerald-300">NextGen Recorrência</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Pix Automático para seus clientes</h1>
          <p className="mt-4 max-w-3xl leading-7 text-white/65">
            Um contrato, uma autorização no banco e parcelas administradas pela NextGen.
            Nosso motor atual de recorrências será ligado à Efí, com conciliação e repasses.
          </p>
          <p className="mt-3 text-sm text-amber-200">
            Esta tela demonstra a jornada proposta. Nenhum cadastro bancário, autorização, pagamento ou repasse é efetuado aqui.
          </p>
        </header>

        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={() => setView('empresa')}
            className={`rounded-xl px-5 py-3 text-sm font-black ${view === 'empresa' ? 'bg-emerald-400 text-slate-950' : 'border border-white/15 bg-white/5 text-white'}`}>
            Visão da empresa
          </button>
          <button type="button" onClick={() => setView('pagador')}
            className={`rounded-xl px-5 py-3 text-sm font-black ${view === 'pagador' ? 'bg-emerald-400 text-slate-950' : 'border border-white/15 bg-white/5 text-white'}`}>
            Jornada do pagador
          </button>
        </div>

        {view === 'empresa' ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <h2 className="text-xl font-black">Prévia de um contrato recorrente</h2>
              <div className="mt-5 space-y-4">
                <Field label="Descrição" value={description} onChange={setDescription}/>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Mensalidade (R$)" value={amount} onChange={setAmount} inputMode="decimal"/>
                  <Field label="Número de meses" value={count} onChange={setCount} inputMode="numeric"/>
                </div>
                <Field label="Dia de vencimento (1 a 28)" value={dueDay} onChange={setDueDay} inputMode="numeric"/>
              </div>
              {!valid && <p className="mt-4 text-sm text-red-300">Confira valor, duração (1–120) e vencimento (1–28).</p>}
              <div className="mt-6 rounded-2xl bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-wider text-white/50">Total contratado — demonstrativo</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{valid ? money(total) : '—'}</p>
                <p className="mt-2 text-sm text-white/55">
                  {valid ? `${months} mensalidades de ${money(value)}, todo dia ${day}.` : 'Preencha valores válidos.'}
                </p>
              </div>
              <p className="mt-4 text-sm text-white/50">
                Para enviar a autorização real, precisamos concluir autenticação por empresa e homologação Efí.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <h2 className="text-xl font-black">O que o painel mostrará</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Autorizações" value="Pendente"/>
                <Metric label="Parcelas pagas" value="—"/>
                <Metric label="Próximo ciclo" value="—"/>
                <Metric label="Repasses" value="—"/>
              </div>
              <h3 className="mt-7 font-black">Etapas para ativação</h3>
              <ol className="mt-3 space-y-3 text-sm text-white/70">
                <li>1. Vincular contrato ao pagador autenticado.</li>
                <li>2. Solicitar adesão e enviar link bancário Efí.</li>
                <li>3. Confirmar consentimento pela consulta oficial.</li>
                <li>4. Gerar ciclos únicos, sem segunda cobrança Pix.</li>
                <li>5. Conciliar liquidação e atribuir saldo para repasse.</li>
              </ol>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <h2 className="text-xl font-black">Como seu cliente autorizará</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/70">
                <div className="rounded-xl bg-slate-900 p-5">1. Recebe o convite individual para <strong>Pix Automático</strong>.</div>
                <div className="rounded-xl bg-slate-900 p-5">2. Confere recebedor, valor, frequência, limites e duração.</div>
                <div className="rounded-xl bg-slate-900 p-5">3. É redirecionado ao banco e autoriza na instituição bancária.</div>
                <div className="rounded-xl bg-slate-900 p-5">4. A NextGen aguarda o status confirmado pela Efí.</div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <h2 className="text-xl font-black">Prévia de consentimento</h2>
              <dl className="mt-5 space-y-4">
                <DataRow label="Finalidade" value={description.trim() || 'Mensalidade recorrente'}/>
                <DataRow label="Valor por ciclo" value={valid ? money(value) : '—'}/>
                <DataRow label="Frequência" value="Mensal"/>
                <DataRow label="Duração" value={valid ? `${months} ciclos` : '—'}/>
                <DataRow label="Dia de pagamento" value={valid ? `Dia ${day}` : '—'}/>
                <DataRow label="Autorização bancária" value="Ainda não solicitada"/>
              </dl>
              <div className="mt-7 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                Apenas demonstração. Nenhuma autorização é solicitada ao banco por esta página.
              </div>
            </div>
          </section>
        )}

        <p className="mt-8 text-sm text-white/50">
          Importante: Pix Automático não garante saldo na conta do pagador; falhas e revogações permanecem possíveis.
        </p>
      </div>
    </main>
  );
}

function Field({label,value,onChange,inputMode='text'}:{
  label:string; value:string; onChange:(value:string)=>void; inputMode?:'text'|'numeric'|'decimal'
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-white/70">{label}</span>
      <input type="text" inputMode={inputMode} maxLength={100} value={value}
        onChange={e=>onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-300"/>
    </label>
  );
}
function Metric({label,value}:{label:string,value:string}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-2 text-base font-black">{value}</p>
    </div>
  );
}
function DataRow({label,value}:{label:string,value:string}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
      <dt className="text-sm text-white/50">{label}</dt>
      <dd className="text-right text-sm font-bold">{value}</dd>
    </div>
  );
}
