'use client';
import { useState } from 'react';

export default function EfiDebugPage() {
  const [pass, setPass] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tryPassphrase = async (p: string) => {
    setLoading(true);
    try {
      const r = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-cert-try-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwords: [p] })
      });
      const data = await r.json();
      setResult({ attempt: p || '(vazia)', ...data });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">🔧 Efi OF Debug</h1>
        <p className="text-slate-700 mb-6">
          O cert .p12 do Efi no Render (2657 bytes) está com senha. 
          Teste várias senhas pra descobrir a correta.
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="font-semibold text-lg mb-3">1️⃣ Tentar senha do cert</h2>
          <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
          <input
            type="password"
            className="w-full border rounded-lg p-3 mb-4"
            placeholder="Digite a senha (ou deixe vazio)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => tryPassphrase(pass)}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? 'Testando...' : '🔑 Testar essa senha'}
            </button>
            <button
              onClick={() => { setPass(''); tryPassphrase(''); }}
              className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg"
            >
              Vazia
            </button>
          </div>

          {result && (
            <div className="mt-4 p-3 bg-slate-50 rounded text-sm overflow-auto">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">💡 Solução alternativa - Cloudflare</h3>
          <p className="text-amber-800 text-sm mb-2">
            Outro dev da comunidade Efi reportou que desativando o proxy do Cloudflare resolveu SSL Alert 40:
          </p>
          <ol className="list-decimal list-inside text-amber-800 space-y-1 text-sm">
            <li>Cloudflare DNS → domínio nextgenassets.com.br</li>
            <li>Mudar proxy de <strong>Proxied (laranja)</strong> para <strong>DNS only (cinza)</strong></li>
            <li>Isso bypassa o CDN do Cloudflare e a Efi consegue fazer mTLS direto</li>
          </ol>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <h3 className="font-semibold text-emerald-900 mb-2">🎯 Status atual</h3>
          <ul className="text-emerald-800 text-sm space-y-1">
            <li>✅ Cert V3 (2657 bytes) anexado, sem senha</li>
            <li>❌ mTLS com Efi: SSL alert 40 (Efi rejeita)</li>
            <li>❌ Cert no env: protegido por senha desconhecida</li>
            <li>✅ Plano B: WooVi Subscription recorrente (já funciona)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
