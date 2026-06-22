'use client';
import { useState, useEffect } from 'react';

export default function EfiCertsPage() {
  const [certs, setCerts] = useState<any>(null);
  const [envCert, setEnvCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-cert-decode').then(r => r.json()),
      fetch('https://api.nextgenassets.com.br/v1/admin/webhooks/efi-cert-compare').then(r => r.json())
    ]).then(([a, c]) => {
      setCerts(a);
      setEnvCert(c);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">📜 Certificados Efi</h1>
        <p className="text-slate-700 mb-6">Comparação entre certs do painel e do env</p>

        {loading ? <p>Carregando...</p> : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-lg mb-3">1️⃣ Cert no Env Render</h2>
              <div className="text-sm space-y-1">
                <p><strong>Tamanho:</strong> {envCert?.binarySize} bytes</p>
                <p><strong>SHA256:</strong> <code className="bg-slate-100 px-1">{envCert?.sha256}</code></p>
                <p><strong>Status:</strong> {certs?.success === false ? '🔒 Protegido por senha' : '✅ Sem senha'}</p>
                <p className="text-xs text-slate-500 mt-2">{certs?.error || 'OK'}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-lg mb-3">2️⃣ 4 Certs .p12 do painel Efi</h2>
              <ul className="text-sm space-y-1">
                <li>📄 4e2e5062__a84ee533-7e27-4111-bb89-4b02565c35b1.p12</li>
                <li>📄 2b64e575__48e1fb89-623e-451e-b634-5844979538b9.p12</li>
                <li>📄 bfbcf51d__ba1b5256-10e9-4c8d-93ff-00aea4466c6d.p12</li>
                <li>📄 c9fbcf45__3b36e252-d981-4a46-bbbc-0f1bd038319b.p12</li>
              </ul>
              <p className="text-xs text-slate-500 mt-3">
                ✅ Todos SEM SENHA
                <br />
                ❌ Todos retornam SSL alert 40 no mTLS
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-900 mb-2">🎯 Diagnóstico</h3>
              <p className="text-amber-800 text-sm">
                A Efi está rejeitando TODOS os certs do painel. O cert no env Render (3218c3f9...) é DIFERENTE dos 4.
                <br /><br />
                <strong>Causa provável:</strong> Nenhum dos certs está ATIVADO/REGISTRADO na app Open Finance.
                <br /><br />
                <strong>Solução:</strong> Upload de um dos 4 certs via painel Efi, aguardar 2-4h ativação.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
