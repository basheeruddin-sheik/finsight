import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary, getTransactions } from '../api/transactions';
import type { Transaction, TransactionSummary } from '../types';
import { formatAmount, formatDate, currentMonth } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner, EmptyState, IconCircle } from '../components/ui';

export default function Home() {
  const navigate = useNavigate();
  const { getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeColor, getTypeIcon, getBehavior } = useConfig();
  const month = currentMonth();

  const [summary, setSummary]   = useState<TransactionSummary | null>(null);
  const [recent, setRecent]     = useState<Transaction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    Promise.all([getSummary(month), getTransactions()])
      .then(([s, txns]) => { setSummary(s); setRecent(txns.slice(0, 6)); setLoadError(false); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const saved   = summary?.realSavings ?? 0;
  const rate    = summary?.savingsRate ?? 0;
  const income  = summary?.income ?? 0;
  const spent   = summary?.expenses ?? 0;
  const family  = summary?.familyTransfers ?? 0;
  const lent    = summary?.borrowsGiven ?? 0;
  const recovered = summary?.borrowRecoveries ?? 0;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppBar month={monthLabel} />
      <Spinner />
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppBar month={monthLabel} />
      <EmptyState
        icon="📡"
        title="Cannot reach server"
        description="Make sure the backend is running, then refresh."
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppBar month={monthLabel} />

      {/* Hero — savings */}
      <div className="mx-4 mt-4 rounded-3xl bg-slate-900 p-5 shadow-lg">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Net Savings · {monthLabel}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-4xl font-bold tracking-tight ${saved >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {saved >= 0 ? '' : '-'}{formatAmount(Math.abs(saved))}
            </p>
            <p className="text-sm text-slate-400 mt-1">{rate}% savings rate</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${saved >= 0 ? 'bg-emerald-400/20 text-emerald-400' : 'bg-rose-400/20 text-rose-400'}`}>
            {saved >= 0 ? '▲' : '▼'} {Math.abs(rate)}%
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
          <HeroStat label="Income" value={income} color="text-emerald-400" />
          <HeroStat label="Expenses" value={spent} color="text-rose-400" />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Family" value={family} icon="👨‍👩‍👦" />
        <MiniStat label="Lent" value={lent} icon="🤝" />
        <MiniStat label="Recovered" value={recovered} icon="📥" />
      </div>

      {/* Recent transactions */}
      <div className="mx-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Recent</p>
          <button onClick={() => navigate('/transactions')} className="text-xs font-semibold text-indigo-500">
            See all →
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState icon="💳" title="No transactions yet" description="Tap + to add your first one" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {recent.map((t, i) => {
              const isPositive = ['INCOME','RECEIVE_BACK'].includes(getBehavior(t.type));
              const catIcon = t.category ? getCategoryIcon(t.category) : getTypeIcon(t.type);
              const label   = t.note || (t.category ? getCategoryLabel(t.category) : getTypeLabel(t.type));
              const sub     = t.category ? `${getCategoryLabel(t.category)} · ${formatDate(t.date)}` : formatDate(t.date);
              return (
                <div key={t.id}>
                  {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <IconCircle icon={catIcon} color="bg-slate-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${getTypeColor(t.type)}`}>
                      {isPositive ? '+' : '-'}{formatAmount(t.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AppBar({ month }: { month: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
          <span className="text-white text-xs font-bold">₹</span>
        </div>
        <span className="text-base font-bold text-slate-900">Finsight</span>
      </div>
      <span className="text-sm font-medium text-slate-500">{month}</span>
    </div>
  );
}

function HeroStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{formatAmount(value)}</p>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
      <p className="text-lg mb-1">{icon}</p>
      <p className="text-sm font-bold text-slate-800">{formatAmount(value)}</p>
      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
    </div>
  );
}
