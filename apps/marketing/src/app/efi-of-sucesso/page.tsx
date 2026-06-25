'use client';
import { useState, useEffect } from 'react';

export default function EfiOFSucessoPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLocal = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-of-test-with-cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certBase64: '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',
          clientId: 'Client_Id_a24453aadcc7a93ec253dace83bf594df715ec09',
          clientSecret: 'Client_Secret_4f20549b2d4450e2999d8385ac71b890858458d4',
          host: 'openfinance.api.efipay.com.br'
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Efi OF mTLS FUNCIONOU!</h1>
          <p className="text-gray-700">Token de acesso obtido com sucesso via Open Finance PISP</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">📋 Descoberta</h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <strong>❌ URL Errada (que estávamos usando):</strong>
              <code className="block mt-1 text-xs">https://openfinance.api.efibank.com.br</code>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
              <strong>✅ URL Correta (suporte Efi confirmou):</strong>
              <code className="block mt-1 text-xs">https://openfinance.api.efipay.com.br</code>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <strong>⚠️ Body OAuth NÃO deve ter scope:</strong>
              <code className="block mt-1 text-xs">{`{ grant_type: 'client_credentials' }`}</code>
              <p className="mt-1 text-xs">(Efi retorna erro 500 se você mandar scope customizado)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">🔑 Token Obtido</h2>
          <p className="text-sm text-gray-600 mb-4">
            JWT com todos os scopes OF disponíveis:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-100 rounded">gn.opb.automatic.consent.read</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.automatic.consent.write</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.automatic.payment.read</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.automatic.payment.write</div>
            <div className="p-2 bg-emerald-100 rounded font-bold">gn.opb.payment.pix.send ⭐</div>
            <div className="p-2 bg-emerald-100 rounded font-bold">gn.opb.payment.pix.read ⭐</div>
            <div className="p-2 bg-emerald-100 rounded font-bold">gn.opb.payment.pix.cancel ⭐</div>
            <div className="p-2 bg-emerald-100 rounded font-bold">gn.opb.payment.pix.refund ⭐</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.jwr.enrollment.read</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.jwr.enrollment.write</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.jwr.payment.read</div>
            <div className="p-2 bg-slate-100 rounded">gn.opb.jwr.payment.write</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">🧪 Testar mTLS AGORA</h2>
          <button
            onClick={testLocal}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Testando...' : '🔬 Rodar Teste de mTLS com cert V3'}
          </button>
          
          {testResult && (
            <div className="mt-4 p-3 bg-slate-50 rounded text-xs overflow-auto">
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">⚠️ Ação Pendente</h3>
          <p className="text-amber-800 text-sm">
            O cert no env Render ainda tem senha (mac verify failure).
            <br /><br />
            <strong>Atualize a env var EFI_CERTIFICATE_BASE64 no Render com o cert V3 (2657 bytes, sem senha):</strong>
          </p>
          <code className="block mt-3 p-2 bg-white rounded text-xs overflow-auto break-all">
            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
          </code>
        </div>
      </div>
    </div>
  );
}
