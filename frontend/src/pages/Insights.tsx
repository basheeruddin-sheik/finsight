import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { getSavingsRateTrend, getMonthlyBreakdown, getMoneyOutside } from '../api/reports';
import { getTotals } from '../api/transactions';
import type { SavingsRateMonth, MonthlyBreakdown, MoneyOutside, PaymentMethod } from '../types';
import { formatAmount, currentMonth, PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner } from '../components/ui';
import { ConfigIcon, getIconColor } from '../components/configIcons';
import {
  Target, HandCoins, Users, ChevronRight,
  TrendingUp, TrendingDown, PiggyBank, Wallet,
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
  for (const bd of list) {
    for (const c of bd.categories)     cats[c.category] = (cats[c.category] ?? 0) + c.total;
    for (const p of bd.paymentMethods) pays[p.method]   = (pays[p.method]   ?? 0) + p.total;
  }
  const categories     = Object.entries(cats).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  const paymentMethods = Object.entries(pays).map(([method,   total]) => ({ method,   total })).sort((a, b) => b.total - a.total);
  return { categories, paymentMethods, topCategories: categories.slice(0, 3) };
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
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={color} strokeWidth={2.5} />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</span>
      </div>
      <p className={`text-base font-bold leading-tight ${color}`}>{formatAmount(value)}</p>
      {sub && <p className="text-[9px] text-slate-400 leading-none">{sub}</p>}
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
  const [period, setPeriod] = useState<Period>('6M');
  // Custom range — default to last 3 months
  const [fromMonth, setFromMonth] = useState(() => addMonths(currentMonth(), -2));
  const [toMonth,   setToMonth]   = useState(currentMonth());

  // Data
  const [fullTrend,     setFullTrend]     = useState<SavingsRateMonth[]>([]);
  const [breakdown,     setBreakdown]     = useState<MonthlyBreakdown | null>(null);
  const [outside,       setOutside]       = useState<MoneyOutside | null>(null);
  const [totals,        setTotals]        = useState<{ totalSavings: number; totalInvested: number } | null>(null);
  const [baseLoading,   setBaseLoading]   = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('overview');

  // Load base data (trend + portfolio) once
  useEffect(() => {
    Promise.all([getSavingsRateTrend(12), getMoneyOutside(), getTotals()])
      .then(([t, o, tot]) => { setFullTrend(t); setOutside(o); setTotals(tot); })
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
      <div className="bg-white border-b border-slate-100 sticky top-[53px] z-10">

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
                        <span className="text-xs font-semibold text-slate-500 w-12 shrink-0">{fmtM(m.month)}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pos ? 'bg-indigo-500' : 'bg-rose-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-20 text-right shrink-0 ${pos ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {pos ? '+' : ''}{formatAmount(m.realSavings)}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full w-10 text-center shrink-0 ${
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
        {tab === 'portfolio' && (
          <>
            {totals && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <PiggyBank size={13} className="text-indigo-200" strokeWidth={2.5} />
                    <span className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Total Saved</span>
                  </div>
                  <p className="text-2xl font-bold text-white leading-none">{formatAmount(totals.totalSavings)}</p>
                  <p className="text-[10px] text-indigo-200">All-time net</p>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-amber-100" strokeWidth={2.5} />
                    <span className="text-[9px] font-bold text-amber-100 uppercase tracking-widest">In Market</span>
                  </div>
                  <p className="text-2xl font-bold text-white leading-none">{formatAmount(totals.totalInvested)}</p>
                  <p className="text-[10px] text-amber-100">At cost basis</p>
                </div>
              </div>
            )}

            {totals && (totals.totalSavings + totals.totalInvested) > 0 && (
              <Card title="Wealth Allocation · All-time">
                <div className="flex flex-col gap-3">
                  <div className="h-4 rounded-full bg-slate-100 overflow-hidden flex">
                    {totals.totalSavings > 0 && (
                      <div className="h-full bg-indigo-500"
                        style={{ width: `${(totals.totalSavings / (totals.totalSavings + totals.totalInvested)) * 100}%` }} />
                    )}
                    {totals.totalInvested > 0 && (
                      <div className="h-full bg-amber-400"
                        style={{ width: `${(totals.totalInvested / (totals.totalSavings + totals.totalInvested)) * 100}%` }} />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { color: '#6366f1', label: 'Liquid savings',    value: totals.totalSavings,   total: totals.totalSavings + totals.totalInvested },
                      { color: '#f59e0b', label: 'In market (cost)', value: totals.totalInvested, total: totals.totalSavings + totals.totalInvested },
                    ].map(item => (
                      <div key={item.label} className="flex flex-col gap-0.5">
                        <Dot color={item.color} label={item.label} />
                        <p className="text-sm font-bold text-slate-800 ml-3.5">{formatAmount(item.value)}</p>
                        <p className="text-[10px] text-slate-400 ml-3.5">
                          {Math.round((item.value / item.total) * 100)}% of wealth
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            <Card title="Money Outside">
              <div className="flex flex-col gap-3">
                {[
                  { Icon: HandCoins, label: 'Borrows outstanding', value: outside?.borrowsOutstanding ?? 0, color: 'text-amber-600', bg: 'bg-amber-50', iconC: 'text-amber-500' },
                  { Icon: Users,     label: 'Friends owe you',     value: outside?.splitsOwed        ?? 0, color: 'text-blue-600',  bg: 'bg-blue-50',  iconC: 'text-blue-500'  },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl ${row.bg} flex items-center justify-center shrink-0`}>
                        <row.Icon size={14} className={row.iconC} strokeWidth={2} />
                      </div>
                      {row.label}
                    </span>
                    <span className={`text-sm font-bold ${row.color}`}>{formatAmount(row.value)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Total outside</span>
                  <span className="text-base font-bold text-slate-900">{formatAmount(outside?.grandTotal ?? 0)}</span>
                </div>
              </div>
            </Card>

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
        )}

      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <div className="bg-white border-b border-slate-100 px-4 py-3.5 sticky top-0 z-20">
      <h1 className="text-base font-bold text-slate-900">Insights</h1>
    </div>
  );
}
