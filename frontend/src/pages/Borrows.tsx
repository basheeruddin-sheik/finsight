import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBorrowGroups, getBorrowSummary, settleBorrow, unsettleBorrow, type PersonBorrows, type Borrow, type BorrowAudit, type BorrowSummary } from '../api/borrows';
import { formatAmount, formatDate, formatTime } from '../utils';
import { Spinner, EmptyState, BottomSheet, ConfirmModal } from '../components/ui';
import PeopleTabs from '../components/PeopleTabs';
import { HandCoins, Plus, ArrowDownLeft, ArrowUpRight, Percent, Check, RotateCcw, Ban, BookOpen, X, type LucideIcon } from 'lucide-react';

const latestActivity = (b: Borrow) => Math.max(...b.audit.map(a => new Date(a.createdAt ?? a.date).getTime()));
const latestGroupActivity = (g: PersonBorrows) => Math.max(...g.borrows.map(latestActivity));
const isGroupSettled = (g: PersonBorrows) => g.borrows.every(b => b.status === 'SETTLED');

function SectionHeader({ label, count, action }: { label: string; count: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <span className="text-[11px] font-semibold text-slate-300">{count}</span>
      </div>
      {action}
    </div>
  );
}

// ── Active mode: compact square card per person ───────────────────────────────
function CollectCard({ g, onClick }: { g: PersonBorrows; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="snap-start shrink-0 w-36 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left active:bg-slate-50 transition-colors flex flex-col">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
          {g.person.name[0].toUpperCase()}
        </div>
        {g.borrows.length > 1 && (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 rounded-full px-2 py-0.5">{g.borrows.length} loans</span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800 truncate mt-3">{g.person.name}</p>
      <p className="text-xl font-bold text-rose-500 mt-1 leading-none">{formatAmount(g.outstanding)}</p>
      <p className="text-[10px] text-slate-400 mt-1">to get back</p>
      {g.interestPending > 0 && (
        <p className="text-[10px] font-semibold text-amber-500 mt-1.5">+{formatAmount(g.interestPending)} interest</p>
      )}
    </button>
  );
}

// ── Active mode: single loan row ──────────────────────────────────────────────
function LoanRow({ b, settled, onClick }: { b: Borrow; settled: boolean; onClick: () => void }) {
  const name = b.person?.name ?? 'Unknown';
  const settledLabel = b.writtenOff > 0 ? 'Written off' : b.overReturned > 0 ? 'Over-returned' : 'Settled';
  return (
    <button onClick={onClick}
      className={`w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-colors ${
        settled ? 'bg-slate-50 border-slate-100 active:bg-slate-100' : 'bg-white border-slate-100 shadow-sm active:bg-slate-50'
      }`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        settled ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'
      }`}>
        {name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${settled ? 'text-slate-500' : 'text-slate-800'}`}>
          {name}{b.note ? ` · ${b.note}` : ''}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Lent {formatAmount(b.principal)} · {formatDate(b.date)}</p>
      </div>
      <div className="text-right shrink-0">
        {settled ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
            {settledLabel === 'Settled' && <Check size={13} strokeWidth={2.5} />}{settledLabel}
          </span>
        ) : (
          <>
            <p className="text-sm font-bold text-rose-500">{formatAmount(b.outstanding)}</p>
            <p className="text-[10px] text-slate-400">to get back</p>
            {b.interestPending > 0 && <p className="text-[10px] text-amber-500 mt-0.5">+{formatAmount(b.interestPending)} int</p>}
          </>
        )}
      </div>
    </button>
  );
}

