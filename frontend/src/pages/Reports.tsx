import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { getMonthlyBreakdown, getSavingsRateTrend, getMoneyOutside } from '../api/reports';
import type { MonthlyBreakdown, SavingsRateMonth, MoneyOutside } from '../types';
import { formatAmount, currentMonth, CATEGORY_LABELS, PAYMENT_LABELS } from '../utils';
import type { Category, PaymentMethod } from '../types';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6'];

function monthLabel(m: string) {
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
  const [month, setMonth] = useState(currentMonth());
  const [breakdown, setBreakdown] = useState<MonthlyBreakdown | null>(null);
  const [savingsTrend, setSavingsTrend] = useState<SavingsRateMonth[]>([]);
  const [moneyOutside, setMoneyOutside] = useState<MoneyOutside | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMonthlyBreakdown(month),
      getSavingsRateTrend(6),
      getMoneyOutside(),
    ]).then(([b, s, m]) => {
      setBreakdown(b);
      setSavingsTrend(s);
      setMoneyOutside(m);
    }).catch(() => {
      // leave previous data; just stop loading
    }).finally(() => setLoading(false));
  }, [month]);

  const canGoNext = month < currentMonth();

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-700">Reports</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(prevMonth(month))} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">‹</button>
          <span className="text-sm font-medium text-gray-700 w-24 text-center">
            {new Date(month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => canGoNext && setMonth(nextMonth(month))}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${canGoNext ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-300'}`}>›</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : (
        <>
          {/* Category breakdown */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Spending by Category</h2>
            {!breakdown || breakdown.categories.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No expenses this month</p>
            ) : (
              <div className="flex flex-col gap-2">
                {breakdown?.categories.map(c => {
                  const max = breakdown.categories[0]?.total ?? 1;
                  const pct = Math.round((c.total / max) * 100);
                  const label = CATEGORY_LABELS[c.category as Category] ?? c.category;
                  return (
                    <div key={c.category}>
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span>{label}</span>
                        <span className="font-medium">{formatAmount(c.total)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment method split */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Payment Methods</h2>
            {!breakdown || breakdown.paymentMethods.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={breakdown?.paymentMethods.map(p => ({
                      name: PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method,
                      value: p.total,
                    }))}
                    cx="50%" cy="45%"
                    outerRadius={65}
                    dataKey="value"
                  >
                    {breakdown?.paymentMethods.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatAmount(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Savings rate trend */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Savings Rate — Last 6 Months</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={savingsTrend.map(m => ({ ...m, label: monthLabel(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v) => `${v}%`} labelFormatter={l => String(l)} />
                <Line type="monotone" dataKey="savingsRate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Money outside */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Money Outside</h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Borrows outstanding</span>
                <span className="font-medium text-orange-600">{formatAmount(moneyOutside?.borrowsOutstanding ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Friends owe you (splits)</span>
                <span className="font-medium text-blue-600">{formatAmount(moneyOutside?.splitsOwed ?? 0)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-1 flex justify-between">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-gray-900">{formatAmount(moneyOutside?.grandTotal ?? 0)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
