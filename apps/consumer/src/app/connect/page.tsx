'use client';
import { useState } from 'react';

export default function ConnectPage() {
  const [step, setStep] = useState(1);
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [consentData, setConsentData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleCreateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://api.nextgenassets.com.br/v1/klavi/link/create?cpf=${cpf.replace(/\D/g, '')}`);
      const data = await res.json();
      if (data.success) {
        setLinkData(data);
        setStep(2);
      } else {
        setError(data.error || 'Erro ao criar link');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConsent = async () => {
    setLoading(true);
    setError('');
    try {
      // Cria consent via Efi (vai falhar com SSL alert 40, mas mostra status)
      const res = await fetch(`https://api.nextgenassets.com.br/v1/klavi/consent/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, '') })
      });
      const data = await res.json();
      setConsentData(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🔗 Conectar Banco</h1>
        <p className="text-gray-700 mb-8">
          Conecte sua conta bancária para pagamentos automáticos via Open Finance
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Stepper */}
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 text-center ${step >= s ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                  {s}
                </div>
                <div className="text-sm mt-2">
                  {s === 1 && 'Identificar'}
                  {s === 2 && 'Autorizar'}
                  {s === 3 && 'Pronto'}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
              <input
                type="text"
                placeholder="341.982.768-70"
                className="w-full border rounded-lg p-3 mb-4"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
              <button
                onClick={handleCreateLink}
                disabled={loading || cpf.length < 11}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Gerando link...' : 'Continuar'}
              </button>
            </div>
          )}

          {step === 2 && linkData && (
            <div>
              <h3 className="font-semibold text-lg mb-3">📱 Autorize no app do banco</h3>
              <p className="text-gray-600 mb-4">
                Abra o link abaixo no app do seu banco e autorize a conexão:
              </p>
              {linkData.linkUrl && (
                <a
                  href={linkData.linkUrl}
                  target="_blank"
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-semibold py-3 rounded-lg mb-4"
                >
                  🔗 Abrir app do banco
                </a>
              )}
              <button
                onClick={handleCheckConsent}
                disabled={loading}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Verificando...' : '✓ Já autorizei'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Tudo certo!</h3>
              <p className="text-gray-600 mb-6">Sua conta está conectada.</p>
              <a
                href="/billing"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg"
              >
                Ir para Billing →
              </a>
            </div>
          )}

          {/* Debug info */}
          {(linkData || consentData) && (
            <details className="mt-6 text-xs">
              <summary className="cursor-pointer text-gray-500">Debug</summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
                {JSON.stringify({ linkData, consentData }, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Open Finance Brasil · PISP via Efi · Sandbox Klavi
        </div>
      </div>
    </div>
  );
}
