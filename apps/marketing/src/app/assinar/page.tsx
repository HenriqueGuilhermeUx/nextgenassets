'use client';
import { useState } from 'react';

export default function AssinarPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    cpfCnpj: '',
    email: '',
    value: 2990, // R$ 29,90/mês (plano PREMIUM)
    day: 5
  });

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.nextgenassets.com.br/v1/woovi/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxID: form.cpfCnpj.replace(/\D/g, ''),
          value: form.value,
          dayGenerateCharge: form.day
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-emerald-700 text-sm mb-4 inline-block">← Voltar</a>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Assine NextGen</h1>
        <p className="text-gray-700 mb-8">
          Pagamento recorrente via <strong>Pix Automático</strong>. Cancela quando quiser.
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                placeholder="34198276870"
                value={form.cpfCnpj}
                onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg p-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor mensal (centavos)</label>
              <input
                type="number"
                className="w-full border rounded-lg p-2"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: parseInt(e.target.value) })}
              />
              <span className="text-sm text-gray-500">= R$ {(form.value/100).toFixed(2)}/mês</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia do mês</label>
              <input
                type="number"
                min="1"
                max="28"
                className="w-full border rounded-lg p-2"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Criando assinatura...' : 'Criar Assinatura Pix Automático'}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <h3 className="font-semibold text-emerald-900 mb-2">✨ Como funciona</h3>
          <ol className="list-decimal list-inside space-y-1 text-emerald-800">
            <li>Você autoriza o Pix Automático uma vez no app do banco</li>
            <li>Todo dia {form.day} do mês cobramos R$ {(form.value/100).toFixed(2)}</li>
            <li>Split: 3% NextGen + 97% Vendedor (auto-withdraw toda hora)</li>
            <li>Cancela quando quiser, sem multa</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
