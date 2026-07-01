'use client';

import { useEffect, useState } from 'react';

const API = 'https://api.nextgenassets.com.br/v1';

type AnyObj = Record<string, any>;

const templates = [
  {
    key: 'friendly-reminder',
    title: 'Lembrete amigável',
    channel: 'whatsapp/e-mail',
    text: 'Olá, {nome}. Passando para lembrar que seu pagamento de {valor} vence em {vencimento}. Para facilitar, segue o link Pix: {link}'
  },
  {
    key: 'due-today',
    title: 'Vence hoje',
    channel: 'whatsapp/e-mail',
    text: 'Olá, {nome}. Seu pagamento de {valor} vence hoje. Você pode pagar com Pix por este link: {link}'
  },
  {
    key: 'pending-payment',
    title: 'Pagamento pendente',
    channel: 'whatsapp/e-mail',
    text: 'Olá, {nome}. Identificamos que o pagamento de {valor}, vencido em {vencimento}, ainda está pendente. Você pode regularizar por aqui: {link}'
  },
  {
    key: 'payment-received',
    title: 'Pagamento recebido',
    channel: 'whatsapp/e-mail',
    text: 'Olá, {nome}. Recebemos seu pagamento de {valor}. Obrigado! Seu financeiro já foi atualizado automaticamente.'
  },
  {
    key: 'pix-auto',
    title: 'Pix recorrente autorizado',
    channel: 'whatsapp/e-mail',
    text: 'Olá, {nome}. Sua autorização de Pix recorrente foi registrada com sucesso. Os próximos pagamentos poderão ser processados automaticamente conforme combinado.'
  },
  {
    key: 'settlement-done',
    title: 'Repasse realizado',
    channel: 'interno/e-mail',
    text: 'Repasse confirmado: o valor de {valor} foi processado e registrado no painel NextGen.'
  }
];

