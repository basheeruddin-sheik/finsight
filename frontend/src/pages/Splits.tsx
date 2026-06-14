import { useEffect, useState } from 'react';
import {
  getSplits, getSplitDetail, createSplitGroup, settleSplit, deleteSplitEntry,
  type SplitBalance, type SplitDetail, type SplitLeg,
} from '../api/splits';
import { getPersons } from '../api/persons';
import type { Person } from '../types';
import { formatAmount, formatDate } from '../utils';
import { Spinner, EmptyState, BottomSheet } from '../components/ui';
import PeopleTabs from '../components/PeopleTabs';
import { Users, Plus, ChevronRight, X, Check } from 'lucide-react';

export default function Splits() {
  const [splits,  setSplits]  = useState<SplitBalance[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd,  setShowAdd]  = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([getSplits(), getPersons('FRIEND')]);
      setSplits(s); setFriends(p);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const owedToYou = splits.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
  const youOwe    = splits.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
  const net       = owedToYou - youOwe;

  const detailName = splits.find(s => s.personId === detailId)?.name
    ?? friends.find(f => f.id === detailId)?.name ?? '';

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <PeopleTabs active="splits" />

      {/* Net summary */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
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

      {loading ? <Spinner /> : splits.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No splits yet"
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
        <div className="p-4 flex flex-col gap-2">
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
          onSaved={() => { setShowAdd(false); load(); }} />
      )}

      {detailId && (
        <DetailSheet personId={detailId} name={detailName}
          onClose={() => setDetailId(null)}
          onChanged={load} />
      )}
    </div>
  );
}

// ── Add split — two modes: "I paid" (split a bill) and "I owe" (direct) ─────────
function AddSplitSheet({ friends, onClose, onSaved }: {
  friends: Person[]; onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState<'paid' | 'owe'>('paid');

  // ── "I paid" state ──
  const [total,     setTotal]     = useState('');
  const [picked,    setPicked]    = useState<string[]>([]);  // friend ids sharing the bill
  const [includeMe, setIncludeMe] = useState(true);          // is it my expense too?
  const [equal,     setEqual]     = useState(true);
  const [custom,    setCustom]    = useState<Record<string, string>>({});  // personKey → amount

  // ── "I owe" state ──
  const [oweId,  setOweId]  = useState('');
  const [oweAmt, setOweAmt] = useState('');

  const [note,   setNote]   = useState('');
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const nameOf  = (id: string) => friends.find(f => f.id === id)?.name ?? 'friend';

  // "I paid" derivations
  const totalN = parseFloat(total) || 0;
  const participants = includeMe ? ['me', ...picked] : picked;
  const equalShare = participants.length > 0 ? Math.round((totalN / participants.length) * 100) / 100 : 0;
  const shareOf = (key: string) => equal ? equalShare : (parseFloat(custom[key]) || 0);
  const togglePicked = (id: string) =>
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const paidLegs: SplitLeg[] = picked.map(f => ({ personId: f, amount: shareOf(f) })).filter(l => l.amount > 0);
  const youGet = paidLegs.reduce((s, l) => s + l.amount, 0);

  // "I owe" derivations
  const oweAmtN = parseFloat(oweAmt) || 0;

  const save = async () => {
    setError('');
    try {
      if (mode === 'paid') {
        if (totalN <= 0)         { setError('Enter the total bill'); return; }
        if (picked.length === 0) { setError('Pick who you paid for'); return; }
        if (paidLegs.length === 0) { setError('Amounts must be greater than zero'); return; }
        setSaving(true);
        await createSplitGroup({ iPaid: true, legs: paidLegs, note: note.trim() || undefined });
      } else {
        if (!oweId)      { setError('Pick a friend'); return; }
        if (oweAmtN <= 0) { setError('Enter the amount you owe'); return; }
        setSaving(true);
        await createSplitGroup({ iPaid: false, legs: [{ personId: oweId, amount: oweAmtN }], note: note.trim() || undefined });
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

      {/* ════════ I PAID ════════ */}
      {mode === 'paid' && (
        <>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total bill</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-slate-400">₹</span>
              <input type="text" inputMode="decimal" placeholder="0" value={total} autoFocus
                onChange={e => setTotal(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
            </div>
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

          {/* Split method + per-person amounts */}
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
                      <span className="text-sm font-bold text-slate-500">{formatAmount(equalShare)}</span>
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
            </div>
          )}

          {youGet > 0 && (
            <div className="rounded-2xl px-4 py-3 text-center border bg-emerald-50 border-emerald-100">
              <p className="text-xs text-slate-500">You're owed from {paidLegs.length} {paidLegs.length === 1 ? 'friend' : 'friends'}</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{formatAmount(youGet)}</p>
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
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Amount you owe</p>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-slate-400">₹</span>
              <input type="text" inputMode="decimal" placeholder="0" value={oweAmt}
                onChange={e => setOweAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
            </div>
          </div>
          {oweId && oweAmtN > 0 && (
            <div className="rounded-2xl px-4 py-3 text-center border bg-rose-50 border-rose-100">
              <p className="text-xs text-slate-500">You owe {nameOf(oweId)}</p>
              <p className="text-2xl font-bold mt-1 text-rose-500">{formatAmount(oweAmtN)}</p>
            </div>
          )}
        </>
      )}

      {/* Note (shared) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <input type="text" placeholder="Note (e.g. Dinner)" value={note} onChange={e => setNote(e.target.value)}
          className="w-full text-sm font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
      </div>

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
  const doDelete = async (id: string) => {
    setBusy(true);
    try { await deleteSplitEntry(id); await load(); onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={name} onClose={onClose}>
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

      {/* History */}
      <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto -mx-1 px-1">
        {!detail ? <div className="py-4"><Spinner /></div> : detail.entries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>
        ) : detail.entries.map(e => {
          const pos = e.signed >= 0;
          const label = e.note || labelFor(e.behavior);
          return (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(e.date as unknown as string)}</p>
              </div>
              <p className={`text-sm font-bold ${pos ? 'text-emerald-600' : 'text-rose-500'}`}>
                {pos ? '+' : '-'}{formatAmount(Math.abs(e.signed))}
              </p>
              <button onClick={() => doDelete(e.id)} disabled={busy}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 active:text-rose-400 disabled:opacity-40 shrink-0">
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

    </BottomSheet>
  );
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
