import { useEffect, useState } from 'react';
import {
  getSplits, getSplitDetail, createSplitGroup, settleSplit,
  type SplitBalance, type SplitDetail, type SplitLeg,
} from '../api/splits';
import { getPersons } from '../api/persons';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import type { Person, Transaction } from '../types';
import { formatAmount, formatTime, formatDateLongUTC, todayStr, currentMonth, monthRangeFor, groupByDay, collapseSplitGroups, type FeedItem } from '../utils';
import { Spinner, EmptyState, BottomSheet, DateField, IconCircle, ConfirmModal } from '../components/ui';
import PeopleTabs from '../components/PeopleTabs';
import { useConfig } from '../context/ConfigContext';
import { ConfigIcon, getIconColor } from '../components/configIcons';
import { Users, Plus, ChevronRight, ChevronLeft, Check, Pencil, Trash2, Wallet, ArrowLeftRight } from 'lucide-react';

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

function labelFor(behavior: string) {
  switch (behavior) {
    case 'SPLIT_LEND':    return 'You paid their share';
    case 'SPLIT_OWE':     return 'They paid your share';
    case 'SPLIT_COLLECT': return 'They paid you back';
    case 'SPLIT_REPAY':   return 'You paid them back';
    default:              return 'Split';
  }
}

const DIRECTION_LABEL: Record<string, string> = {
  SPLIT_LEND:    'You paid',
  SPLIT_OWE:     'You owe',
  SPLIT_COLLECT: 'They paid you',
  SPLIT_REPAY:   'You paid them',
};

// Balance-ledger sign, matching splits.service.ts SIGN exactly: green when
// an entry adds to what a friend owes you or clears what you owed them;
// red when it adds to what you owe or draws down what was owed to you.
// A settle-up is a reduction entry either way — "they paid you back" is
// red (their balance owed to you shrinks), "you paid them back" is green
// (your balance owed to them shrinks) — not a cash-in/cash-out read.
const SPLIT_POSITIVE = new Set(['SPLIT_LEND', 'SPLIT_REPAY']);

// Settle-ups are a different kind of event from a bill leg (closing out a
// balance vs. opening one) — give them a distinct handshake icon instead of
// the generic "users" icon every split type shares, so they read differently
// in the feed at a glance, not just by sign color.
const SETTLE_BEHAVIORS = new Set(['SPLIT_COLLECT', 'SPLIT_REPAY']);

// Equal shares that sum exactly to the total — plain division can leave a
// paisa or two unaccounted for (e.g. ₹250 / 3 = ₹83.33 × 3 = ₹249.99), so any
// rounding remainder goes to one participant (you, if included, else the
// last one) instead of silently vanishing. Shared by Add and Edit sheets.
function computeEqualShares(totalN: number, participants: string[], includeMe: boolean): Record<string, number> {
  const shares: Record<string, number> = {};
  if (participants.length === 0) return shares;
  const base = Math.floor((totalN / participants.length) * 100) / 100;
  const remainder = Math.round((totalN - base * participants.length) * 100) / 100;
  for (const key of participants) shares[key] = base;
  if (remainder > 0) {
    const target = includeMe ? 'me' : participants[participants.length - 1];
    shares[target] = Math.round((shares[target] + remainder) * 100) / 100;
  }
  return shares;
}