export default function NotificacoesPage() {
  const [partnerSlug, setPartnerSlug] = useState('nextgen-assets');
  const [customerName, setCustomerName] = useState('Cliente Teste');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amountBrl, setAmountBrl] = useState('100');
  const [dueDate, setDueDate] = useState('2026-07-05');
  const [paymentLink, setPaymentLink] = useState('https://nextgenassets.com.br/pagar/teste');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].key);
  const [customMessage, setCustomMessage] = useState('');
  const [result, setResult] = useState<AnyObj | null>(null);
  const [pending, setPending] = useState<AnyObj | null>(null);
  const [logs, setLogs] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(false);

  function renderedMessage() {
    const template = templates.find((item) => item.key === selectedTemplate) || templates[0];
    const base = customMessage || template.text;
    const firstName = customerName.split(' ')[0] || customerName || 'cliente';
    const value = Number(amountBrl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const date = formatDate(dueDate);
    return base
      .replaceAll('{nome}', firstName)
      .replaceAll('{valor}', value)
      .replaceAll('{vencimento}', date)
      .replaceAll('{link}', paymentLink);
  }

  async function api(path: string, options?: RequestInit, showResult = true) {
    setLoading(true);
    try {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      });
      const data = await res.json();
      if (showResult) setResult(data);
      return data;
    } catch (err: any) {
      const data = { success: false, error: err.message };
      if (showResult) setResult(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const slug = encodeURIComponent(partnerSlug);
    const p = await api(`/company-billing/notifications/pending?partnerSlug=${slug}`, undefined, false);
    setPending(p);
    const l = await api(`/company-billing/notifications/logs?partnerSlug=${slug}&limit=50`, undefined, false);
    setLogs(l);
  }

  async function schedule() {
    const response = await api('/company-billing/notifications/schedule-charge', {
      method: 'POST',
      body: JSON.stringify({
        partnerSlug,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        companyName: 'NextGen Assets',
        amountBrl: Number(amountBrl),
        dueDate,
        paymentLink,
        channels: ['whatsapp', 'email']
      })
    });
    setResult({ action: 'schedule-notifications', response });
    await refresh();
  }

  async function runDue(dryRun: boolean) {
    const response = await api('/company-billing/notifications/run-due', {
      method: 'POST',
      body: JSON.stringify({ partnerSlug, dryRun })
    });
    setResult({ action: dryRun ? 'simulate-due' : 'process-due', response });
    await refresh();
  }

  async function sendWhatsappTest() {
    const response = await api('/company-billing/notifications/send-test', {
      method: 'POST',
      body: JSON.stringify({
        partnerSlug,
        channel: 'whatsapp',
        recipientName: customerName,
        recipientRef: customerPhone || 'whatsapp-teste',
        message: renderedMessage(),
        amountBrl: Number(amountBrl),
        dueDate,
        paymentLink
      })
    });
    setResult({ action: 'whatsapp-mock-test', response });
    await refresh();
  }

  async function sendEmailTest() {
    const response = await api('/company-billing/notifications/email/send-test', {
      method: 'POST',
      body: JSON.stringify({
        to: customerEmail,
        subject: templates.find((item) => item.key === selectedTemplate)?.title || 'Aviso NextGen',
        message: renderedMessage()
      })
    });
    setResult({ action: 'email-live-test', response });
    await refresh();
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(renderedMessage());
    setResult({ success: true, action: 'copy-message', message: 'Mensagem copiada.', text: renderedMessage() });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/painel-empresa" className="text-sm font-bold text-emerald-300">← Painel Empresa</a>
        <h1 className="mt-4 text-4xl font-black">Notificações NextGen</h1>
        <p className="mt-2 text-white/60">Central de mensagens automáticas para recebimentos, lembretes, Pix, repasses e recuperação de pagamentos.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card title="Pendentes" value={String(pending?.count ?? 0)} />
          <Card title="Logs" value={String(logs?.count ?? 0)} />
          <Card title="Modo" value="e-mail live / WhatsApp mock" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h2 className="text-2xl font-black">Agendar régua</h2>
            <div className="mt-5 space-y-3">
              <Input label="Partner slug" value={partnerSlug} onChange={setPartnerSlug} />
              <Input label="Cliente" value={customerName} onChange={setCustomerName} />
              <Input label="WhatsApp" value={customerPhone} onChange={setCustomerPhone} />
              <Input label="E-mail" value={customerEmail} onChange={setCustomerEmail} />
              <Input label="Valor R$" value={amountBrl} onChange={setAmountBrl} />
              <Input label="Vencimento" value={dueDate} onChange={setDueDate} />
              <Input label="Link Pix" value={paymentLink} onChange={setPaymentLink} />
              <button onClick={schedule} className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Agendar notificações</button>
              <button onClick={() => runDue(true)} className="w-full rounded-xl border border-white/10 px-4 py-3 font-bold">Simular envio</button>
              <button onClick={() => runDue(false)} className="w-full rounded-xl bg-blue-400 px-4 py-3 font-black text-slate-950">Processar pendentes</button>
              <button onClick={refresh} className="w-full rounded-xl bg-slate-800 px-4 py-3 font-bold">Atualizar</button>
            </div>
          </section>

          <section className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-xl font-black">Templates comerciais</h2>
              <p className="mt-2 text-sm text-white/50">Escolha um modelo, personalize se quiser e teste por e-mail ou WhatsApp mock.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <button key={template.key} onClick={() => { setSelectedTemplate(template.key); setCustomMessage(''); }} className={`rounded-2xl border p-4 text-left ${selectedTemplate === template.key ? 'border-emerald-300 bg-emerald-400/10' : 'border-white/10 bg-slate-950'}`}>
                    <div className="font-black">{template.title}</div>
                    <div className="mt-1 text-xs text-white/40">{template.channel}</div>
                  </button>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="text-xs font-bold uppercase text-white/50">Mensagem personalizada opcional</span>
                <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Use {nome}, {valor}, {vencimento} e {link}" className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-300" />
              </label>
              <div className="mt-5 rounded-2xl bg-slate-950 p-4">
                <div className="text-xs font-bold uppercase text-white/40">Prévia</div>
                <p className="mt-2 text-sm leading-6 text-white/80">{renderedMessage()}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button onClick={copyMessage} className="rounded-xl border border-white/10 px-4 py-3 font-bold">Copiar</button>
                <button onClick={sendWhatsappTest} className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 font-bold text-emerald-100">WhatsApp mock</button>
                <button onClick={sendEmailTest} className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950">Enviar e-mail</button>
              </div>
            </section>

            <Box title="Pendentes agora" data={pending?.notifications || []} />
            <Box title="Logs recentes" data={logs?.logs || []} />
            <section className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-xl font-black">Resposta da API</h2>
              <p className="mt-2 text-sm text-white/50">{loading ? 'Carregando...' : 'Última resposta'}</p>
              <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(result || {}, null, 2)}</pre>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase text-white/50">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-300" /></label>;
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/10 p-6"><div className="text-sm font-bold uppercase text-white/50">{title}</div><div className="mt-2 text-3xl font-black text-emerald-300">{value}</div></div>;
}

function Box({ title, data }: { title: string; data: AnyObj[] }) {
  return <section className="rounded-3xl border border-white/10 bg-white/10 p-6"><h2 className="text-xl font-black">{title}</h2><div className="mt-4 max-h-80 space-y-3 overflow-auto">{data.length ? data.map((item) => <div key={item.id} className="rounded-2xl bg-slate-950 p-4"><div className="font-black">{item.title || item.type}</div><div className="mt-1 text-xs text-white/40">{item.channel} · {item.status} · {item.recipientName}</div><div className="mt-3 text-sm text-white/70">{item.message}</div></div>) : <div className="rounded-2xl bg-slate-950 p-4 text-white/50">Nada aqui ainda.</div>}</div></section>;
}

function formatDate(input: string) {
  if (!input) return '';
  return new Date(`${input.slice(0, 10)}T12:00:00.000Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
