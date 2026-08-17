import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { getSavingsRateTrend, getMonthlyBreakdown, getNetWorth } from '../api/reports';
import { getAccounts } from '../api/accounts';
import { accountLabel } from '../data/banks';
import { BankBadge } from '../components/BankBadge';
import type { SavingsRateMonth, MonthlyBreakdown, NetWorth, PaymentMethod, Account } from '../types';
import { formatAmount, currentMonth, PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner } from '../components/ui';
import { ConfigIcon, getIconColor } from '../components/configIcons';
import {
  Target, HandCoins, Users, ChevronRight,
  TrendingUp, TrendingDown, Wallet,
} from 'lucide-react';

// ── Colours ───────────────────────────────────────────────────────────────────
const C = { income: '#10b981', expense: '#f43f5e', savings: '#6366f1' };
const PIE = ['#6366f1','#f59e0b','#10b981','#f43f5e','#3b82f6','#8b5cf6','#14b8a6','#ec4899','#84cc16'];

// ── Period ────────────────────────────────────────────────────────────────────
type Period = '1M' | '3M' | '6M' | '1Y' | 'custom';

const PERIOD_CHIPS: { id: Period; label: string }[] = [
  { id: '1M', label: '1M' }, { id: '3M', label: '3M' },
  { id: '6M', label: '6M' }, { id: '1Y', label: '1Y' },
  { id: 'custom', label: 'Custom' },
];
const ROLLING: Record<Exclude<Period,'custom'>, number> = {
  '1M': 1, '3M': 3, '6M': 6, '1Y': 12,
};

