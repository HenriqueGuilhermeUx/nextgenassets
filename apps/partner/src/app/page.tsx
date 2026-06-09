'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Em produção, viria do auth. Aqui hardcoded pra demo.
const PARTNER_ID = 'demo';

export default function PartnerPortal() {
  const [partners, setPartners] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get('/partners').then((p: any[]) => {
      setPartners(p);
      if (p[0]) setSelected(p[0]);
    });
  }, []);

  useEffect(() => {
    if (selected) api.get(`/reports/partner/${selected.id}`).then(setReport);
  }, [selected]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">P</div>
            <div>
              <div className="font-bold">Partner Portal</div>
              <div className="text-xs text-gray-500">NextGen Assets</div>
            </div>
          </div>
          <select value={selected?.id} onChange={e => setSelected(partners.find(p => p.id === e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg">
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {selected && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold">{selected.name}</h1>
              <p className="text-gray-500">{selected.type} · Plano {selected.tier}</p>
            </div>

            {report && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <Card title="Usuários Ativos" value={report.kpis?.activeUsers || 0} icon="👥" />
                  <Card title="Gatilhos Ativos" value={report.kpis?.activeTriggers || 0} icon="⚡" />
                  <Card title="Volume Movimentado" value={`R$ ${(report.kpis?.totalVolumeBrl || 0).toFixed(2)}`} icon="💰" />
                  <Card title="Take-Rate Acumulado" value={`R$ ${(report.kpis?.estimatedRevenueBrl || 0).toFixed(2)}`} icon="📈" highlight />
                </div>

                <section className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
                  <h2 className="text-xl font-bold mb-4">Performance do Mês</h2>
                  <div className="grid grid-cols-3 gap-6">
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
