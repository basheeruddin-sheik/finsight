import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getSummary, getTransactions } from '../api/transactions';
import { getPersons } from '../api/persons';
import type { Transaction, TransactionSummary, Person } from '../types';
import { formatAmount, formatTime, currentMonth, monthRange, dayBeforeCurrentMonth, groupByDay, collapseSplitGroups } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner, EmptyState, IconCircle, BottomSheet } from '../components/ui';
import { useIncremental } from '../hooks/useIncremental';
import TransactionDetailSheet from '../components/TransactionDetailSheet';
import { WifiOff, CreditCard, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { LogoMark } from '../components/Logo';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const { getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeIcon, getBehavior } = useConfig();
  const month = currentMonth();

  const [summary, setSummary]   = useState<TransactionSummary | null>(null);
const [recent, setRecent]     = useState<Transaction[]>([]);
  const [persons, setPersons]   = useState<Person[]>([]);
  const [detail, setDetail]     = useState<Transaction | null>(null);
  const [splitGroupId, setSplitGroupId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hasHistory, setHasHistory] = useState(true);

  const PAGE = 10;

  const load = () => {
    Promise.all([
      getSummary(month),
      getTransactions(monthRange(0)),
      getPersons(),
      getTransactions({ to: dayBeforeCurrentMonth() }),
    ])
      .then(([s, txns, p, prior]) => {
        setSummary(s); setRecent(txns); setPersons(p); setLoadError(false);
        setHasHistory(prior.length > 0);
        // Self-heal: browser storage can get evicted (e.g. iOS PWA storage cap),
        // wrongly making a returning user look "new". If they clearly have prior
        // activity, restore the flag so the setup redirect below never fires.
        const setupKey = user?.sub ? `finsight_setup_${user.sub}` : null;
        if (setupKey && prior.length > 0) localStorage.setItem(setupKey, '1');
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Redirect to setup wizard on first login (no transactions ever + setup not done)
  useEffect(() => {
    if (loading) return;
    const setupKey = user?.sub ? `finsight_setup_${user.sub}` : null;
    if (setupKey && !localStorage.getItem(setupKey) && !hasHistory && recent.length === 0 && !summary?.income) {
      navigate('/setup');
    }
  }, [loading, recent.length, summary, hasHistory, user?.sub]);

  const { count, sentinelRef } = useIncremental(recent.length, PAGE);

  const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const saved   = summary?.realSavings ?? 0;
  const rate      = summary?.savingsRate ?? 0;
  const income    = summary?.income ?? 0;
  const spent     = summary?.expenses ?? 0;
  const family    = summary?.familyTransfers ?? 0;
  const lent      = summary?.borrowsGiven ?? 0;
  const recovered = summary?.borrowRecoveries ?? 0;
  const invested        = summary?.investments ?? 0;
  const returns         = summary?.investmentReturns ?? 0;
  const costBasisReturn = summary?.costBasisReturned ?? 0;
  const splitLent      = summary?.splitLent ?? 0;
  const splitCollected = summary?.splitCollected ?? 0;
  const splitRepaid    = summary?.splitRepaid ?? 0;

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
        icon={<WifiOff size={32} />}
        title="Cannot reach server"
        description="Make sure the backend is running, then refresh."
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <AppBar month={monthLabel} />

      {/* Hero — savings */}
      <div className="px-4 pt-4">
        <div className="rounded-3xl bg-slate-900 p-5 shadow-lg shadow-slate-900/10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-slate-400">{greeting()}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
                Net Savings · {monthLabel}
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${saved >= 0 ? 'bg-emerald-400/15 text-emerald-400' : 'bg-rose-400/15 text-rose-400'}`}>
              {saved >= 0 ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />}
              {Math.abs(rate)}%
            </div>
          </div>

          <p className={`text-[40px] leading-none font-bold tracking-tight ${saved >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {saved < 0 ? '-' : ''}{formatAmount(Math.abs(saved))}
          </p>
          <p className="text-xs text-slate-500 mt-2">{rate}% of your income saved this month</p>

          {/* Income allocation: Expenses + Family + Lent (net) + Split (net) + Invested + Saved */}
          <AllocationBar income={income} expenses={spent} family={family} lent={lent} recovered={recovered}
            splitLent={splitLent} splitCollected={splitCollected} splitRepaid={splitRepaid}
            invested={invested} returns={returns} costBasisReturned={costBasisReturn} savings={saved} />
        </div>
      </div>

      {/* This month's activity */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">This month · {recent.length}</p>
          <button onClick={() => navigate('/transactions')}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 active:opacity-70">
            All activity <ArrowRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <EmptyState icon={<CreditCard size={30} />} title="No transactions yet" description="Tap + to add your first one" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groupByDay(recent.slice(0, count)).map(g => (
              <div key={g.key}>
                <p className="text-[11px] font-semibold text-slate-400 mb-2 px-1">{g.label}</p>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {collapseSplitGroups(g.items).map((item, i) => {
                    const borderCls = i > 0 ? 'border-t border-slate-50' : '';

                    if (item.kind === 'splitGroup') {
                      // Represent the row by a friend leg (not your own EXPENSE
                      // share, if present) so the icon/sign read as "Split".
                      const splitLeg = item.legs.find(l => getBehavior(l.type).startsWith('SPLIT_')) ?? item.legs[0];
                      const isPositive = ['INCOME', 'RECEIVE_BACK', 'DIVEST', 'SPLIT_COLLECT'].includes(getBehavior(splitLeg.type));
                      const amount = item.legs.reduce((s, l) => s + l.amount, 0);
                      return (
                        <button key={item.groupId} onClick={() => setSplitGroupId(item.groupId)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors ${borderCls}`}>
                          <IconCircle icon={getTypeIcon(splitLeg.type)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{splitLeg.note || 'Split'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Split · {item.legs.length} people</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isPositive ? '+' : '−'}{formatAmount(amount)}
                            </p>
                          </div>
                        </button>
                      );
                    }

                    const t = item.t;
                    const isPositive = ['INCOME', 'RECEIVE_BACK', 'DIVEST', 'SPLIT_COLLECT'].includes(getBehavior(t.type));
                    const catIcon  = t.category ? getCategoryIcon(t.category) : getTypeIcon(t.type);
                    const typeLbl  = t.category ? getCategoryLabel(t.category) : getTypeLabel(t.type);
                    const personName = t.person?.name;
                    // Person-linked rows: lead with who, not the type key.
                    const label = t.note || (personName ?? typeLbl);
                    const sub   = personName ? `${typeLbl} · ${personName}` : typeLbl;
                    return (
                      <button key={t.id} onClick={() => setDetail(t)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors ${borderCls}`}>
                        <IconCircle icon={catIcon} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {isPositive ? '+' : '−'}{formatAmount(t.amount)}
                          </p>
                          <p className="text-[10px] text-slate-300 mt-0.5 tabular-nums">{formatTime(t.createdAt)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {count < recent.length && (
              <div ref={sentinelRef} className="flex items-center justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {detail && (
        <TransactionDetailSheet
          transaction={detail}
          persons={persons}
          onClose={() => setDetail(null)}
          onChanged={load}
        />
      )}

      {splitGroupId && (
        <SplitGroupSheet
          legs={recent.filter(t => t.splitGroupId === splitGroupId)}
          onClose={() => setSplitGroupId(null)}
          onManage={() => { setSplitGroupId(null); navigate('/splits'); }}
          onSelectMyShare={t => { setSplitGroupId(null); setDetail(t); }}
        />
      )}
    </div>
  );
}

const DIRECTION_LABEL: Record<string, string> = {
  SPLIT_LEND:    'You paid',
  SPLIT_OWE:     'You owe',
  SPLIT_COLLECT: 'They paid you',
  SPLIT_REPAY:   'You paid them',
};

// In-place detail view for a collapsed split-group row — lists each person's
// share, plus your own share (a normal EXPENSE leg with no person) if you
// included yourself when the split was created. Friend legs are edited on
// the Splits page (split types are excluded from the generic edit picker);
// your own share is a normal transaction, so it opens the usual edit sheet.
function SplitGroupSheet({ legs, onClose, onManage, onSelectMyShare }: {
  legs: Transaction[]; onClose: () => void; onManage: () => void; onSelectMyShare: (t: Transaction) => void;
}) {
  const { getTypeIcon, getBehavior } = useConfig();
  if (legs.length === 0) return null;

  const total = legs.reduce((s, l) => s + l.amount, 0);
  // Direction is defined by the friend leg(s), not your own EXPENSE share.
  const splitLeg = legs.find(l => getBehavior(l.type).startsWith('SPLIT_')) ?? legs[0];
  const behavior = getBehavior(splitLeg.type);
  const isPositive = ['INCOME', 'RECEIVE_BACK', 'DIVEST', 'SPLIT_COLLECT'].includes(behavior);
  const directionLabel = DIRECTION_LABEL[behavior];

  return (
    <BottomSheet title={legs[0].note || 'Split'} onClose={onClose}>
      <div className="flex flex-col items-center text-center pt-1 pb-2">
        <IconCircle icon={getTypeIcon(splitLeg.type)} />
        {directionLabel && <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-3">{directionLabel}</p>}
        <p className={`text-3xl font-bold mt-1 ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isPositive ? '+' : '−'}{formatAmount(total)}
        </p>
        <p className="text-sm text-slate-400 mt-1">Split between {legs.length} {legs.length === 1 ? 'person' : 'people'}</p>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100">
        {legs.map(l => l.person ? (
          <div key={l.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">{l.person.name}</span>
            <span className="text-sm font-bold text-slate-800">{formatAmount(l.amount)}</span>
          </div>
        ) : (
          <button key={l.id} onClick={() => onSelectMyShare(l)}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-100">
            <span className="text-sm font-semibold text-slate-700">You</span>
            <span className="text-sm font-bold text-slate-800">{formatAmount(l.amount)}</span>
          </button>
        ))}
      </div>

      <button onClick={onManage}
        className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80">
        Manage in Splits <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </BottomSheet>
  );
}

function AppBar({ month }: { month: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-20" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      <div className="flex items-center gap-2">
        <LogoMark size={28} />
        <span className="text-base font-bold text-slate-900">Finsight</span>
      </div>
      <span className="text-sm font-medium text-slate-500">{month}</span>
    </div>
  );
}

// Income allocation bar — shows how this month's income was split across
// Expenses, Family, net Lending, net Splits, net Investing, and what was
// Saved. Lending, splits, and investing are shown net of money that came
// back, so the segments sum to income.
function AllocationBar({ income, expenses, family, lent, recovered, splitLent, splitCollected, splitRepaid, invested, returns, costBasisReturned, savings }: {
  income: number; expenses: number; family: number; lent: number; recovered: number;
  splitLent: number; splitCollected: number; splitRepaid: number;
  invested: number; returns: number; costBasisReturned: number; savings: number;
}) {
  const netLent = Math.max(lent - recovered, 0);
  const lentNote = lent > 0 && recovered > 0
    ? `${formatAmount(lent)} lent − ${formatAmount(recovered)} recovered`
    : undefined;

  // Splits you fronted/repaid this month, net of what came back — same
  // "net outstanding" treatment as Lent, so a fully-collected split nets to
  // zero instead of double-counting as both an outflow and a saving.
  const splitOut = splitLent + splitRepaid;
  const netSplit = Math.max(splitOut - splitCollected, 0);
  const splitNote = splitOut > 0 && splitCollected > 0
    ? `${formatAmount(splitOut)} paid − ${formatAmount(splitCollected)} collected`
    : undefined;

  // Reduce invested by cost basis only (not the full return amount).
  // The profit portion flows into savings naturally via realSavings.
  const netInvested = Math.max(invested - costBasisReturned, 0);
  const profit = returns - costBasisReturned;
  const investNote = returns > 0
    ? [
        invested > 0 ? `${formatAmount(invested)} invested` : null,
        `${formatAmount(costBasisReturned)} returned`,
        profit > 0 ? `${formatAmount(profit)} profit` : profit < 0 ? `${formatAmount(-profit)} loss` : null,
      ].filter(Boolean).join(' · ')
    : undefined;

  const segs = [
    { label: 'Expenses',                             amount: expenses,             color: 'bg-rose-400',    note: undefined as string | undefined },
    { label: 'Family',                               amount: family,               color: 'bg-blue-400',    note: undefined },
    { label: recovered > 0 ? 'Lent (net)' : 'Lent', amount: netLent,              color: 'bg-violet-400',  note: lentNote },
    { label: splitCollected > 0 ? 'Split (net)' : 'Split', amount: netSplit,      color: 'bg-indigo-400',  note: splitNote },
    { label: returns > 0 ? 'Invested (net)' : 'Invested', amount: netInvested,    color: 'bg-yellow-400',  note: investNote },
    { label: 'Saved',                                amount: Math.max(savings, 0), color: 'bg-emerald-400', note: undefined },
  ].filter(s => s.amount > 0);

  const base = segs.reduce((sum, s) => sum + s.amount, 0) || 1;

  return (
    <div className="mt-5">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
        {income > 0 ? `How ${formatAmount(income)} income was used` : "Where this month's money went"}
      </p>

      <div className="flex gap-0.5 h-2.5">
        {segs.length === 0 ? (
          <div className="h-full w-full rounded-full bg-slate-800" />
        ) : segs.map((s, i) => (
          <div key={s.label} className="relative group/seg h-full" style={{ width: `${(s.amount / base) * 100}%`, minWidth: '6px' }}>
            <div className={`h-full w-full ${s.color} ${i === 0 ? 'rounded-l-full' : ''} ${i === segs.length - 1 ? 'rounded-r-full' : ''}`} />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/seg:block z-10">
              <div className="bg-white text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                {s.label} · {formatAmount(s.amount)}{s.note ? ` (${s.note})` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
        {segs.filter(s => s.label !== 'Saved').map(s => (
          <LegendItem key={s.label} dot={s.color} label={s.label} value={s.amount} pct={Math.round((s.amount / base) * 100)} />
        ))}
      </div>
    </div>
  );
}

function LegendItem({ dot, label, value, pct }: { dot: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] text-slate-400 truncate">{label}</span>
          <span className="text-[9px] font-semibold text-slate-500">{pct}%</span>
        </div>
        <span className="text-xs font-bold text-white">{formatAmount(value)}</span>
      </div>
    </div>
  );
}