// ── Month helpers ─────────────────────────────────────────────────────────────
function fmtM(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}
function addMonths(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function kFmt(v: number) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000)   return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${v}`;
}

/** All months between from and to inclusive */
function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  let cur = from;
  while (cur <= to) { months.push(cur); cur = addMonths(cur, 1); }
  return months;
}

/** Months covered by this period */
function monthsFor(period: Period, from: string, to: string): string[] {
  if (period === 'custom') return monthRange(from, to);
  const n = ROLLING[period];
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

/** Human-readable label for the current period */
function periodTitle(period: Period, from: string, to: string): string {
  if (period === 'custom') {
    return from === to ? fmtM(from) : `${fmtM(from)} – ${fmtM(to)}`;
  }
  return { '1M': 'This Month', '3M': 'Quarter', '6M': '6 Months', '1Y': '1 Year' }[period];
}

/** Merge multiple breakdowns into one aggregate */
function mergeBreakdowns(list: MonthlyBreakdown[]): MonthlyBreakdown {
  const cats: Record<string, number> = {};
  const pays: Record<string, number> = {};
  const invs: Record<string, number> = {};
  for (const bd of list) {
    for (const c of bd.categories)      cats[c.category] = (cats[c.category] ?? 0) + c.total;
    for (const p of bd.paymentMethods)  pays[p.method]   = (pays[p.method]   ?? 0) + p.total;
    for (const i of bd.investments ?? []) invs[i.category] = (invs[i.category] ?? 0) + i.total;
  }
  const categories     = Object.entries(cats).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  const paymentMethods = Object.entries(pays).map(([method,   total]) => ({ method,   total })).sort((a, b) => b.total - a.total);
  const investments    = Object.entries(invs).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  return { categories, paymentMethods, topCategories: categories.slice(0, 3), investments };
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label, pct }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 px-3 py-2 text-xs min-w-[130px]">
      {label && <p className="font-bold text-slate-500 mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? p.fill }} />
            <span className="text-slate-500">{p.name}</span>
          </span>
          <span className="font-bold text-slate-800">
            {pct ? `${p.value}%` : formatAmount(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      {title && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</p>}
      {children}
    </div>
  );
}
function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}
function Empty({ text = 'No data for this period' }: { text?: string }) {
  return <p className="text-sm text-slate-400 text-center py-8">{text}</p>;
}
function StatPill({ label, value, sub, color, bg, Icon }: {
  label: string; value: number; sub?: string;
  color: string; bg: string; Icon: React.ElementType;
}) {
  return (
    <div className={`rounded-2xl p-3 flex flex-col gap-1 ${bg}`}>
      <div className="flex items-center gap-1">
        <Icon size={12} className={color} strokeWidth={2.5} />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none truncate">{label}</span>
      </div>
      <p className={`text-sm font-bold leading-tight truncate ${color}`}>{formatAmount(value)}</p>
      {sub && <p className="text-[10px] text-slate-400 leading-none truncate">{sub}</p>}
    </div>
  );
}

// ── Month stepper (reusable ‹ label ›) ───────────────────────────────────────
function MonthStepper({
  label: heading, value, onChange, min, max,
}: {
  label: string; value: string;
  onChange: (m: string) => void;
  min?: string; max?: string;
}) {
  const canPrev = !min || value > min;
  const canNext = !max || value < max;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{heading}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => canPrev && onChange(addMonths(value, -1))}
          className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
            canPrev ? 'bg-slate-100 text-slate-600 active:bg-slate-200' : 'text-slate-200'
          }`}>‹</button>
        <span className="text-xs font-bold text-slate-800 w-16 text-center">{fmtM(value)}</span>
        <button
          onClick={() => canNext && onChange(addMonths(value, 1))}
          className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
            canNext ? 'bg-slate-100 text-slate-600 active:bg-slate-200' : 'text-slate-200'
          }`}>›</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'spending' | 'portfolio';

export default function Insights() {
  const navigate = useNavigate();
  const { getCategoryLabel, getCategoryIcon } = useConfig();

  // Period state
  const [period, setPeriod] = useState<Period>('1M');
  // Custom range — default to last 3 months
  const [fromMonth, setFromMonth] = useState(() => addMonths(currentMonth(), -2));
  const [toMonth,   setToMonth]   = useState(currentMonth());

  // Data
  const [fullTrend,     setFullTrend]     = useState<SavingsRateMonth[]>([]);
  const [breakdown,     setBreakdown]     = useState<MonthlyBreakdown | null>(null);
  const [netWorth,      setNetWorth]      = useState<NetWorth | null>(null);
  const [accounts,      setAccounts]      = useState<Account[]>([]);
  const [baseLoading,   setBaseLoading]   = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('overview');

  // Load base data (trend + portfolio) once
  useEffect(() => {
    Promise.all([getSavingsRateTrend(36), getNetWorth(), getAccounts()])
      .then(([t, nw, accs]) => { setFullTrend(t); setNetWorth(nw); setAccounts(accs); })
      .finally(() => setBaseLoading(false));
  }, []);

  // Reload spending breakdown whenever period / range changes
  useEffect(() => {
    const months = monthsFor(period, fromMonth, toMonth);
    if (!months.length) return;
    setPeriodLoading(true);
    Promise.all(months.map(m => getMonthlyBreakdown(m)))
      .then(results => setBreakdown(mergeBreakdowns(results)))
      .finally(() => setPeriodLoading(false));
  }, [period, fromMonth, toMonth]);

  // Trend slice filtered to current period
  const trendSlice = useMemo<SavingsRateMonth[]>(() => {
    if (period === 'custom') {
      return fullTrend.filter(t => t.month >= fromMonth && t.month <= toMonth);
    }
    return fullTrend.slice(-ROLLING[period]);
  }, [fullTrend, period, fromMonth, toMonth]);

  const trendData = trendSlice.map(m => ({
    month:    fmtM(m.month),
    Income:   m.income,
    Expenses: m.expenses,
    Savings:  m.realSavings,
    Rate:     m.savingsRate,
  }));

  // Aggregate stats across the period
  const aggIncome   = trendSlice.reduce((s, m) => s + m.income,      0);
  const aggExpenses = trendSlice.reduce((s, m) => s + m.expenses,    0);
  const aggSavings  = trendSlice.reduce((s, m) => s + m.realSavings, 0);
  const avgRate     = trendSlice.length
    ? Math.round(trendSlice.reduce((s, m) => s + m.savingsRate, 0) / trendSlice.length)
    : 0;

  const title = periodTitle(period, fromMonth, toMonth);

  if (baseLoading) return <div className="min-h-screen bg-slate-50"><AppHeader /><Spinner /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppHeader />

      {/* ── Sticky control band ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 sticky z-10" style={{ top: 'calc(53px + env(safe-area-inset-top, 0px))' }}>

        {/* Period chips */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-none">
          {PERIOD_CHIPS.map(({ id, label }) => (
            <button key={id} onClick={() => setPeriod(id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                period === id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                  : 'bg-slate-100 text-slate-500 active:bg-slate-200'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Custom range row — two month steppers */}
        {period === 'custom' && (
          <div className="flex items-center justify-center gap-4 pb-3 px-4">
            <MonthStepper
              label="From"
              value={fromMonth}
              onChange={v => setFromMonth(v)}
              max={toMonth}
            />
            <span className="text-slate-300 font-bold mt-3">→</span>
            <MonthStepper
              label="To"
              value={toMonth}
              onChange={v => setToMonth(v)}
              min={fromMonth}
              max={currentMonth()}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-slate-100">
          {(['overview', 'spending', 'portfolio'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                tab === t
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-400 border-b-2 border-transparent'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* ══════════════ OVERVIEW ══════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* Aggregate stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatPill label="Income"   value={aggIncome}
                color="text-emerald-600" bg="bg-emerald-50" Icon={TrendingUp} />
              <StatPill label="Spent"    value={aggExpenses}
                color="text-rose-500"   bg="bg-rose-50"    Icon={Wallet} />
              <StatPill
                label="Saved"
                value={aggSavings}
                sub={`avg ${avgRate}% rate`}
                color={aggSavings >= 0 ? 'text-indigo-600' : 'text-rose-500'}
                bg={aggSavings    >= 0 ? 'bg-indigo-50'   : 'bg-rose-50'}
                Icon={aggSavings  >= 0 ? TrendingUp : TrendingDown}
              />
            </div>

            {/* Where the saved money went — splits "Saved" into cash + each asset */}
            {aggSavings > 0 && breakdown && breakdown.investments.length > 0 && (() => {
              const netInvested = breakdown.investments.reduce((s, i) => s + i.total, 0);
              const cashKept    = aggSavings - netInvested;
              const rows = [
                { key: 'CASH', label: 'Kept as cash', amount: cashKept, color: '#6366f1',
                  icon: <Wallet size={14} className="text-indigo-500" strokeWidth={2.5} /> },
                ...breakdown.investments.map((i, idx) => ({
                  key: i.category,
                  label: getCategoryLabel(i.category),
                  amount: i.total,
                  color: PIE[idx % PIE.length],
                  icon: <ConfigIcon name={getCategoryIcon(i.category)} size={14} className={getIconColor(getCategoryIcon(i.category)).text} />,
                })),
              ].filter(r => Math.abs(r.amount) >= 1);
              return (
                <Card title={`Where Your Saved Money Went · ${title}`}>
                  <p className="text-[11px] text-slate-400 mb-3 -mt-1">
                    Of the {formatAmount(aggSavings)} you saved, here's where it went
                  </p>
                  <div className="flex flex-col gap-3">
                    {rows.map(r => {
                      const share = Math.round((r.amount / aggSavings) * 100);
                      const neg   = r.amount < 0;
                      return (
                        <div key={r.key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                              {r.icon}
                              <span className="text-sm font-semibold text-slate-700 truncate">{r.label}</span>
                              {neg && <span className="text-[9px] font-bold text-rose-400 uppercase">sold</span>}
                            </span>
                            <span className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-xs text-slate-400">{share}%</span>
                              <span className={`text-sm font-bold ${neg ? 'text-rose-500' : 'text-slate-800'}`}>
                                {neg ? '-' : ''}{formatAmount(Math.abs(r.amount))}
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.min(Math.max(Math.abs(share), 2), 100)}%`, background: neg ? '#fda4af' : r.color }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Total saved</span>
                      <span className="text-sm font-bold text-slate-900">{formatAmount(aggSavings)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">
                    Invested money still belongs to you — it just moved from cash into the market.
                    {rows.some(r => r.amount < 0) && ' A “sold” row means you withdrew more than you added this period (cash came back) — it’s not a loss.'}
                  </p>
                </Card>
              );
            })()}

            {/* Income vs Expenses grouped bars */}
            <Card title={`Income vs Expenses · ${title}`}>
              {trendData.length === 0 ? <Empty /> : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={trendData} barCategoryGap="28%" barGap={2}>
                      <defs>
                        <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={C.income}  stopOpacity={1}   />
                          <stop offset="100%" stopColor={C.income}  stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={C.expense} stopOpacity={1}   />
                          <stop offset="100%" stopColor={C.expense} stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={kFmt} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Income"   name="Income"   fill="url(#gInc)" radius={[5,5,0,0]} maxBarSize={28} />
                      <Bar dataKey="Expenses" name="Expenses" fill="url(#gExp)" radius={[5,5,0,0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-1">
                    <Dot color={C.income}  label="Income" />
                    <Dot color={C.expense} label="Expenses" />
                  </div>
                </>
              )}
            </Card>

            {/* Savings Rate trend */}
            {trendData.length > 1 && (
              <Card title="Savings Rate Trend">
                <ResponsiveContainer width="100%" height={155}>
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="gRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.savings} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.savings} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} domain={['auto','auto']} />
                    <Tooltip content={<ChartTip pct />} />
                    <Area
                      type="monotone" dataKey="Rate" name="Savings Rate"
                      stroke={C.savings} strokeWidth={2.5}
                      fill="url(#gRate)"
                      dot={{ r: 4, fill: '#fff', stroke: C.savings, strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: C.savings }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Net savings per month — horizontal bar list */}
            {trendSlice.length > 0 && (
              <Card title="Net Savings by Month">
                <div className="flex flex-col gap-3">
                  {[...trendSlice].reverse().map(m => {
                    const pos    = m.realSavings >= 0;
                    const maxAbs = Math.max(...trendSlice.map(x => Math.abs(x.realSavings)), 1);
                    const pct    = Math.min((Math.abs(m.realSavings) / maxAbs) * 100, 100);
                    return (
                      <div key={m.month} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 w-11 shrink-0">{fmtM(m.month)}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-0">
                          <div
                            className={`h-full rounded-full ${pos ? 'bg-indigo-500' : 'bg-rose-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-18 text-right shrink-0 ${pos ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {pos ? '+' : ''}{formatAmount(m.realSavings)}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-9 text-center shrink-0 ${
                          pos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                        }`}>
                          {m.savingsRate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══════════════ SPENDING ══════════════════════════════════════════ */}
        {tab === 'spending' && (
          periodLoading ? <div className="py-12"><Spinner /></div> : (
            <>
              {/* Category donut + bars */}
              <Card title={`Spending by Category · ${title}`}>
                {!breakdown || breakdown.categories.length === 0 ? (
                  <Empty text="No expenses in this period" />
                ) : (
                  <>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={breakdown.categories.map(c => ({
                              name: getCategoryLabel(c.category), value: c.total,
                            }))}
                            cx="50%" cy="50%"
                            innerRadius={62} outerRadius={88}
                            dataKey="value" paddingAngle={3} strokeWidth={0}
                          >
                            {breakdown.categories.map((_, i) => (
                              <Cell key={i} fill={PIE[i % PIE.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-lg font-bold text-slate-800">
                          {formatAmount(breakdown.categories.reduce((s, c) => s + c.total, 0))}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 mt-1">
                      {breakdown.categories.map((c, i) => {
                        const max   = breakdown!.categories[0].total;
                        const tot   = breakdown!.categories.reduce((s, x) => s + x.total, 0);
                        const barW  = Math.round((c.total / max) * 100);
                        const share = Math.round((c.total / tot) * 100);
                        return (
                          <div key={c.category}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE[i % PIE.length] }} />
                                <ConfigIcon name={getCategoryIcon(c.category)} size={13} className={getIconColor(getCategoryIcon(c.category)).text} />
                                <span className="truncate">{getCategoryLabel(c.category)}</span>
                              </span>
                              <span className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-[10px] text-slate-400">{share}%</span>
                                <span className="text-xs font-bold text-slate-800">{formatAmount(c.total)}</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${barW}%`, background: PIE[i % PIE.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>

              {/* Payment methods donut + list */}
              <Card title="Payment Methods">
                {!breakdown || breakdown.paymentMethods.length === 0 ? (
                  <Empty text="No payments in this period" />
                ) : (
                  <>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={breakdown.paymentMethods.map(p => ({
                              name: PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method,
                              value: p.total,
                            }))}
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={72}
                            dataKey="value" paddingAngle={3} strokeWidth={0}
                          >
                            {breakdown.paymentMethods.map((_, i) => (
                              <Cell key={i} fill={PIE[i % PIE.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2.5 mt-1">
                      {breakdown.paymentMethods.map((p, i) => {
                        const tot = breakdown!.paymentMethods.reduce((s, x) => s + x.total, 0);
                        const pct = Math.round((p.total / tot) * 100);
                        return (
                          <div key={p.method} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE[i % PIE.length] }} />
                            <span className="text-xs text-slate-600 flex-1 truncate">
                              {PAYMENT_LABELS[p.method as PaymentMethod] ?? p.method}
                            </span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-1 shrink-0">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PIE[i % PIE.length] }} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-7 text-right shrink-0">{pct}%</span>
                            <span className="text-xs font-bold text-slate-700 w-20 text-right shrink-0">{formatAmount(p.total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            </>
          )
        )}

        {/* ══════════════ PORTFOLIO ══════════════════════════════════════════ */}
        {tab === 'portfolio' && netWorth && (() => {
          // Build the full, non-overlapping list of wealth verticals.
          // These provably sum to netWorth (cash + investments + receivables).
          const holdings: { key: string; label: string; amount: number; color: string; icon: React.ReactNode }[] = [
            { key: 'CASH', label: 'Cash & Savings', amount: netWorth.cash, color: '#10b981',
              icon: <Wallet size={14} className="text-emerald-500" strokeWidth={2.5} /> },
            ...netWorth.investments.map((inv, i) => ({
              key: inv.category,
              label: getCategoryLabel(inv.category),
              amount: inv.amount,
              color: PIE[i % PIE.length],
              icon: <ConfigIcon name={getCategoryIcon(inv.category)} size={14} className={getIconColor(getCategoryIcon(inv.category)).text} />,
            })),
            { key: 'BORROWS', label: 'Borrows', amount: netWorth.borrowsOutstanding, color: '#f59e0b',
              icon: <HandCoins size={14} className="text-amber-500" strokeWidth={2.5} /> },
            { key: 'SPLITS', label: netWorth.splitsNet < 0 ? 'Splits (you owe)' : 'Splits', amount: netWorth.splitsNet, color: '#3b82f6',
              icon: <Users size={14} className="text-blue-500" strokeWidth={2.5} /> },
          ].filter(h => Math.abs(h.amount) >= 1);

          // Hero composition (3-way): liquid / invested / receivable.
          const receivables = netWorth.borrowsOutstanding + netWorth.splitsNet;
          const liquidPos   = Math.max(netWorth.cash, 0);
          const compBase    = liquidPos + netWorth.investmentsTotal + receivables || 1;
          const seg = [
            { label: 'Cash',        value: liquidPos,                   color: '#10b981' },
            { label: 'Investments', value: netWorth.investmentsTotal,   color: '#f59e0b' },
            { label: 'Receivable',  value: receivables,                 color: '#6366f1' },
          ].filter(s => s.value > 0);

          const denom = netWorth.netWorth || 1;
          const topInvest = netWorth.investments[0];
          const concentration = topInvest && netWorth.investmentsTotal > 0
            ? Math.round((topInvest.amount / netWorth.investmentsTotal) * 100) : 0;

          return (
          <>
            {/* ── Net worth hero ── */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Net Worth</p>
              <p className="text-3xl font-bold text-white mb-4">{formatAmount(netWorth.netWorth)}</p>

              {/* Composition bar */}
              <div className="h-2.5 rounded-full overflow-hidden flex bg-white/5 mb-2.5">
                {seg.map(s => (
                  <div key={s.label} style={{ width: `${(s.value / compBase) * 100}%`, background: s.color }} />
                ))}
              </div>
              {/* Composition legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {seg.map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[10px] text-slate-300">{s.label}</span>
                    <span className="text-[10px] font-bold text-white">{formatAmount(s.value)}</span>
                  </div>
                ))}
              </div>

              {netWorth.cash < 0 && (
                <p className="text-[10px] text-rose-300 bg-rose-500/10 rounded-lg px-3 py-1.5 mt-3">
                  Cash is negative — you've invested or lent more than recorded income. Add your opening balance in Setup to fix this.
                </p>
              )}
            </div>

            {/* ── All holdings breakdown ── */}
            <Card title="Where Your Money Is">
              <div className="flex flex-col gap-3.5">
                {holdings.map(h => {
                  const neg   = h.amount < 0;
                  const share = Math.round((h.amount / denom) * 100);
                  return (
                    <div key={h.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: neg ? '#fda4af' : h.color }} />
                          {h.icon}
                          <span className="text-sm font-semibold text-slate-700 truncate">{h.label}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-slate-400">{share}%</span>
                          <span className={`text-sm font-bold ${neg ? 'text-rose-500' : 'text-slate-800'}`}>
                            {neg ? '-' : ''}{formatAmount(Math.abs(h.amount))}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(Math.abs(share), 2), 100)}%`, background: neg ? '#fda4af' : h.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Total Net Worth</span>
                  <span className="text-sm font-bold text-slate-900">{formatAmount(netWorth.netWorth)}</span>
                </div>
              </div>

              {concentration > 60 && (
                <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mt-3">
                  {concentration}% of investments are in {getCategoryLabel(topInvest.category)} — consider diversifying
                </p>
              )}
            </Card>

            {/* ── Account balances ── */}
            {accounts.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounts</p>
                  <button onClick={() => navigate('/accounts')}
                    className="flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 active:opacity-70">
                    Manage <ChevronRight size={12} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {accounts.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <BankBadge bank={a.bank} type={a.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{accountLabel(a)}</p>
                        {a.isDefault && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Default</p>}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${a.balance < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                        {formatAmount(a.balance)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Total across accounts</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatAmount(accounts.reduce((s, a) => s + a.balance, 0))}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Realized gains (only once something has been sold) ── */}
            {netWorth.salesProceeds > 0 && (() => {
              const gain = netWorth.realizedGains;
              const pct  = netWorth.salesCost > 0 ? Math.round((gain / netWorth.salesCost) * 100) : 0;
              const up   = gain >= 0;
              return (
                <Card title="Realized Gains · All-time">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${up ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        {up ? <TrendingUp className="text-emerald-500" size={22} strokeWidth={2.5} />
                            : <TrendingDown className="text-rose-500" size={22} strokeWidth={2.5} />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xl font-bold leading-none ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {up ? '+' : '-'}{formatAmount(Math.abs(gain))}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">Profit booked on investments sold</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      {up ? '+' : ''}{pct}%
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Sold for</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{formatAmount(netWorth.salesProceeds)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Original cost</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{formatAmount(netWorth.salesCost)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">
                    Gain/loss on holdings you've already sold — separate from cash flow. Unsold holdings aren't valued here.
                  </p>
                </Card>
              );
            })()}

            <button onClick={() => navigate('/budgets')}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 text-left w-full active:opacity-70">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Target className="text-emerald-500" size={24} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">Budgets</p>
                <p className="text-xs text-slate-400 mt-0.5">Monthly limits & spend progress</p>
              </div>
              <ChevronRight className="text-slate-300 shrink-0" size={20} />
            </button>
          </>
          );
        })()}

      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <div className="bg-white border-b border-slate-100 px-4 py-3.5 sticky top-0 z-20" style={{ paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))' }}>
      <h1 className="text-base font-bold text-slate-900">Insights</h1>
    </div>
  );
}
