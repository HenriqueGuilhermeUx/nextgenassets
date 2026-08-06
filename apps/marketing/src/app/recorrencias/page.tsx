'use client';

import { useEffect, useMemo, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

const templates: Record<string, any> = {
  escola: {
    label: 'Escola / curso',
    entity: 'Aluno',
    payer: 'Responsável',
    title: 'Mensalidade escolar',
    amount: '350.00',
    dueDay: '10',
    months: '12',
    fields: ['Aluno', 'Responsável', 'Turma', 'Mês de referência'],
    examples: ['Turma 6º ano', 'Mensalidade Agosto', 'Responsável financeiro'],
    dashboard: ['Alunos pagos', 'Alunos pendentes', 'Inadimplência por turma']
  },
  dentista: {
    label: 'Dentista / clínica',
    entity: 'Paciente',
    payer: 'Paciente',
    title: 'Parcela de tratamento',
    amount: '250.00',
    dueDay: '10',
    months: '6',
    fields: ['Paciente', 'Tratamento', 'Parcela', 'Profissional'],
    examples: ['Tratamento ortodôntico', 'Parcela 1 de 6', 'Dr(a). responsável'],
    dashboard: ['Tratamentos ativos', 'Parcelas pendentes', 'Pacientes em atraso']
  },
  academia: {
    label: 'Academia / studio',
    entity: 'Aluno',
    payer: 'Aluno',
    title: 'Mensalidade do plano',
    amount: '129.90',
    dueDay: '5',
    months: '12',
    fields: ['Aluno', 'Plano', 'Modalidade', 'Renovação'],
    examples: ['Plano mensal', 'Musculação', 'Renovação automática'],
    dashboard: ['Planos ativos', 'Renovações próximas', 'Mensalidades vencidas']
  },
  condominio: {
    label: 'Condomínio / associação',
    entity: 'Morador ou associado',
    payer: 'Responsável pela unidade',
    title: 'Cota mensal',
    amount: '420.00',
    dueDay: '10',
    months: '12',
    fields: ['Morador', 'Unidade', 'Competência', 'Tipo de cota'],
    examples: ['Apartamento 101', 'Cota ordinária', 'Competência Agosto'],
    dashboard: ['Unidades em dia', 'Unidades pendentes', 'Acordos ativos']
  },
  servicos: {
    label: 'Serviço recorrente',
    entity: 'Cliente',
    payer: 'Responsável financeiro',
    title: 'Mensalidade de contrato',
    amount: '500.00',
    dueDay: '10',
    months: '12',
    fields: ['Cliente', 'Contrato', 'Serviço', 'Centro de custo'],
    examples: ['Contrato mensal', 'Serviço recorrente', 'Responsável financeiro'],
    dashboard: ['Contratos ativos', 'Clientes pendentes', 'MRR previsto']
  }
};

export default function RecorrenciasPage() {
  const [businessType, setBusinessType] = useState('servicos');
  const template = templates[businessType] || templates.servicos;

  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [externalCustomerId, setExternalCustomerId] = useState('cliente-001');
  const [customerName, setCustomerName] = useState('Cliente teste');
  const [document, setDocument] = useState('');
  const [contact, setContact] = useState('');
  const [title, setTitle] = useState(template.title);
  const [amount, setAmount] = useState(template.amount);
  const [dueDay, setDueDay] = useState(template.dueDay);
  const [months, setMonths] = useState(template.months);
  const [fieldOne, setFieldOne] = useState(template.examples[0]);
  const [fieldTwo, setFieldTwo] = useState(template.examples[1]);
  const [channel, setChannel] = useState('WhatsApp + e-mail');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const recurrenceSummary = useMemo(() => {
    const count = Math.max(1, Number(months || 1));
    const cents = Math.round(Number(amount || 0) * 100);
    const total = (count * cents) / 100;
    return { count, total };
  }, [amount, months]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    if (tipo && templates[tipo]) setBusinessType(tipo);
  }, []);

  useEffect(() => {
    const next = templates[businessType] || templates.servicos;
    setTitle(next.title);
    setAmount(next.amount);
    setDueDay(next.dueDay);
    setMonths(next.months);
    setFieldOne(next.examples[0]);
    setFieldTwo(next.examples[1]);
  }, [businessType]);

  async function call(path: string, options?: RequestInit) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      });
      const json = await res.json();
      setData(json);
      return json;
    } catch (err: any) {
      const json = { success: false, error: err.message };
      setData(json);
      return json;
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    await call(`/company-billing/recurrences?partnerSlug=${encodeURIComponent(partnerSlug)}`);
  }

  async function createRecurrence() {
    await call('/company-billing/recurrences', {
      method: 'POST',
      body: JSON.stringify({
        partnerSlug,
        externalCustomerId,
        customerName,
        document,
        contact,
        businessType,
        title,
        description: `${template.label} - ${fieldOne} - ${fieldTwo}`,
        amount: Number(amount),
        dueDay: Number(dueDay),
        months: Number(months),
        channel,
        provider: 'WOOVI',
        metadata: {
          businessType,
          verticalLabel: template.label,
          entityLabel: template.entity,
          payerLabel: template.payer,
          fieldOne,
          fieldTwo,
          channel,
          months: Number(months)
        }
      })
    });
  }

  async function generateDue() {
    await call('/company-billing/recurrences/generate-due', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, dryRun: false, limit: 50 })
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/tipo-negocio" className="text-sm font-black text-emerald-300">← Tipo de negócio</a>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 md:p-10">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Recorrência inteligente</div>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">Cadastre uma vez. A NextGen cobra periodicamente.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/65">A recorrência é o coração da operação: cliente final, valor, vencimento, duração, canal de comunicação e acompanhamento por tipo de negócio.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric title="Tipo" value={template.label} />
            <Metric title="Cliente final" value={template.entity} />
            <Metric title="Cobranças" value={`${recurrenceSummary.count} períodos`} />
            <Metric title="Total previsto" value={formatMoney(recurrenceSummary.total)} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black text-emerald-300">Nova recorrência</h2>
            <div className="mt-5 space-y-3">
              <Select label="Tipo de negócio" value={businessType} setValue={setBusinessType} options={Object.entries(templates).map(([value, item]) => [value, item.label])} />
              <Field label="Empresa" value={partnerSlug} setValue={setPartnerSlug} />
              <Field label={`Código do ${template.entity.toLowerCase()}`} value={externalCustomerId} setValue={setExternalCustomerId} />
              <Field label={template.entity} value={customerName} setValue={setCustomerName} />
              <Field label="Documento" value={document} setValue={setDocument} placeholder="CPF/CNPJ opcional" />
              <Field label="Contato para cobrança" value={contact} setValue={setContact} placeholder="WhatsApp ou e-mail" />
              <Field label="Título da cobrança" value={title} setValue={setTitle} />
              <Field label={template.fields[3] || 'Referência'} value={fieldOne} setValue={setFieldOne} />
              <Field label={template.fields[4] || 'Detalhe'} value={fieldTwo} setValue={setFieldTwo} />
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Valor" value={amount} setValue={setAmount} />
                <Field label="Dia vencimento" value={dueDay} setValue={setDueDay} />
                <Field label="Duração meses" value={months} setValue={setMonths} />
              </div>
              <Select label="Canal planejado" value={channel} setValue={setChannel} options={['WhatsApp + e-mail', 'WhatsApp', 'E-mail', 'Manual assistido'].map((v) => [v, v])} />
              <button onClick={createRecurrence} disabled={loading} className="w-full rounded-xl bg-emerald-400 px-4 py-4 font-black text-slate-950 disabled:opacity-60">Criar recorrência</button>
              <button onClick={generateDue} disabled={loading} className="w-full rounded-xl bg-blue-400 px-4 py-4 font-black text-slate-950 disabled:opacity-60">Gerar cobranças vencendo</button>
              <button onClick={load} disabled={loading} className="w-full rounded-xl border border-white/10 px-4 py-4 font-bold disabled:opacity-60">Atualizar recorrências</button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
              <h2 className="text-2xl font-black">Modelo carregado</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">Esta tela muda a linguagem conforme a operação escolhida.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {template.fields.map((item: string) => <div key={item} className="rounded-2xl bg-slate-950 p-4 text-sm text-white/70">✓ {item}</div>)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black">Painel esperado</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {template.dashboard.map((item: string) => <div key={item} className="rounded-2xl bg-slate-950 p-4 text-sm text-white/70">{item}</div>)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black">Resposta da operação</h2>
              <p className="mt-2 text-sm text-white/50">{loading ? 'Carregando...' : 'Última ação executada'}</p>
              <pre className="mt-4 max-h-[360px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(data || {}, null, 2)}</pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-white/50">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none" />
    </label>
  );
}

function Select({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[][] }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-white/50">{label}</span>
      <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none">
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-5">
      <div className="text-xs font-black uppercase text-white/45">{title}</div>
      <div className="mt-2 text-xl font-black text-emerald-300">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
