'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { api } from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16'];

export default function RetailerPipelinePage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [pipeline, setPipeline] = useState<any>(null);
  const [abandonedCart, setAbandonedCart] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [retailer, setRetailer] = useState<any>(null);

  useEffect(() => {
    api.get('/partners').then((p: any[]) => {
      setPartners(p);
      const varejista = p.find(x => x.type === 'RETAILER') || p[0];
      if (varejista) setSelected(varejista.id);
    });
  }, []);

  useEffect(() => {
    if (selected) {
      api.get(`/reports/partner/${selected}/abandoned-cart-recovery`).then(setAbandonedCart);
      api.get(`/reports/partner/${selected}/pipeline-forecast`).then(setPipeline);
      api.get(`/executions?partnerId=${selected}&limit=200`).then(setExecutions);
      api.get('/retailer/inventory').then(setRetailer);
    }
  }, [selected]);

  // Prepara dados pros gráficos
  const executionsByDay = groupByDay(executions);
  const triggerTypeDistribution = groupByType(executions);
  const topProductsData = abandonedCart?.topProducts?.slice(0, 5).map((p: any) => ({ name: p.name, value: p.value })) || [];
  const forecastData = pipeline ? [
    { horizon: '7 dias', value: pipeline.summary?.next7DaysValueBrl || 0, count: pipeline.buckets?.next7Days?.count || 0 },
    { horizon: '30 dias', value: pipeline.summary?.next30DaysValueBrl || 0, count: pipeline.buckets?.next30Days?.count || 0 },
    { horizon: '90 dias', value: pipeline.summary?.next90DaysValueBrl || 0, count: pipeline.buckets?.next90Days?.count || 0 }
  ] : [];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Pipeline de Varejo 🛍️</h1>
            <p className="text-gray-500">Recuperação de carrinho + previsão de receita + inventário</p>
          </div>
          <select value={selected} onChange={e => setSelected(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg">
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* HERO */}
        {abandonedCart && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white mb-6">
            <div className="text-sm text-white/80 mb-1">💰 Recuperado este mês</div>
            <div className="text-5xl font-extrabold mb-2">R$ {(abandonedCart.kpis?.recoveredRevenueBrl || 0).toFixed(2)}</div>
            <div className="text-sm text-white/80">
              de <strong>{abandonedCart.kpis?.abandonedCartsRecovered || 0} carrinhos</strong> que seriam perdidos
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              <Stat label="Pipeline ativo" value={`R$ ${(abandonedCart.kpis?.pipelineValueBrl || 0).toFixed(0)}`} />
              <Stat label="Taxa conversão" value={`${(abandonedCart.kpis?.conversionRate || 0).toFixed(1)}%`} />
              <Stat label="Ticket médio" value={`R$ ${(abandonedCart.kpis?.avgOrderValue || 0).toFixed(2)}`} />
              <Stat label="Top produto" value={abandonedCart.topProducts?.[0]?.name?.slice(0, 15) || '—'} />
            </div>
          </div>
        )}

        {/* GRÁFICOS - LINHA 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Execuções ao longo do tempo */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1">📈 Execuções ao longo do tempo</h2>
            <p className="text-xs text-gray-500 mb-4">Compras automatizadas por dia</p>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={executionsByDay}>
                <defs>
                  <linearGradient id="execColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#execColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Distribuição por tipo de gatilho */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1">🎯 Distribuição por tipo de gatilho</h2>
            <p className="text-xs text-gray-500 mb-4">Quais gatilhos mais convertem</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={triggerTypeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                >
                  {triggerTypeDistribution.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* GRÁFICOS - LINHA 2 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Previsão de Receita */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1">📅 Previsão de Receita Futura</h2>
            <p className="text-xs text-gray-500 mb-4">Gatilhos ativos com estimativa de disparo</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `R$ ${v.toFixed(0)}`} />
                <Bar dataKey="value" fill="#5B6CFF" radius={[8, 8, 0, 0]}>
                  {forecastData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Top produtos no pipeline */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1">🏆 Top produtos no pipeline</h2>
            <p className="text-xs text-gray-500 mb-4">Mais pré-vendidos (gatilhos ativos)</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProductsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `R$ ${v.toFixed(0)}`} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* INVENTÁRIO */}
        {retailer && (
          <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">📦 Inventário Atual</h2>
            <div className="grid grid-cols-4 gap-3">
              {retailer.map((item: any) => (
                <div key={item.sku} className={`border rounded-lg p-3 ${item.lowStock ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{item.category}</div>
                  <div className="font-semibold text-sm mb-2 truncate">{item.name}</div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold">{item.stock}</div>
                    <div className="text-xs text-gray-500">/ {item.initialStock}</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">R$ {item.priceBrl.toFixed(2)}</div>
                  {item.stock === 0 && item.restockDate && (
                    <div className="text-xs text-amber-600 mt-1">📅 Volta {new Date(item.restockDate).toLocaleDateString('pt-BR')}</div>
                  )}
                  {item.lowStock && item.stock > 0 && (
                    <div className="text-xs text-red-600 mt-1">⚠️ Estoque baixo</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DETALHES DO PIPELINE */}
        {pipeline && (
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1">📊 Próximas execuções previstas</h2>
            <p className="text-xs text-gray-500 mb-4">Top 5 gatilhos por horizonte temporal</p>

            <div className="grid lg:grid-cols-3 gap-4">
              {(['next7Days', 'next30Days', 'next90Days'] as const).map((bucket, i) => (
                <div key={bucket}>
                  <h3 className="text-sm font-bold mb-2">
                    {bucket === 'next7Days' ? '🔥 Próximos 7 dias' : bucket === 'next30Days' ? '📅 Próximos 30 dias' : '🔮 Próximos 90 dias'}
                  </h3>
                  <div className="space-y-2">
                    {pipeline.buckets?.[bucket]?.top5?.map((t: any) => (
                      <div key={t.id} className="border border-gray-200 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-gray-700">{t.code}</span>
                          <span className="font-bold">R$ {t.value.toFixed(0)}</span>
                        </div>
                        <div className="text-gray-500">{t.customer} • {t.product}</div>
                        <div className="text-gray-400 text-xs mt-1">~{new Date(t.estimatedDate).toLocaleDateString('pt-BR')}</div>
                      </div>
                    ))}
                    {(!pipeline.buckets?.[bucket]?.top5 || pipeline.buckets[bucket].top5.length === 0) && (
                      <div className="text-xs text-gray-400 italic">Nenhum gatilho previsto</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-white/80">{label}</div>
    </div>
  );
}

// ========== Helpers ==========

function groupByDay(executions: any[]): { day: string; value: number }[] {
  const map = new Map<string, number>();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  last30Days.forEach(day => map.set(day, 0));

  executions.filter(e => e.status === 'COMPLETED').forEach(e => {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    if (map.has(day)) {
      map.set(day, map.get(day)! + Number(e.amountBrl || 0));
    }
  });

  return Array.from(map.entries()).map(([day, value]) => ({
    day: day.slice(5),  // MM-DD
    value
  }));
}

function groupByType(executions: any[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  executions.filter(e => e.status === 'COMPLETED').forEach(e => {
    const code = e.trigger?.code || 'UNKNOWN';
    map.set(code, (map.get(code) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}
