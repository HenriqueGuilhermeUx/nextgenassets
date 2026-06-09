'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export default function PartnerPortal() {
  const [partners, setPartners] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    api.get('/partners')
      .then((p: any[]) => {
        setPartners(p);
        if (p[0]) setSelected(p[0]);
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) {
      api.get(`/reports/partner/${selected.id}`).then(setReport).catch(() => {});
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">N</div>
            <div>
              <div className="font-bold">Partner Portal</div>
              <div className="text-xs text-gray-500">NextGen Assets</div>
            </div>
          </div>
          {partners.length > 0 && (
            <select
              value={selected?.id}
              onChange={e => setSelected(partners.find(p => p.id === e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-gray-500">{apiOnline ? 'API Online' : 'API Offline'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* API Status Banner */}
        {!apiOnline && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="font-semibold text-red-900">⚠️ API não tá respondendo</div>
            <div className="text-sm text-red-700 mt-1">
              Endpoint: <code className="bg-red-100 px-1 rounded">{API_URL}</code>
            </div>
            <div className="text-sm text-red-700 mt-2">
              Verifique se a API tá no ar:{' '}
              <a href={API_URL + '/health'} target="_blank" className="underline">{API_URL}/health</a>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Carregando parceiros...</div>
        ) : !selected ? (
          <EmptyState apiOnline={apiOnline} />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold">{selected.name}</h1>
              <p className="text-gray-500">{selected.type} · Plano {selected.tier}</p>
            </div>

            {report && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Card title="Usuários Ativos" value={report.kpis?.activeUsers || 0} icon="👥" />
                  <Card title="Gatilhos Ativos" value={report.kpis?.activeTriggers || 0} icon="⚡" />
                  <Card title="Volume Movimentado" value={`R$ ${(report.kpis?.totalVolumeBrl || 0).toFixed(2)}`} icon="💰" />
                  <Card title="Take-Rate Acumulado" value={`R$ ${(report.kpis?.estimatedRevenueBrl || 0).toFixed(2)}`} icon="📈" highlight />
                </div>

                <section className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
                  <h2 className="text-xl font-bold mb-4">Performance do Mês</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Stat label="Taxa de Sucesso" value={`${(report.kpis?.successRate || 0).toFixed(1)}%`} />
                    <Stat label="Execuções no Mês" value={report.kpis?.executionsThisMonth || 0} />
                    <Stat label="Execuções com Sucesso" value={report.kpis?.successfulExecutions || 0} />
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="text-xl font-bold mb-4">Top Gatilhos (seus usuários)</h2>
                  {report.topTriggers?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase border-b">
                          <th className="py-2">Gatilho</th>
                          <th className="py-2">Código</th>
                          <th className="py-2">Execuções</th>
                          <th className="py-2">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.topTriggers.map((t: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-3 font-semibold">{t.name}</td>
                            <td className="py-3 font-mono text-xs">{t.code}</td>
                            <td className="py-3">{t.count}</td>
                            <td className="py-3">R$ {t.totalBrl.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-gray-500 text-sm">Nenhuma execução ainda</p>}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ apiOnline }: { apiOnline: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🏢</div>
      <h2 className="text-2xl font-bold mb-2">Nenhum parceiro cadastrado</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {apiOnline
          ? 'Crie seu primeiro parceiro B2B no Admin pra começar.'
          : 'A API não tá respondendo. Verifique se o backend tá rodando.'}
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="https://nga-admin.vercel.app"
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Ir pro Admin →
        </Link>
        <a
          href={API_URL + '/health'}
          target="_blank"
          className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Checar API
        </a>
      </div>
    </div>
  );
}

function Card({ title, value, icon, highlight }: any) {
  return (
    <div className={`p-5 rounded-xl border ${highlight ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white border-transparent' : 'bg-white border-gray-100'}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-sm ${highlight ? 'text-white/80' : 'text-gray-500'}`}>{title}</div>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
