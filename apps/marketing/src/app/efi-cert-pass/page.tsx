'use client';
import { useState } from 'react';

export default function EfiCertPassPage() {
  const [pass, setPass] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tryPassphrase = async () => {
    setLoading(true);
    try {
      const r = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-cert-try-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwords: [pass] })
      });
      const data = await r.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">🔐 Efi OF - Senha do Certificado</h1>
        <p className="text-slate-700 mb-6">
          O certificado .p12 do Efi (2657 bytes) está protegido por senha.
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">Senha do certificado</label>
          <input
            type="password"
            className="w-full border rounded-lg p-3 mb-4"
            placeholder="Digite a senha (ou deixe vazio)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button
            onClick={tryPassphrase}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg"
          >
            {loading ? 'Testando...' : 'Testar essa senha'}
          </button>

          {result && (
            <div className="mt-4 p-3 bg-slate-50 rounded text-sm overflow-auto">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
