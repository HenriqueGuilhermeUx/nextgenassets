'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export default function BillingPage() {
  const [userId, setUserId] = useState<string>('demo-user-001');
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [userId]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      // Pega lista de planos (público)
      const plansData = await api.get('/billing/plans');
      setPlans(plansData.plans || []);

      // Pega info do plano do user
      const info = await api.get('/billing/me', { 'x-user-id': userId });
      setPlanInfo(info);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    setCheckoutLoading(true);
    setError('');
    try {
      // Em produção, isso geraria um QR PIX via Efi e webhook ativaria o plano
      // Por enquanto (PIX OUT ainda não liberado na Efi), ativamos manualmente
      const result = await fetch(`${API_URL}/admin/webhooks/billing/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, durationDays: 30 })
      });
      const data = await result.json();
      if (data.success) {
        await loadData();
        alert('🎉 Premium ativado por 30 dias!');
      } else {
        setError(data.error || 'Erro ao ativar');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  const isPremium = planInfo?.isPremium;
  const daysLeft = planInfo?.daysUntilExpiry;
  const usage = planInfo?.usage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <a href="/" className="text-sm text-slate-400 hover:text-white mb-4 inline-block">
            ← Voltar
          </a>
          <h1 className="text-4xl font-bold mb-3">Plano & Cobrança</h1>
          <p className="text-slate-300">
            Gerencie sua assinatura e veja seu uso
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Status atual */}
        <div className={`rounded-2xl p-8 mb-8 ${isPremium ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Plano atual</div>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <>
                    <span className="text-2xl">👑</span>
                    <span className="text-3xl font-bold text-yellow-300">Premium</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🆓</span>
                    <span className="text-3xl font-bold">Free</span>
                  </>
                )}
              </div>
            </div>
            {isPremium && daysLeft !== null && (
              <div className="text-right">
                <div className="text-sm text-slate-400">Expira em</div>
                <div className="text-2xl font-bold text-yellow-300">{daysLeft} dias</div>
              </div>
            )}
          </div>

          {usage && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <UsageBar
                label="Gatilhos"
                current={usage.triggers.current}
                limit={usage.triggers.limit}
              />
              <UsageBar
                label="PIX no mês"
                current={usage.pixThisMonth.current}
                limit={usage.pixThisMonth.limit}
              />
            </div>
          )}
        </div>

        {/* Planos */}
        <h2 className="text-2xl font-bold mb-6">Escolha seu plano</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan: any) => (
            <div
              key={plan.code}
              className={`rounded-2xl p-6 ${
                plan.popular
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                  MAIS POPULAR
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">
                  R$ {plan.priceBrl.toFixed(2).replace('.', ',')}
                </span>
                {plan.priceBrl > 0 && <span className="text-slate-400">/mês</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.code === 'PREMIUM' && !isPremium ? handleUpgrade : undefined}
                disabled={plan.code === 'PREMIUM' && (isPremium || checkoutLoading)}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  plan.code === 'PREMIUM' && isPremium
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {checkoutLoading
                  ? 'Processando...'
                  : plan.code === 'PREMIUM' && isPremium
                  ? '✓ Plano atual'
                  : plan.code === 'PREMIUM'
                  ? 'Fazer upgrade (PIX R$ 19,90)'
                  : 'Plano Free'}
              </button>
            </div>
          ))}
        </div>

        {/* Info Open Finance */}
        {!isPremium && (
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-semibold mb-1">Por que Premium?</h3>
                <p className="text-sm text-slate-300">
                  O plano Free tem limite de 3 gatilhos e 3 PIX no mês. O Premium libera gatilhos ilimitados,
                  Pix Automático (Bacen), AI insights mensais, e prioridade no suporte.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number | string }) {
  const limitNum = typeof limit === 'string' ? Infinity : limit;
  const pct = limitNum === Infinity ? 100 : Math.min(100, (current / limitNum) * 100);
  const isUnlimited = limitNum === Infinity;
  const isOver = !isUnlimited && current >= limitNum;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono">
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isOver ? 'bg-red-500' : isUnlimited ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