// ── Splits page — monthly Activity feed and all-time Balances, toggled in-body ──
export default function Splits() {
  const { getBehavior, getTypeIcon } = useConfig();

  const [view, setView] = useState<'activity' | 'balances'>('activity');

  const [month,   setMonth]   = useState(currentMonth());
  const [txns,    setTxns]    = useState<Transaction[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [splits,    setSplits]    = useState<SplitBalance[]>([]);
  const [balLoading, setBalLoading] = useState(true);
  const [detailId,  setDetailId]  = useState<string | null>(null);

  const [showAdd,  setShowAdd]  = useState(false);
  const [feedItem, setFeedItem] = useState<FeedItem | null>(null);

  const canGoNext = month < currentMonth();

  const load = () => {
    setLoading(true);
    Promise.all([getTransactions(monthRangeFor(month)), getPersons('FRIEND')])
      .then(([t, p]) => { setTxns(t); setFriends(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [month]);

  // Balances are an all-time net position, independent of the selected month.
  const loadBalances = () => {
    setBalLoading(true);
    getSplits().then(setSplits).finally(() => setBalLoading(false));
  };
  useEffect(() => { loadBalances(); }, []);

  // Only split-related transactions: friend legs (SPLIT_*) plus your own
  // share of a split, which is a plain EXPENSE tagged with a splitGroupId.
  const splitTxns = txns.filter(t =>
    getBehavior(t.type).startsWith('SPLIT_') || (!!t.splitGroupId && getBehavior(t.type) === 'EXPENSE')
  );
  const feed = collapseSplitGroups(splitTxns);
  const days = groupByDay(
    feed.map(item => ({ item, date: item.kind === 'txn' ? item.t.date : item.legs[0].date }))
  );

  const monthLabel = new Date(month + '-02').toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const owedToYou = splits.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
  const youOwe    = splits.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
  const net       = owedToYou - youOwe;
  const detailName = splits.find(s => s.personId === detailId)?.name ?? '';

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <PeopleTabs active="splits" />

      {/* Header — title, month nav (Activity only), and the swap button all
          on one row; month nav sits centered in the space between them. */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center px-4 py-3 gap-2">
          <h1 className="text-base font-semibold text-slate-900 shrink-0">Splits</h1>
          <div className="flex-1 flex items-center justify-center gap-0.5 min-w-0">
            {view === 'activity' && (
              <>
                <button onClick={() => setMonth(prevMonth(month))}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-base shrink-0">‹</button>
                <span className="text-xs font-semibold text-slate-600 text-center px-1 truncate">{monthLabel}</span>
                <button onClick={() => canGoNext && setMonth(nextMonth(month))}
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-base transition-colors shrink-0 ${canGoNext ? 'bg-slate-100 text-slate-600' : 'text-slate-200'}`}>›</button>
              </>
            )}
          </div>
          <button onClick={() => setView(v => v === 'activity' ? 'balances' : 'activity')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-indigo-600 active:bg-slate-200 transition-colors">
            <ArrowLeftRight size={13} strokeWidth={2.5} />
            {view === 'activity' ? 'Balances' : 'Activity'}
          </button>
        </div>
      </div>

      {view === 'activity' ? (
        loading ? <Spinner /> : days.length === 0 ? (
          <EmptyState icon={<Users size={32} />} title="No splits this month"
            description="Track shared expenses — who paid, and who owes whom"
            action={friends.length > 0 ? (
              <button onClick={() => setShowAdd(true)} className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
                Add a split
              </button>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Add a friend first under Settings → People</p>
            )}
          />
        ) : (
          <div className="p-4 flex flex-col gap-5">
            {days.map(day => (
              <div key={day.key}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{day.label}</p>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {day.items.map((row, i) => {
                    const { item } = row;
                    const borderCls = i > 0 ? 'border-t border-slate-50' : '';

                    if (item.kind === 'splitGroup') {
                      const splitLeg = item.legs.find(l => getBehavior(l.type).startsWith('SPLIT_')) ?? item.legs[0];
                      const isPositive = SPLIT_POSITIVE.has(getBehavior(splitLeg.type));
                      const amount = item.legs.reduce((s, l) => s + l.amount, 0);
                      return (
                        <button key={item.groupId} onClick={() => setFeedItem(item)}
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
                            <p className="text-[10px] text-slate-300 mt-0.5 tabular-nums">{formatTime(item.legs[0].createdAt)}</p>
                          </div>
                        </button>
                      );
                    }

                    const t = item.t;
                    const behavior = getBehavior(t.type);
                    const isPositive = SPLIT_POSITIVE.has(behavior);
                    const personName = t.person?.name;
                    const label = t.note || (personName ?? labelFor(behavior));
                    const sub   = personName ? `${labelFor(behavior)} · ${personName}` : labelFor(behavior);
                    const isSettle = SETTLE_BEHAVIORS.has(behavior);
                    return (
                      <button key={t.id} onClick={() => setFeedItem(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors ${borderCls}`}>
                        <IconCircle icon={isSettle ? 'handshake' : getTypeIcon(t.type)} color={isSettle ? 'bg-slate-100' : undefined} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                            {isSettle && (
                              <span className="text-[9px] font-bold text-white uppercase tracking-wide bg-slate-600 px-1.5 py-0.5 rounded-full shrink-0">Settled</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {isSettle ? (
                            <p className="text-sm font-bold text-slate-700">{formatAmount(t.amount)}</p>
                          ) : (
                            <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isPositive ? '+' : '−'}{formatAmount(t.amount)}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-300 mt-0.5 tabular-nums">{formatTime(t.createdAt)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        balLoading ? <Spinner /> : (
          <div className="p-4 flex flex-col gap-4">
            {/* Net summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { label: 'They owe you', value: formatAmount(owedToYou), color: 'text-emerald-600' },
                  { label: 'You owe',      value: formatAmount(youOwe),    color: 'text-rose-500'    },
                  { label: 'Net',          value: `${net >= 0 ? '+' : '-'}${formatAmount(Math.abs(net))}`, color: net >= 0 ? 'text-emerald-600' : 'text-rose-500' },
                ].map(c => (
                  <div key={c.label} className="flex flex-col items-center py-4 px-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 text-center">{c.label}</p>
                    <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {splits.length === 0 ? (
              <EmptyState icon={<Wallet size={32} />} title="All settled up" description="No open balances with anyone right now" />
            ) : (
              <div className="flex flex-col gap-2">
                {splits.map(s => {
                  const owes = s.balance >= 0;
                  return (
                    <button key={s.personId} onClick={() => setDetailId(s.personId)}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-600 shrink-0">
                        {s.name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                        <p className={`text-xs font-medium mt-0.5 ${owes ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {owes ? 'Owes you' : 'You owe'}
                        </p>
                      </div>
                      <p className={`text-base font-bold ${owes ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {owes ? '+' : '-'}{formatAmount(Math.abs(s.balance))}
                      </p>
                      <ChevronRight size={18} className="text-slate-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {friends.length > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-20 pointer-events-none">
          <div className="max-w-md mx-auto relative">
            <button onClick={() => setShowAdd(true)}
              className="pointer-events-auto absolute right-4 bottom-0 h-12 pl-4 pr-5 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 text-sm font-bold active:scale-95 transition-transform">
              <Plus size={20} strokeWidth={2.5} /> Add split
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <AddSplitSheet friends={friends}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); loadBalances(); }} />
      )}

      {feedItem && (
        <SplitFeedDetailSheet item={feedItem} friends={friends}
          onClose={() => setFeedItem(null)}
          onChanged={() => { setFeedItem(null); load(); loadBalances(); }} />
      )}

      {detailId && (
        <DetailSheet personId={detailId} name={detailName}
          onClose={() => setDetailId(null)}
          onChanged={() => { loadBalances(); load(); }} />
      )}
    </div>
  );
}

// ── Add split — two modes: "I paid" (split a bill) and "I owe" (direct) ─────────
function AddSplitSheet({ friends, onClose, onSaved }: {
  friends: Person[]; onClose: () => void; onSaved: () => void;
}) {
  const { activeCategories } = useConfig();
  const [mode, setMode] = useState<'paid' | 'owe'>('paid');

  // ── "I paid" state ──
  const [total,     setTotal]     = useState('');
  const [picked,    setPicked]    = useState<string[]>([]);  // friend ids sharing the bill
  const [includeMe, setIncludeMe] = useState(true);          // is it my expense too?
  const [category,  setCategory]  = useState(activeCategories[0]?.key ?? '');  // your own share's category
  const [equal,     setEqual]     = useState(true);
  const [custom,    setCustom]    = useState<Record<string, string>>({});  // personKey → amount

  // ── "I owe" state ──
  const [oweId,  setOweId]  = useState('');
  const [oweAmt, setOweAmt] = useState('');

  const [date,   setDate]   = useState(todayStr());
  const [note,   setNote]   = useState('');
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const nameOf  = (id: string) => friends.find(f => f.id === id)?.name ?? 'friend';

  // "I paid" derivations
  const totalN = parseFloat(total) || 0;
  const participants = includeMe ? ['me', ...picked] : picked;
  const equalShares = computeEqualShares(totalN, participants, includeMe);
  const shareOf = (key: string) => equal ? (equalShares[key] ?? 0) : (parseFloat(custom[key]) || 0);
  const togglePicked = (id: string) =>
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const paidLegs: SplitLeg[] = picked.map(f => ({ personId: f, amount: shareOf(f) })).filter(l => l.amount > 0);
  const youGet = paidLegs.reduce((s, l) => s + l.amount, 0);

  // "I owe" derivations
  const oweAmtN = parseFloat(oweAmt) || 0;

  const save = async () => {
    setError('');
    if (!note.trim()) { setError('Add a note (e.g. Dinner)'); return; }
    try {
      if (mode === 'paid') {
        if (totalN <= 0)         { setError('Enter the total bill'); return; }
        if (picked.length === 0) { setError('Pick who you paid for'); return; }
        // Every selected person needs a real share — don't silently drop
        // whoever was left at 0 (or blank, in Custom mode).
        const zeroPerson = picked.find(f => shareOf(f) <= 0);
        if (zeroPerson) { setError(`Enter an amount for ${nameOf(zeroPerson)}`); return; }
        // Shares (incl. your own, if included) must add up to the total bill —
        // Custom mode lets you type anything per person, so this can drift.
        const allShares = participants.reduce((s, key) => s + shareOf(key), 0);
        if (Math.abs(allShares - totalN) > 0.01) {
          setError(`Shares add up to ${formatAmount(allShares)}, but the bill is ${formatAmount(totalN)}`);
          return;
        }
        setSaving(true);
        const myShare = includeMe ? shareOf('me') : 0;
        await createSplitGroup({
          iPaid: true, legs: paidLegs, note: note.trim(), date,
          myShare: myShare > 0 ? myShare : undefined,
          myShareCategory: myShare > 0 ? category : undefined,
        });
      } else {
        if (!oweId)      { setError('Pick a friend'); return; }
        if (oweAmtN <= 0) { setError('Enter the amount you owe'); return; }
        setSaving(true);
        await createSplitGroup({ iPaid: false, legs: [{ personId: oweId, amount: oweAmtN }], note: note.trim(), date });
      }
      onSaved();
    } catch { setError('Failed to save. Try again.'); setSaving(false); }
  };

  return (
    <BottomSheet title="Add a split" onClose={onClose}>
      {/* Mode selector */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        {[
          { k: 'paid', label: 'I paid', sub: 'split a bill' },
          { k: 'owe',  label: 'I owe',  sub: 'someone paid for me' },
        ].map(o => (
          <button key={o.k} onClick={() => { setMode(o.k as 'paid' | 'owe'); setError(''); }}
            className={`flex-1 py-2 rounded-xl transition-all ${mode === o.k ? 'bg-white shadow-sm' : ''}`}>
            <span className={`block text-sm font-bold ${mode === o.k ? 'text-indigo-600' : 'text-slate-400'}`}>{o.label}</span>
            <span className={`block text-[10px] ${mode === o.k ? 'text-slate-400' : 'text-slate-400'}`}>{o.sub}</span>
          </button>
        ))}
      </div>

      {/* Note — required */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Note</p>
        <input type="text" placeholder="e.g. Dinner" value={note} autoFocus onChange={e => setNote(e.target.value)}
          className="w-full text-sm font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
      </div>

      {/* ════════ I PAID ════════ */}
      {mode === 'paid' && (
        <>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total bill</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-slate-400">₹</span>
              <input type="text" inputMode="decimal" placeholder="0" value={total}
                onChange={e => setTotal(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
            <DateField value={date} onChange={setDate} max={todayStr()} />
          </div>

          {/* Split between — tap "You" off if it isn't your expense */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Split between</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setIncludeMe(v => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  includeMe ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                }`}>
                You
              </button>
              {friends.map(f => {
                const on = picked.includes(f.id);
                return (
                  <button key={f.id} onClick={() => togglePicked(f.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                    {f.name}
                  </button>
                );
              })}
            </div>
            {!includeMe && <p className="text-[10px] text-slate-400 mt-1.5">You're paying only for others — the full bill is owed back to you.</p>}
          </div>

          {/* Category for your own share — only relevant when you're part of the split,
              since it's what gets recorded as a real expense and feeds Insights/Budgets */}
          {includeMe && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your share's category</p>
              <div className="grid grid-cols-4 gap-2">
                {activeCategories.map(c => {
                  const active = category === c.key;
                  return (
                    <button key={c.key} onClick={() => setCategory(c.key)}
                      className={`py-2.5 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      <ConfigIcon name={c.icon} size={18} className={active ? 'text-white' : getIconColor(c.icon).text} />
                      <span className="text-[10px] font-semibold truncate w-full text-center">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Split method + per-person amounts, with the result folded in below */}
          {totalN > 0 && picked.length > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 flex flex-col gap-2">
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                {[{ k: true, label: 'Equally' }, { k: false, label: 'Custom' }].map(o => (
                  <button key={String(o.k)} onClick={() => setEqual(o.k)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      equal === o.k ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                    }`}>{o.label}</button>
                ))}
              </div>
              {participants.map(key => {
                const label = key === 'me' ? 'You' : nameOf(key);
                return (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    {equal ? (
                      <span className="text-sm font-bold text-slate-500">{formatAmount(shareOf(key))}</span>
                    ) : (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 w-24">
                        <span className="text-xs text-slate-400">₹</span>
                        <input type="text" inputMode="decimal" placeholder="0" value={custom[key] ?? ''}
                          onChange={e => setCustom(c => ({ ...c, [key]: e.target.value.replace(/[^0-9.]/g, '') }))}
                          className="w-full text-sm font-bold text-slate-800 outline-none bg-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}

              {youGet > 0 && (
                <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold text-emerald-600">
                    You're owed from {paidLegs.length} {paidLegs.length === 1 ? 'friend' : 'friends'}
                  </span>
                  <span className="text-base font-bold text-emerald-600">{formatAmount(youGet)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════ I OWE ════════ */}
      {mode === 'owe' && (
        <>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Who paid for you?</p>
            <select value={oweId} onChange={e => setOweId(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none">
              <option value="">Select friend…</option>
              {friends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
            <DateField value={date} onChange={setDate} max={todayStr()} />
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Amount you owe</p>
            <div className="flex items-center gap-1 px-1">
              <span className="text-lg font-bold text-slate-400">₹</span>
              <input type="text" inputMode="decimal" placeholder="0" value={oweAmt}
                onChange={e => setOweAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
            </div>
            {oweId && oweAmtN > 0 && (
              <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-rose-500">You owe {nameOf(oweId)}</span>
                <span className="text-base font-bold text-rose-500">{formatAmount(oweAmtN)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

      <div className="flex gap-3 pb-2">
        <button onClick={onClose} className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
    </BottomSheet>
  );
}

// ── Per-friend detail: history + settle ────────────────────────────────────────
function DetailSheet({ personId, name, onClose, onChanged }: {
  personId: string; name: string; onClose: () => void; onChanged: () => void;
}) {
  const [detail, setDetail] = useState<SplitDetail | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleAmt, setSettleAmt] = useState('');
  const [settleErr, setSettleErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => getSplitDetail(personId).then(setDetail);
  useEffect(() => { load(); }, [personId]);

  const balance = detail?.balance ?? 0;
  const owes = balance >= 0;
  const max = Math.abs(balance);

  const openSettle = () => { setSettleAmt(String(max)); setSettleErr(''); setSettleOpen(true); };
  const doSettle = async () => {
    const amt = parseFloat(settleAmt);
    if (isNaN(amt) || amt <= 0)  { setSettleErr('Enter an amount'); return; }
    if (amt > max + 0.01)        { setSettleErr(`Can't exceed ${formatAmount(max)}`); return; }
    setSettleErr(''); setBusy(true);
    try {
      // Full amount → omit so the backend clears it exactly.
      await settleSplit(personId, amt >= max - 0.01 ? undefined : amt);
      setSettleOpen(false); await load(); onChanged();
    } finally { setBusy(false); }
  };

  return (
    <BottomSheet title={name} onClose={onClose}>
      {!detail ? <Spinner /> : <>
      {/* Balance banner */}
      <div className={`rounded-2xl px-4 py-4 text-center ${Math.abs(balance) < 0.01 ? 'bg-slate-50' : owes ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <p className="text-xs text-slate-500">
          {Math.abs(balance) < 0.01 ? 'All settled up' : owes ? `${name} owes you` : `You owe ${name}`}
        </p>
        {Math.abs(balance) >= 0.01 && (
          <p className={`text-3xl font-bold mt-1 ${owes ? 'text-emerald-600' : 'text-rose-500'}`}>
            {formatAmount(Math.abs(balance))}
          </p>
        )}
      </div>

      {max >= 0.01 && !settleOpen && (
        <button onClick={openSettle}
          className="w-full py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:opacity-80">
          <Check size={16} strokeWidth={2.5} /> Settle up
        </button>
      )}

      {/* Settle panel — full or partial */}
      {max >= 0.01 && settleOpen && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            {owes ? `${name} pays you` : `You pay ${name}`}
          </p>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
            <span className="text-lg font-bold text-slate-400">₹</span>
            <input type="text" inputMode="decimal" value={settleAmt} autoFocus
              onChange={e => setSettleAmt(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent" />
          </div>
          {/* Quick chips */}
          <div className="flex gap-2">
            {[0.5, 1].map(frac => {
              const v = Math.round(max * frac * 100) / 100;
              return (
                <button key={frac} onClick={() => setSettleAmt(String(v))}
                  className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-500 active:bg-slate-100">
                  {frac === 1 ? 'Full' : 'Half'} · {formatAmount(v)}
                </button>
              );
            })}
          </div>
          {settleErr && <p className="text-xs text-rose-500 font-medium">{settleErr}</p>}
          <div className="flex gap-2">
            <button onClick={() => setSettleOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={doSettle} disabled={busy}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {busy ? 'Saving…' : 'Settle'}
            </button>
          </div>
        </div>
      )}
      </>}
    </BottomSheet>
  );
}

// ── Feed row detail — a group shows the per-person breakdown (tap a leg to
// drill in); a single entry goes straight to view/edit ─────────────────────────
function SplitFeedDetailSheet({ item, friends, onClose, onChanged }: {
  item: FeedItem; friends: Person[]; onClose: () => void; onChanged: () => void;
}) {
  const { getBehavior, getTypeIcon } = useConfig();
  const [editing, setEditing] = useState(false);

  // Single entries are already "one row = one thing" — go straight to view/edit.
  if (item.kind === 'txn') {
    return <SplitEntrySheet entry={item.t} onClose={onClose} onChanged={onChanged} />;
  }

  const legs = item.legs;

  // Editing a multi-person split is row-wise (the whole bill at once), not
  // person-wise — no more drilling into each leg separately to fix it.
  if (editing) {
    return (
      <EditSplitGroupSheet legs={legs} friends={friends}
        onBack={() => setEditing(false)}
        onChanged={onChanged} />
    );
  }

  const total = legs.reduce((s, l) => s + l.amount, 0);
  const splitLeg = legs.find(l => getBehavior(l.type).startsWith('SPLIT_')) ?? legs[0];
  const behavior = getBehavior(splitLeg.type);
  const isPositive = SPLIT_POSITIVE.has(behavior);
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
        {legs.map(l => (
          <div key={l.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">{l.person?.name ?? 'You'}</span>
            <span className="text-sm font-bold text-slate-800">{formatAmount(l.amount)}</span>
          </div>
        ))}
      </div>

      <button onClick={() => setEditing(true)}
        className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80">
        <Pencil size={15} strokeWidth={2} /> Edit split
      </button>
    </BottomSheet>
  );
}

// ── Edit an entire split group in one screen — note, total, date, and every
// person's share together, instead of drilling into each leg one at a time.
// Diffs against the original legs on save: updates people who are still in
// the split, deletes anyone removed, creates legs for anyone newly added,
// and creates/updates/deletes your own EXPENSE share leg as "You" is toggled.
function EditSplitGroupSheet({ legs, friends, onBack, onChanged }: {
  legs: Transaction[]; friends: Person[]; onBack: () => void; onChanged: () => void;
}) {
  const { config, activeCategories } = useConfig();
  const friendLeg  = legs.find(l => l.person) ?? legs[0];
  const expenseLeg = legs.find(l => !l.person) ?? null;
  const groupId    = legs[0].splitGroupId!;
  const legType    = friendLeg.type;

  const [note,      setNote]      = useState(friendLeg.note ?? '');
  const [total,     setTotal]     = useState(String(legs.reduce((s, l) => s + l.amount, 0)));
  const [date,      setDate]      = useState(legs[0].date.substring(0, 10));
  const [includeMe, setIncludeMe] = useState(!!expenseLeg);
  const [category,  setCategory]  = useState(expenseLeg?.category ?? activeCategories[0]?.key ?? '');
  const [picked,    setPicked]    = useState<string[]>(legs.filter(l => l.person).map(l => l.person!.id));
  const [equal,     setEqual]     = useState(false);  // default Custom, prefilled with actual amounts
  const [custom,    setCustom]    = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const l of legs) map[l.person ? l.person.id : 'me'] = String(l.amount);
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const nameOf = (id: string) => friends.find(f => f.id === id)?.name ?? 'friend';

  const totalN = parseFloat(total) || 0;
  const participants = includeMe ? ['me', ...picked] : picked;
  const equalShares = computeEqualShares(totalN, participants, includeMe);
  const shareOf = (key: string) => equal ? (equalShares[key] ?? 0) : (parseFloat(custom[key]) || 0);
  const togglePicked = (id: string) =>
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const youGet = picked.reduce((s, f) => s + shareOf(f), 0);

  const save = async () => {
    setError('');
    if (!note.trim())        { setError('Add a note'); return; }
    if (totalN <= 0)         { setError('Enter the total bill'); return; }
    if (picked.length === 0) { setError('Pick who you paid for'); return; }
    const zeroPerson = picked.find(f => shareOf(f) <= 0);
    if (zeroPerson) { setError(`Enter an amount for ${nameOf(zeroPerson)}`); return; }
    const allShares = participants.reduce((s, key) => s + shareOf(key), 0);
    if (Math.abs(allShares - totalN) > 0.01) {
      setError(`Shares add up to ${formatAmount(allShares)}, but the bill is ${formatAmount(totalN)}`);
      return;
    }

    setSaving(true);
    try {
      const noteTrim = note.trim();
      const existingFriendLegs = new Map(legs.filter(l => l.person).map(l => [l.person!.id, l]));
      const ops: Promise<unknown>[] = [];

      for (const [personId, leg] of existingFriendLegs) {
        if (!picked.includes(personId)) ops.push(deleteTransaction(leg.id));
      }
      for (const personId of picked) {
        const leg = existingFriendLegs.get(personId);
        const amt = shareOf(personId);
        if (leg) {
          ops.push(updateTransaction(leg.id, { amount: amt, date, note: noteTrim }));
        } else {
          ops.push(createTransaction({
            type: legType, amount: amt, date, paymentMethod: 'CASH',
            personId, note: noteTrim, splitGroupId: groupId,
          } as Parameters<typeof createTransaction>[0] & { splitGroupId: string }));
        }
      }

      const myShare = includeMe ? shareOf('me') : 0;
      if (expenseLeg) {
        if (myShare > 0) ops.push(updateTransaction(expenseLeg.id, { amount: myShare, date, category, note: `${noteTrim} — your share` }));
        else             ops.push(deleteTransaction(expenseLeg.id));
      } else if (myShare > 0) {
        const expenseType = config.types.find(t => t.behavior === 'EXPENSE')?.key;
        if (expenseType) {
          ops.push(createTransaction({
            type: expenseType, amount: myShare, date, category, paymentMethod: 'CASH',
            note: `${noteTrim} — your share`, splitGroupId: groupId,
          } as Parameters<typeof createTransaction>[0] & { splitGroupId: string }));
        }
      }

      await Promise.all(ops);
      onChanged();
    } catch { setError('Failed to save. Try again.'); setSaving(false); }
  };

  return (
    <BottomSheet title="Edit split" onClose={onBack}>
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-400 -mt-2 active:text-slate-600">
        <ChevronLeft size={14} strokeWidth={2.5} /> Back to split
      </button>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Note</p>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          className="w-full text-sm font-semibold text-slate-800 outline-none bg-transparent" />
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total bill</p>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-slate-400">₹</span>
          <input type="text" inputMode="decimal" value={total}
            onChange={e => setTotal(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent" />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
        <DateField value={date} onChange={setDate} max={todayStr()} />
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Split between</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIncludeMe(v => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              includeMe ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
            }`}>
            You
          </button>
          {friends.map(f => {
            const on = picked.includes(f.id);
            return (
              <button key={f.id} onClick={() => togglePicked(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
                }`}>
                {f.name}
              </button>
            );
          })}
        </div>
      </div>

      {includeMe && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your share's category</p>
          <div className="grid grid-cols-4 gap-2">
            {activeCategories.map(c => {
              const active = category === c.key;
              return (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`py-2.5 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  <ConfigIcon name={c.icon} size={18} className={active ? 'text-white' : getIconColor(c.icon).text} />
                  <span className="text-[10px] font-semibold truncate w-full text-center">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {totalN > 0 && picked.length > 0 && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 flex flex-col gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {[{ k: true, label: 'Equally' }, { k: false, label: 'Custom' }].map(o => (
              <button key={String(o.k)} onClick={() => setEqual(o.k)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  equal === o.k ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                }`}>{o.label}</button>
            ))}
          </div>
          {participants.map(key => {
            const label = key === 'me' ? 'You' : nameOf(key);
            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {equal ? (
                  <span className="text-sm font-bold text-slate-500">{formatAmount(shareOf(key))}</span>
                ) : (
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 w-24">
                    <span className="text-xs text-slate-400">₹</span>
                    <input type="text" inputMode="decimal" placeholder="0" value={custom[key] ?? ''}
                      onChange={e => setCustom(c => ({ ...c, [key]: e.target.value.replace(/[^0-9.]/g, '') }))}
                      className="w-full text-sm font-bold text-slate-800 outline-none bg-transparent" />
                  </div>
                )}
              </div>
            );
          })}

          {youGet > 0 && (
            <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-slate-200">
              <span className="text-xs font-semibold text-emerald-600">
                You're owed from {picked.length} {picked.length === 1 ? 'friend' : 'friends'}
              </span>
              <span className="text-base font-bold text-emerald-600">{formatAmount(youGet)}</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

      <div className="flex gap-3 pb-2">
        <button onClick={onBack} className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </BottomSheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{children}</span>
    </div>
  );
}

// ── View → Edit (auto-populated) → Delete for a single split-related transaction ─
function SplitEntrySheet({ entry, onBack, onClose, onChanged }: {
  entry: Transaction; onBack?: () => void; onClose: () => void; onChanged: () => void;
}) {
  const { config, getBehavior, getTypeIcon } = useConfig();

  const [mode,    setMode]    = useState<'view' | 'edit'>('view');
  const [amount,  setAmount]  = useState(String(entry.amount));
  const [date,    setDate]    = useState(entry.date.substring(0, 10));
  const [note,    setNote]    = useState(entry.note ?? '');
  const [type,    setType]    = useState(entry.type);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const behavior = getBehavior(entry.type);
  const isPositive = SPLIT_POSITIVE.has(getBehavior(type));

  // Which two directions this entry can be toggled between — legs (who paid
  // the bill) and settlements (who paid back) are separate pairs, resolved
  // from configured type keys. Your own EXPENSE share has no direction.
  const directionOptions = (() => {
    const byBehavior = (b: string) => config.types.find(t => t.behavior === b);
    if (behavior === 'SPLIT_LEND' || behavior === 'SPLIT_OWE') {
      const lend = byBehavior('SPLIT_LEND'), owe = byBehavior('SPLIT_OWE');
      return lend && owe ? [{ key: lend.key, label: 'I paid' }, { key: owe.key, label: 'I owe' }] : null;
    }
    if (behavior === 'SPLIT_COLLECT' || behavior === 'SPLIT_REPAY') {
      const collect = byBehavior('SPLIT_COLLECT'), repay = byBehavior('SPLIT_REPAY');
      return collect && repay ? [{ key: collect.key, label: 'They paid me' }, { key: repay.key, label: 'I paid them' }] : null;
    }
    return null;
  })();

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      await updateTransaction(entry.id, { amount: amt, date, type, note: note.trim() || undefined });
      onChanged();
    } catch { setError('Failed to save. Try again.'); setSaving(false); }
  };

  const handleDelete = async () => {
    setConfirmDel(false); setSaving(true);
    try { await deleteTransaction(entry.id); onChanged(); }
    catch { setError('Failed to delete. Try again.'); setSaving(false); }
  };

  return (
    <>
      <BottomSheet title={mode === 'view' ? 'Split detail' : 'Edit split'} onClose={onClose}>
        {onBack && mode === 'view' && (
          <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-400 -mt-2 active:text-slate-600">
            <ChevronLeft size={14} strokeWidth={2.5} /> Back to split
          </button>
        )}

        {mode === 'view' ? (
          <>
            <div className="flex flex-col items-center text-center pt-1 pb-2">
              <IconCircle icon={SETTLE_BEHAVIORS.has(behavior) ? 'handshake' : getTypeIcon(entry.type)}
                color={SETTLE_BEHAVIORS.has(behavior) ? 'bg-slate-100' : undefined} />
              {SETTLE_BEHAVIORS.has(behavior) ? (
                <p className="text-3xl font-bold mt-3 text-slate-700">{formatAmount(entry.amount)}</p>
              ) : (
                <p className={`text-3xl font-bold mt-3 ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isPositive ? '+' : '−'}{formatAmount(entry.amount)}
                </p>
              )}
              <p className="text-sm text-slate-400 mt-1">{entry.note || labelFor(behavior)}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100">
              <Row label="Who">{entry.person?.name ?? 'You'}</Row>
              <Row label="Direction">{labelFor(behavior)}</Row>
              <Row label="Date">{formatDateLongUTC(entry.date)}</Row>
              {entry.note && <Row label="Note">{entry.note}</Row>}
            </div>

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setMode('edit'); setError(''); }}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80">
                <Pencil size={15} strokeWidth={2} /> Edit
              </button>
              <button onClick={() => setConfirmDel(true)} disabled={saving}
                className="flex-1 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-500 text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80 disabled:opacity-40">
                <Trash2 size={15} strokeWidth={2} /> Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</p>
              <input type="text" inputMode="decimal" value={amount} autoFocus
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-3xl font-bold text-slate-900 outline-none bg-transparent" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
              <DateField value={date} onChange={setDate} max={todayStr()} />
            </div>

            {directionOptions && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Direction</p>
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  {directionOptions.map(o => (
                    <button key={o.key} onClick={() => setType(o.key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        type === o.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Note</p>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
            </div>

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

            <div className="flex gap-3 pb-2">
              <button onClick={() => { setMode('view'); setError(''); }}
                className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {confirmDel && (
        <ConfirmModal
          title="Delete Entry"
          message="This will be permanently removed and cannot be recovered."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </>
  );
}
