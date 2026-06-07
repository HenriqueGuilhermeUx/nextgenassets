'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ConsumerPortal() {
  const [userId, setUserId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get('/users').then((u: any[]) => {
      setUsers(u);
      if (u[0]) setUserId(u[0].id);
    });
  }, []);

  useEffect(() => {
    if (userId) api.get(`/reports/consumer/${userId}`).then(setReport);
  }, [userId]);

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold">M</div>
            <div>
              <div className="font-bold">Meu Orkest</div>
              <div className="text-xs text-gray-500">Minhas automações financeiras</div>
            </div>
          </div>
          <select value={userId} onChange={e => setUserId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {report && (
          <>
            <div className="bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
              <div className="text-sm text-white/80 mb-1">Olá, {report.user?.name} 👋</div>
              <div className="text-3xl font-bold mb-1">
                R$ {(report.summary?.totalSpentBrl || 0).toFixed(2)}
              </div>
              <div className="text-sm text-white/80">
                investido automaticamente este mês
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Gatilhos ativos" value={report.summary?.activeTriggers} />
                <Stat label="Execuções" value={report.summary?.executionsThisMonth} />
                <Stat label="Sucesso" value={report.summary?.successfulExecutions} />
              </div>
            </div>

            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3">Meus Gatilhos Ativos</h2>
              <div className="space-y-3">
                {report.activeTriggers?.map((t: any) => (
                  <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold">{t.name}</div>
                        <code className="text-xs text-gray-500">{t.code}</code>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">ATIVO</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <Param label="Parâmetros" value={JSON.stringify(t.params)} />
                      <Param label="Execuções" value={t.executionCount || 0} />
                    </div>
                    {t.lastExecuted && (
                      <div className="mt-2 text-xs text-gray-500">Última execução: {new Date(t.lastExecuted).toLocaleString('pt-BR')}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Histórico Recente</h2>
              <div className="bg-white rounded-xl border border-gray-100 divide-y">
                {report.recentExecutions?.slice(0, 10).map((e: any) => (
                  <div key={e.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{e.trigger}</div>
                      <div className="text-xs text-gray-500">{new Date(e.date).toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">R$ {Number(e.amount || 0).toFixed(2)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        e.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{e.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div>
      <div className="text-2xl font-bold">{value || 0}</div>
      <div className="text-xs text-white/80">{label}</div>
    </div>
  );
}

function Param({ label, value }: any) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-mono text-xs truncate">{value}</div>
    </div>
  );
}
