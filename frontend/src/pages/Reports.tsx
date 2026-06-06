import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { getMonthlyBreakdown, getSavingsRateTrend, getMoneyOutside } from '../api/reports';
import type { MonthlyBreakdown, SavingsRateMonth, MoneyOutside, PaymentMethod } from '../types';
import { formatAmount, currentMonth, PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner } from '../components/ui';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6'];

function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}
function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Reports() {
  const { getCategoryLabel, getCategoryIcon } = useConfig();
  const [month,        setMonth]       = useState(currentMonth());
  const [breakdown,    setBreakdown]   = useState<MonthlyBreakdown | null>(null);
  const [savingsTrend, setSavingsTrend]= useState<SavingsRateMonth[]>([]);
  const [moneyOutside, setMoneyOutside]= useState<MoneyOutside | null>(null);
  const [loading,      setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMonthlyBreakdown(month), getSavingsRateTrend(6), getMoneyOutside()])
      .then(([b, s, m]) => { setBreakdown(b); setSavingsTrend(s); setMoneyOutside(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month]);

  const canGoNext  = month < currentMonth();
  const monthLabel = new Date(month + '-02').toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header with month nav */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900">Reports</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonth(prevMonth(month))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-lg">‹</button>
            <span className="text-xs font-semibold text-slate-600 w-28 text-center">{monthLabel}</span>
            <button onClick={() => canGoNext && setMonth(nextMonth(month))}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-lg ${canGoNext ? 'bg-slate-100 text-slate-600' : 'text-slate-200'}`}>›</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="p-4 flex flex-col gap-4">

          {/* Spending by Category */}
          <Section title="Spending by Category">
            {!breakdown || breakdown.categories.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No expenses this month</p>
            ) : (
              <div className="flex flex-col gap-3">
                {breakdown.categories.map(c => {
                  const max = breakdown.categories[0]?.total ?? 1;
                  const pct = Math.round((c.total / max) * 100);
                  return (
                    <div key={c.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">
                          {getCategoryIcon(c.category)} {getCategoryLabel(c.category)}
                        </span>
                        <span className="font-bold text-slate-800">{formatAmount(c.total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Payment Methods */}
          <Section title="Payment Methods">
            {!breakdown || breakdown.paymentMethods.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={breakdown.paymentMethods.map(p => ({
                      name: PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method,
                      value: p.total,
                    }))}
                    cx="50%" cy="45%" outerRadius={70} dataKey="value"
                  >
                    {breakdown.paymentMethods.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatAmount(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Savings Rate Trend */}
          <Section title="Savings Rate · Last 6 Months">
            {savingsTrend.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={savingsTrend.map(m => ({ ...m, label: fmtMonth(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
                  <Tooltip formatter={(v) => `${v}%`} labelFormatter={l => String(l)}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="savingsRate" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Money Outside */}
          <Section title="Money Outside">
            <div className="flex flex-col gap-3">
              <MoneyRow label="🤝 Borrows outstanding" value={moneyOutside?.borrowsOutstanding ?? 0} color="text-amber-600" />
              <MoneyRow label="👥 Friends owe you (splits)" value={moneyOutside?.splitsOwed ?? 0} color="text-blue-600" />
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <p className="text-sm font-bold text-slate-800">Total outside</p>
                <p className="text-base font-bold text-slate-900">{formatAmount(moneyOutside?.grandTotal ?? 0)}</p>
              </div>
            </div>
          </Section>

        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

function MoneyRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{formatAmount(value)}</p>
    </div>
  );
}
