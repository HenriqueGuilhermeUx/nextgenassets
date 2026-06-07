'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

export default function PartnerDetail() {
  const { id } = useParams();
  const [partner, setPartner] = useState<any>(null);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (id) {
      api.get(`/partners/${id}`).then(setPartner);
      api.get(`/reports/partner/${id}`).then(setReport);
    }
  }, [id]);

  if (!partner) return <div className="p-8 ml-64">Carregando...</div>;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <Link href="/partners" className="text-sm text-gray-500 hover:text-brand-500">← Voltar</Link>
        <h1 className="text-3xl font-bold mt-2 mb-2">{partner.name}</h1>
        <div className="flex items-center gap-3 mb-8">
          <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded font-semibold text-sm">{partner.type}</span>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded font-semibold text-sm">{partner.tier}</span>
          <span className="text-sm text-gray-500">/{partner.slug}</span>
        </div>

        {report && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <KPI label="Usuários Ativos" value={report.kpis?.activeUsers || 0} />
            <KPI label="Gatilhos Ativos" value={report.kpis?.activeTriggers || 0} />
            <KPI label="Execuções no Mês" value={report.kpis?.executionsThisMonth || 0} />
            <KPI label="Volume" value={`R$ ${report.kpis?.totalVolumeBrl?.toFixed(2) || '0.00'}`} />
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Configuração</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-x-auto">{JSON.stringify(partner.config, null, 2)}</pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Usuários ({partner.users?.length || 0})</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Gatilhos</th>
                  <th className="px-4 py-3">Execuções</th>
                </tr>
              </thead>
              <tbody>
                {partner.users?.map((u: any) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">{u.bankName} {u.bankAccountMask}</td>
                    <td className="px-4 py-3">{u._count?.triggers || 0}</td>
                    <td className="px-4 py-3">{u._count?.executions || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function KPI({ label, value }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