// ── Ledger mode: per-person row (read-only) ───────────────────────────────────
function PersonRow({ g, onClick }: { g: PersonBorrows; onClick: () => void }) {
  const settled = isGroupSettled(g);
  const totalRepaid = g.totalRepaid;
  return (
    <button onClick={onClick}
      className={`w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-colors ${
        settled ? 'bg-slate-50 border-slate-100 active:bg-slate-100' : 'bg-white border-slate-100 shadow-sm active:bg-slate-50'
      }`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        settled ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'
      }`}>
        {g.person.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${settled ? 'text-slate-400' : 'text-slate-800'}`}>{g.person.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Lent {formatAmount(g.totalGiven)} · Paid {formatAmount(totalRepaid)} · {g.borrows.length} loan{g.borrows.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        {settled ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
            <Check size={13} strokeWidth={2.5} /> Settled
          </span>
        ) : (
          <>
            <p className="text-sm font-bold text-rose-500">{formatAmount(g.outstanding)}</p>
            <p className="text-[10px] text-slate-400">outstanding</p>
          </>
        )}
      </div>
    </button>
  );
}

// ── Shared audit log ──────────────────────────────────────────────────────────
const KIND_META = {
  given:    { Icon: ArrowUpRight,  color: 'text-rose-500',    bg: 'bg-rose-50',    label: 'Lent',        sign: '−' },
  repaid:   { Icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Repaid',      sign: '+' },
  interest: { Icon: Percent,       color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Interest',    sign: '+' },
  writeoff: { Icon: Ban,           color: 'text-slate-500',   bg: 'bg-slate-100',  label: 'Written off', sign: ''  },
} as const;

function TxnList({ items }: { items: BorrowAudit[] }) {
  const txns = [...items].sort((a, b) => new Date(b.createdAt ?? b.date).getTime() - new Date(a.createdAt ?? a.date).getTime());
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
      {txns.map(a => {
        const m = KIND_META[a.kind];
        return (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3 bg-white">
            <span className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center ${m.color} shrink-0`}>
              <m.Icon size={16} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{m.label}{a.note ? ` · ${a.note}` : ''}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(a.date)} · {formatTime(a.createdAt)}</p>
            </div>
            <p className={`text-sm font-bold ${m.color} shrink-0`}>{m.sign}{formatAmount(a.amount)}</p>
          </div>
        );
      })}
    </div>
  );
}

function SheetBtn({ onClick, tone, Icon, children }: { onClick: () => void; tone: 'primary' | 'ghost' | 'settle' | 'reopen'; Icon: LucideIcon; children: ReactNode }) {
  const cls = {
    primary: 'bg-indigo-600 text-white',
    ghost:   'border border-slate-700 bg-slate-800 text-slate-200',
    settle:  'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    reopen:  'text-slate-400',
  }[tone];
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold active:opacity-80 ${cls}`}>
      <Icon size={14} /> {children}
    </button>
  );
}

// ── Read-only person ledger sheet ─────────────────────────────────────────────
function LedgerPersonSheet({ g, onClose }: { g: PersonBorrows; onClose: () => void }) {
  const settled = isGroupSettled(g);
  // Sort loans: active first, then settled — within each, newest first.
  const sorted = [...g.borrows].sort((a, b) => {
    const aSettled = a.status === 'SETTLED' ? 1 : 0;
    const bSettled = b.status === 'SETTLED' ? 1 : 0;
    if (aSettled !== bSettled) return aSettled - bSettled;
    return latestActivity(b) - latestActivity(a);
  });
  return (
    <BottomSheet title={g.person.name} onClose={onClose}>
      {/* person summary — read-only */}
      <div className="rounded-2xl bg-slate-900 p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {settled ? 'Status' : 'Total outstanding'}
            </p>
            {settled ? (
              <p className="text-xl font-bold text-emerald-400 mt-1 leading-none inline-flex items-center gap-1.5">
                <Check size={18} strokeWidth={2.5} /> All settled
              </p>
            ) : (
              <p className="text-2xl font-bold text-white mt-1 leading-none">{formatAmount(g.outstanding)}</p>
            )}
            {g.interestPending > 0 && <p className="text-xs text-amber-400 mt-1.5">+ {formatAmount(g.interestPending)} interest pending</p>}
            <p className="text-xs text-slate-500 mt-1.5">{g.borrows.length} loan{g.borrows.length > 1 ? 's' : ''}</p>
          </div>
          <div className="text-right text-xs shrink-0">
            <p className="text-slate-400">Lent <span className="font-semibold text-slate-200">{formatAmount(g.totalGiven)}</span></p>
            <p className="text-slate-400 mt-1">Back <span className="font-semibold text-emerald-400">{formatAmount(g.totalRepaid)}</span></p>
          </div>
        </div>
      </div>

      {/* per-loan blocks with their audit, read-only */}
      {sorted.map(b => {
        const loanSettled = b.status === 'SETTLED';
        const statusLabel = b.writtenOff > 0 ? 'Written off' : b.overReturned > 0 ? 'Over-returned' : 'Settled';
        return (
          <div key={b.id} className={`rounded-2xl border overflow-hidden ${loanSettled ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
            {/* loan header */}
            <div className={`px-4 py-3 flex items-center justify-between ${loanSettled ? 'bg-slate-50' : 'bg-white'}`}>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${loanSettled ? 'text-slate-500' : 'text-slate-800'}`}>
                  {formatAmount(b.principal)}{b.note ? ` · ${b.note}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Lent {formatDate(b.date)}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                {loanSettled ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                    <Check size={12} strokeWidth={2.5} />{statusLabel}
                  </span>
                ) : (
                  <>
                    <p className="text-sm font-bold text-rose-500">{formatAmount(b.outstanding)}</p>
                    {b.interestPending > 0 && <p className="text-[10px] text-amber-500">+{formatAmount(b.interestPending)} int</p>}
                  </>
                )}
              </div>
            </div>
            {/* audit entries */}
            <div className="divide-y divide-slate-100">
              {[...b.audit]
                .sort((x, y) => new Date(y.createdAt ?? y.date).getTime() - new Date(x.createdAt ?? x.date).getTime())
                .map(a => {
                  const m = KIND_META[a.kind];
                  return (
                    <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 ${loanSettled ? 'bg-slate-50' : 'bg-white'}`}>
                      <span className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center ${m.color} shrink-0`}>
                        <m.Icon size={14} strokeWidth={2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${loanSettled ? 'text-slate-500' : 'text-slate-700'}`}>
                          {m.label}{a.note ? ` · ${a.note}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400">{formatDate(a.date)} · {formatTime(a.createdAt)}</p>
                      </div>
                      <p className={`text-sm font-bold ${m.color} shrink-0 ${loanSettled ? 'opacity-70' : ''}`}>
                        {m.sign}{formatAmount(a.amount)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </BottomSheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Borrows() {
  const navigate = useNavigate();
  const [groups,   setGroups]   = useState<PersonBorrows[]>([]);
  const [summary,  setSummary]  = useState<BorrowSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [loan,     setLoan]     = useState<Borrow | null>(null);
  const [person,   setPerson]   = useState<PersonBorrows | null>(null);
  const [ledgerPerson, setLedgerPerson] = useState<PersonBorrows | null>(null);
  const [ledger,   setLedger]   = useState(false);   // false = active view, true = ledger view
  const [confirm,  setConfirm]  = useState<{ borrows: Borrow[]; kind: 'settle' | 'reopen' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [g, s] = await Promise.all([getBorrowGroups(), getBorrowSummary()]);
      setGroups(g); setSummary(s);
      const allLoans = g.flatMap(x => x.borrows);
      setLoan(prev => prev ? allLoans.find(b => b.id === prev.id) ?? null : null);
      setPerson(prev => prev ? g.find(x => x.person.id === prev.person.id) ?? null : null);
      setLedgerPerson(prev => prev ? g.find(x => x.person.id === prev.person.id) ?? null : null);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const applyConfirm = async () => {
    if (!confirm) return;
    const { borrows, kind } = confirm;
    setConfirm(null);
    await Promise.all(borrows.map(b => (kind === 'settle' ? settleBorrow(b.id) : unsettleBorrow(b.id))));
    await load();
  };

  // Active mode: active groups (cards) + per-loan lists.
  const activeGroups  = groups
    .filter(g => g.outstanding > 0 || g.interestPending > 0)
    .sort((a, b) => latestGroupActivity(b) - latestGroupActivity(a));
  const loans         = groups.flatMap(g => g.borrows);
  const activeLoans   = loans.filter(b => b.status !== 'SETTLED').sort((a, b) => latestActivity(b) - latestActivity(a));
  const settledLoans  = loans.filter(b => b.status === 'SETTLED' ).sort((a, b) => latestActivity(b) - latestActivity(a));

  // Ledger mode: all persons, active first then settled, each sorted by last activity.
  const allGroups = [...groups].sort((a, b) => {
    const aS = isGroupSettled(a) ? 1 : 0;
    const bS = isGroupSettled(b) ? 1 : 0;
    if (aS !== bS) return aS - bS;
    return latestGroupActivity(b) - latestGroupActivity(a);
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <PeopleTabs active="borrows" />

      {/* Summary */}
      {summary && (
        <div className="mx-4 mt-4 bg-slate-900 rounded-3xl p-5 shadow-lg shadow-slate-900/10">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
          <p className="text-[34px] leading-none font-bold text-white">{formatAmount(summary.totalOutstanding)}</p>
          {summary.interestPending > 0 && (
            <p className="text-xs text-amber-400 mt-2">+ {formatAmount(summary.interestPending)} interest pending</p>
          )}
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Total lent</p>
              <p className="text-base font-bold text-white mt-0.5">{formatAmount(summary.totalLent)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Recovered</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">{formatAmount(summary.totalRecovered)}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : groups.length === 0 ? (
        <EmptyState
          icon={<HandCoins size={32} />}
          title="No borrows yet"
          description="Tap + and choose Borrow Given to lend money to someone"
          action={
            <button onClick={() => navigate('/add?type=BORROW_GIVEN')}
              className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
              Add Borrow Given
            </button>
          }
        />
      ) : ledger ? (
        /* ── LEDGER VIEW ─────────────────────────────────────────────────── */
        <div className="py-4 px-4 flex flex-col gap-3">
          <SectionHeader
            label="All borrowers"
            count={allGroups.length}
            action={
              <button onClick={() => setLedger(false)}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 active:opacity-70">
                <X size={12} strokeWidth={2.5} /> Close
              </button>
            }
          />
          <div className="flex flex-col gap-2.5">
            {allGroups.map(g => <PersonRow key={g.person.id} g={g} onClick={() => setLedgerPerson(g)} />)}
          </div>
        </div>
      ) : (
        /* ── ACTIVE VIEW ─────────────────────────────────────────────────── */
        <div className="py-4 flex flex-col gap-5">
          {activeGroups.length > 0 && (
            <section>
              <div className="px-4">
                <SectionHeader
                  label="To collect"
                  count={activeGroups.length}
                  action={
                    <button onClick={() => setLedger(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 active:opacity-70">
                      <BookOpen size={12} strokeWidth={2.5} /> Full ledger
                    </button>
                  }
                />
              </div>
              <div className="mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1 snap-x [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none' }}>
                {activeGroups.map(g => <CollectCard key={g.person.id} g={g} onClick={() => setPerson(g)} />)}
              </div>
            </section>
          )}

          <section className="px-4 flex flex-col gap-5">
            {activeLoans.length > 0 && (
              <div>
                <SectionHeader label="To be paid" count={activeLoans.length} />
                <div className="flex flex-col gap-2.5 mt-2">
                  {activeLoans.map(b => <LoanRow key={b.id} b={b} settled={false} onClick={() => setLoan(b)} />)}
                </div>
              </div>
            )}
            {settledLoans.length > 0 && (
              <div>
                <SectionHeader label="Settled" count={settledLoans.length} />
                <div className="flex flex-col gap-2.5 mt-2">
                  {settledLoans.map(b => <LoanRow key={b.id} b={b} settled onClick={() => setLoan(b)} />)}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Active mode — single loan detail with actions */}
      {loan && !ledger && (() => {
        const b = loan;
        const open        = b.status !== 'SETTLED';
        const name        = b.person?.name ?? 'Unknown';
        const canInterest = b.interestExpected > 0 && (open || b.interestPending > 0);
        const canReopen   = !open && b.settledFlag;
        const statusLabel = b.writtenOff > 0 ? 'Written off' : b.overReturned > 0 ? 'Over-returned' : 'Settled';
        return (
          <BottomSheet title={name} onClose={() => setLoan(null)}>
            <div className="rounded-2xl bg-slate-900 p-4">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{open ? 'To get back' : 'Status'}</p>
                  {open ? (
                    <p className="text-2xl font-bold text-white mt-1 leading-none">{formatAmount(b.outstanding)}</p>
                  ) : (
                    <p className="text-xl font-bold text-emerald-400 mt-1 leading-none inline-flex items-center gap-1.5"><Check size={18} strokeWidth={2.5} /> {statusLabel}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">Lent {formatAmount(b.principal)} · {formatDate(b.date)}{b.note ? ` · ${b.note}` : ''}</p>
                  {b.interestPending > 0 && <p className="text-xs text-amber-400 mt-1">+ {formatAmount(b.interestPending)} interest pending</p>}
                  {b.writtenOff > 0 && <p className="text-xs text-slate-400 mt-1">{formatAmount(b.writtenOff)} written off (loss)</p>}
                </div>
                <div className="text-right text-xs shrink-0">
                  <p className="text-slate-400">Repaid <span className="font-semibold text-emerald-400">{formatAmount(b.principalPaid)}</span></p>
                  {b.interestExpected > 0 && <p className="text-slate-400 mt-1">Interest <span className="font-semibold text-slate-200">{formatAmount(b.interestPaid)}/{formatAmount(b.interestExpected)}</span></p>}
                </div>
              </div>
              {(open || canInterest || canReopen) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {open && <SheetBtn tone="primary" Icon={ArrowDownLeft} onClick={() => navigate(`/add?type=BORROW_RECEIVED&person=${b.personId}&borrow=${b.id}`)}>Record repayment</SheetBtn>}
                  {canInterest && <SheetBtn tone="ghost" Icon={Percent} onClick={() => navigate(`/add?type=INTEREST_RECEIVED&person=${b.personId}&borrow=${b.id}`)}>Add interest</SheetBtn>}
                  {open && <SheetBtn tone="settle" Icon={Check} onClick={() => setConfirm({ borrows: [b], kind: 'settle' })}>Settle</SheetBtn>}
                  {canReopen && <SheetBtn tone="reopen" Icon={RotateCcw} onClick={() => setConfirm({ borrows: [b], kind: 'reopen' })}>Reopen</SheetBtn>}
                </div>
              )}
            </div>
            <TxnList items={b.audit} />
            <button onClick={() => navigate(`/add?type=BORROW_GIVEN&person=${b.personId}`)}
              className="w-full py-3 rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500 flex items-center justify-center gap-1.5">
              <Plus size={16} /> Lend more to {name}
            </button>
          </BottomSheet>
        );
      })()}

      {/* Active mode — person overview with actions */}
      {person && !ledger && (() => {
        const g = person;
        const openLoans  = g.borrows.filter(b => b.status !== 'SETTLED');
        const hasOpen    = openLoans.length > 0;
        const hasInterest = g.borrows.some(b => b.interestExpected > 0);
        const reopenable = g.borrows.filter(b => b.settledFlag);
        return (
          <BottomSheet title={g.person.name} onClose={() => setPerson(null)}>
            <div className="rounded-2xl bg-slate-900 p-4">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{hasOpen ? 'To get back' : 'Status'}</p>
                  {hasOpen ? (
                    <p className="text-2xl font-bold text-white mt-1 leading-none">{formatAmount(g.outstanding)}</p>
                  ) : (
                    <p className="text-xl font-bold text-emerald-400 mt-1 leading-none inline-flex items-center gap-1.5"><Check size={18} strokeWidth={2.5} /> All settled</p>
                  )}
                  {g.interestPending > 0 && <p className="text-xs text-amber-400 mt-1.5">+ {formatAmount(g.interestPending)} interest pending</p>}
                  <p className="text-xs text-slate-400 mt-1.5">{g.borrows.length} loan{g.borrows.length > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right text-xs shrink-0">
                  <p className="text-slate-400">Lent <span className="font-semibold text-slate-200">{formatAmount(g.totalGiven)}</span></p>
                  <p className="text-slate-400 mt-1">Back <span className="font-semibold text-emerald-400">{formatAmount(g.totalRepaid)}</span></p>
                </div>
              </div>
              {(hasOpen || reopenable.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {hasOpen && <SheetBtn tone="primary" Icon={ArrowDownLeft} onClick={() => navigate(`/add?type=BORROW_RECEIVED&person=${g.person.id}`)}>Record repayment</SheetBtn>}
                  {hasOpen && hasInterest && <SheetBtn tone="ghost" Icon={Percent} onClick={() => navigate(`/add?type=INTEREST_RECEIVED&person=${g.person.id}`)}>Add interest</SheetBtn>}
                  {hasOpen && <SheetBtn tone="settle" Icon={Check} onClick={() => setConfirm({ borrows: openLoans, kind: 'settle' })}>Settle{openLoans.length > 1 ? ' all' : ''}</SheetBtn>}
                  {!hasOpen && reopenable.length > 0 && <SheetBtn tone="reopen" Icon={RotateCcw} onClick={() => setConfirm({ borrows: reopenable, kind: 'reopen' })}>Reopen</SheetBtn>}
                </div>
              )}
            </div>
            <TxnList items={g.borrows.flatMap(b => b.audit)} />
            <button onClick={() => navigate(`/add?type=BORROW_GIVEN&person=${g.person.id}`)}
              className="w-full py-3 rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500 flex items-center justify-center gap-1.5">
              <Plus size={16} /> Lend more to {g.person.name}
            </button>
          </BottomSheet>
        );
      })()}

      {/* Ledger mode — read-only person detail */}
      {ledgerPerson && ledger && (
        <LedgerPersonSheet g={ledgerPerson} onClose={() => setLedgerPerson(null)} />
      )}

      {/* Lend FAB — only in active view */}
      {!ledger && (
        <div className="fixed left-0 right-0 z-20 pointer-events-none" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-md mx-auto px-4 flex justify-end">
            <button onClick={() => navigate('/add?type=BORROW_GIVEN')} aria-label="Lend"
              className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 text-sm font-bold active:scale-95 transition-transform">
              <HandCoins size={18} strokeWidth={2.5} />
              Lend
            </button>
          </div>
        </div>
      )}

      {confirm && (() => {
        const { borrows, kind } = confirm;
        const writeOff = borrows.reduce((s, b) => s + b.outstanding, 0);
        const many     = borrows.length > 1;
        return (
          <ConfirmModal
            title={kind === 'reopen' ? 'Reopen borrow?' : many ? `Settle ${borrows.length} loans?` : 'Settle borrow?'}
            message={kind === 'reopen'
              ? `${many ? `These ${borrows.length} loans` : 'This loan'} will be marked active again. Any write-off entry is removed.`
              : writeOff > 0
                ? `Mark ${many ? 'these loans' : 'this loan'} settled? ${formatAmount(writeOff)} still outstanding will be recorded as written off — a loss, not money recovered.`
                : `Mark ${many ? 'these loans' : 'this loan'} as fully settled.`}
            confirmLabel={kind === 'reopen' ? 'Reopen' : 'Settle'}
            variant="confirm"
            onConfirm={applyConfirm}
            onCancel={() => setConfirm(null)}
          />
        );
      })()}
    </div>
  );
}
