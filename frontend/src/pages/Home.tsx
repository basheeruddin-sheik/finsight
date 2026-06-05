import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary, getTransactions } from '../api/transactions';
import type { Transaction, TransactionSummary } from '../types';
import { formatAmount, formatDate, currentMonth, TYPE_LABELS, CATEGORY_LABELS, TYPE_COLOR } from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const month = currentMonth();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    Promise.all([getSummary(month), getTransactions()])
      .then(([s, txns]) => {
        setSummary(s);
        setRecent(txns.slice(0, 5));
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 p-8">Loading...</div>;
  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
      <p className="text-gray-500 text-sm">Could not reach the server.</p>
      <p className="text-gray-400 text-xs">Make sure the backend is running, then pull down to refresh.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-lg font-semibold text-gray-700">{monthLabel}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Income</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatAmount(summary?.income ?? 0)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Spent</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatAmount(summary?.expenses ?? 0)}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Family</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatAmount(summary?.familyTransfers ?? 0)}</p>
        </div>
        <div className={`rounded-2xl p-4 ${(summary?.realSavings ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${(summary?.realSavings ?? 0) >= 0 ? 'text-emerald-600' : 'text-orange-500'}`}>
            Saved · {summary?.savingsRate ?? 0}%
          </p>
          <p className={`text-2xl font-bold mt-1 ${(summary?.realSavings ?? 0) >= 0 ? 'text-emerald-700' : 'text-orange-600'}`}>
            {formatAmount(summary?.realSavings ?? 0)}
          </p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recent</h2>
          <button onClick={() => navigate('/transactions')} className="text-sm text-blue-500">See all</button>
        </div>

        {recent.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No transactions yet. Add one!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">
                    {t.category ? CATEGORY_LABELS[t.category] : TYPE_LABELS[t.type]}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(t.date)} · {t.note || TYPE_LABELS[t.type]}</span>
                </div>
                <span className={`text-base font-semibold ${TYPE_COLOR[t.type]}`}>
                  {t.type === 'INCOME' || t.type === 'BORROW_RECEIVED' ? '+' : '-'}{formatAmount(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
