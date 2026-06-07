'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');

  useEffect(() => {
    api.get('/partners').then((p: any[]) => {
      setPartners(p);
      if (p.length > 0) setSelectedPartner(p[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      api.get(`/reports/partner/${selectedPartner}`).then(setReport);
    }
  }, [selectedPartner]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold mb-6">Relatórios</h1>

        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <label className="block text-sm font-semibold mb-2">Parceiro</label>
          <select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg">
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {report && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <KPI label="MAU" value={report.kpis?.activeUsers || 0} color="bg-blue-500" />
              <KPI label="Taxa de Sucesso" value={`${report.kpis?.successRate?.toFixed(1) || 0}%`} color="bg-green-500" />
              <KPI label="Volume Total" value={`R$ ${report.kpis?.totalVolumeBrl?.toFixed(2) || '0'}`} color="bg-purple-500" />
              <KPI label="Receita Estimada" value={`R$ ${report.kpis?.estimatedRevenueBrl?.toFixed(2) || '0'}`} color="bg-amber-500" />
            </div>

            <section className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-xl font-bold mb-4">Top Gatilhos</h2>
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
                  {report.topTriggers?.map((t: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 font-semibold">{t.name}</td>
                      <td className="py-3 font-mono text-xs">{t.code}</td>
                      <td className="py-3">{t.count}</td>
                      <td className="py-3">R$ {t.totalBrl.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function KPI({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className={`w-2 h-2 rounded-full ${color} mb-2`}></div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
