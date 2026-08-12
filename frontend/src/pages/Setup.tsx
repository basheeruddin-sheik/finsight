import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { createPerson, getPersons } from '../api/persons';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import type { Transaction } from '../types';
import { formatAmount } from '../utils';
import { LogoMark } from '../components/Logo';
import { Plus, X, ChevronLeft, TrendingUp, HandCoins, PiggyBank, ArrowRight } from 'lucide-react';
import { Spinner } from '../components/ui';

// All opening balance entries use this date so they never appear in
// monthly calculations (getSummary/getSavingsRateTrend filter by month).
// They still show in all-time getTotals().
export const OPENING_DATE = '2000-01-01';

// ── Types ─────────────────────────────────────────────────────────────────────
interface InvestRow {
  tempId:   string;
  dbId:     string | null;  // null = new row
  category: string;
  amount:   string;
}
interface BorrowRow {
  tempId:     string;
  name:       string;
  personType: 'FRIEND' | 'FAMILY';
  amount:     string;
}

const INVEST_CATS = [
  { key: 'STOCKS',        label: 'Stocks',        emoji: '📈' },
  { key: 'MUTUAL_FUNDS',  label: 'Mutual Funds',  emoji: '📊' },
  { key: 'GOLD',          label: 'Gold',          emoji: '🥇' },
  { key: 'FIXED_DEPOSIT', label: 'Fixed Deposit', emoji: '🏦' },
];

function uid() { return Math.random().toString(36).slice(2); }

// Person names must be unique (per type) — if a row's name matches someone
// who already exists (e.g. re-submitting after a partial failure, or the
// person was added elsewhere already), reuse them instead of erroring out.
async function getOrCreatePerson(name: string, type: 'FRIEND' | 'FAMILY') {
  try {
    return await createPerson({ name, type });
  } catch (e: any) {
    if (e?.response?.status !== 400) throw e;
    const existing = (await getPersons(type)).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!existing) throw e;
    return existing;
  }
}

// ── Helpers to fetch existing opening balance entries ─────────────────────────
async function fetchOpeningData() {
  const [obTxns, investTxns, borrowTxns] = await Promise.all([
    getTransactions({ type: 'OPENING_BALANCE' }),
    getTransactions({ type: 'INVESTMENT',  search: 'Opening balance' }),
    getTransactions({ type: 'BORROW_GIVEN', search: 'Opening balance' }),
  ]);
  return { obTxns, investTxns, borrowTxns };
}

// ── Setup page ────────────────────────────────────────────────────────────────
export default function Setup() {
  const navigate       = useNavigate();
  const { user }       = useAuth0();

  // existing DB entries (used for updates/deletes)
  const [existingOB,      setExistingOB]      = useState<Transaction[]>([]);
  const [deletedInvestIds, setDeletedInvestIds] = useState<string[]>([]);

  // form state
  const [savings,     setSavings]     = useState('');
  const [investments, setInvestments] = useState<InvestRow[]>([]);
  const [borrows,     setBorrows]     = useState<BorrowRow[]>([]);
  const [existingBorrows, setExistingBorrows] = useState<Transaction[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [saved,       setSaved]       = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState<string | undefined>(undefined);

  // ── Load existing data ──────────────────────────────────────────────────────
  useEffect(() => {
    getAccounts().then(accs => setDefaultAccountId((accs.find(a => a.isDefault) ?? accs[0])?.id)).catch(() => {});
    fetchOpeningData()
      .then(({ obTxns, investTxns, borrowTxns }) => {
        setExistingOB(obTxns);

        // Pre-fill savings (sum of all OPENING_BALANCE entries)
        const totalSavings = obTxns.reduce((s, t) => s + t.amount, 0);
        if (totalSavings > 0) setSavings(String(totalSavings));

        // Pre-fill investments
        setInvestments(investTxns.map(t => ({
          tempId:   uid(),
          dbId:     t.id,
          category: t.category ?? 'STOCKS',
          amount:   String(t.amount),
        })));

        // Existing borrows — display-only (may have repayments)
        setExistingBorrows(borrowTxns);
      })
      .finally(() => setPageLoading(false));
  }, []);

  // ── Investment row helpers ──────────────────────────────────────────────────
  const addInvestRow = () => {
    const used = new Set(investments.map(r => r.category));
    const next = INVEST_CATS.find(c => !used.has(c.key));
    if (!next) return;
    setInvestments(p => [...p, { tempId: uid(), dbId: null, category: next.key, amount: '' }]);
  };
  const removeInvestRow = (tempId: string, dbId: string | null) => {
    if (dbId) setDeletedInvestIds(p => [...p, dbId]);
    setInvestments(p => p.filter(r => r.tempId !== tempId));
  };
  const updateInvestRow = (tempId: string, field: 'category' | 'amount', val: string) =>
    setInvestments(p => p.map(r => r.tempId === tempId ? { ...r, [field]: val } : r));

  // ── Borrow row helpers ──────────────────────────────────────────────────────
  const addBorrowRow = () =>
    setBorrows(p => [...p, { tempId: uid(), name: '', personType: 'FRIEND', amount: '' }]);
  const removeBorrowRow = (tempId: string) =>
    setBorrows(p => p.filter(r => r.tempId !== tempId));
  const updateBorrowRow = (tempId: string, field: keyof BorrowRow, val: string) =>
    setBorrows(p => p.map(r => r.tempId === tempId ? { ...r, [field]: val as any } : r));

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // ── Savings ───────────────────────────────────────────────────────────
      const savingsAmt = Number(savings.replace(/,/g, ''));

      if (existingOB.length === 1 && savingsAmt > 0) {
        // Always update to ensure date is correct (idempotent)
        await updateTransaction(existingOB[0].id, { amount: savingsAmt, date: OPENING_DATE });
      } else if (existingOB.length === 1 && savingsAmt === 0) {
        // User cleared savings — delete it
        await deleteTransaction(existingOB[0].id);
      } else if (existingOB.length === 0 && savingsAmt > 0) {
        // New savings entry
        await createTransaction({
          type: 'OPENING_BALANCE', amount: savingsAmt, date: OPENING_DATE,
          paymentMethod: 'BANK_TRANSFER', note: 'Opening balance', accountId: defaultAccountId,
        });
      } else if (existingOB.length > 1) {
        // Multiple entries (edge case) — delete all and recreate
        await Promise.all(existingOB.map(t => deleteTransaction(t.id)));
        if (savingsAmt > 0) {
          await createTransaction({
            type: 'OPENING_BALANCE', amount: savingsAmt, date: OPENING_DATE,
            paymentMethod: 'BANK_TRANSFER', note: 'Opening balance',
          });
        }
      }

      // ── Delete removed investments ─────────────────────────────────────────
      await Promise.all(deletedInvestIds.map(id => deleteTransaction(id)));

      // ── Update / Create investments ────────────────────────────────────────
      for (const row of investments) {
        const amt = Number(row.amount.replace(/,/g, ''));
        if (amt <= 0) continue;
        if (row.dbId) {
          // Always include date to self-heal any wrong-dated legacy entry
          await updateTransaction(row.dbId, { amount: amt, category: row.category, date: OPENING_DATE });
        } else {
          // New — create
          await createTransaction({
            type: 'INVESTMENT', amount: amt, date: OPENING_DATE,
            category: row.category, paymentMethod: 'BANK_TRANSFER',
            note: 'Opening balance — existing investment', accountId: defaultAccountId,
          });
        }
      }

      // ── Create new borrows ─────────────────────────────────────────────────
      for (const row of borrows) {
        const amt  = Number(row.amount.replace(/,/g, ''));
        const name = row.name.trim();
        if (!name || amt <= 0) continue;
        const person = await getOrCreatePerson(name, row.personType);
        await createTransaction({
          type: 'BORROW_GIVEN', amount: amt, date: OPENING_DATE,
          paymentMethod: 'CASH', personId: person.id,
          note: 'Opening balance — existing loan', accountId: defaultAccountId,
        });
      }

      // Mark setup done in localStorage
      if (user?.sub) localStorage.setItem(`finsight_setup_${user.sub}`, '1');

      setSaved(true);
      setTimeout(() => navigate('/'), 1200);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto">
      <PageHeader onBack={() => navigate(-1)} />
      <Spinner />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto pb-8">
      <PageHeader onBack={() => navigate(-1)} />

      <div className="p-4 flex flex-col gap-4">

        <p className="text-xs text-slate-400 text-center px-2">
          These entries are dated in the past — they won't affect any monthly reports or charts,
          only your all-time totals.
        </p>

        {/* ── SAVINGS ──────────────────────────────────────────────────── */}
        <SectionCard
          icon={<PiggyBank size={20} className="text-indigo-500" strokeWidth={1.5} />}
          iconBg="bg-indigo-50"
          title="Current Savings"
          desc="Total in bank accounts and cash before using Finsight"
        >
          <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-2">
            <span className="text-base font-bold text-slate-400">₹</span>
            <input
              type="text" inputMode="decimal"
              placeholder="0"
              value={savings}
              onChange={e => setSavings(e.target.value.replace(/[^0-9.]/g, ''))}
              className="flex-1 text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-200"
            />
            {savings && Number(savings) > 0 && (
              <span className="text-xs text-slate-400 shrink-0">{formatAmount(Number(savings))}</span>
            )}
          </div>
        </SectionCard>

        {/* ── INVESTMENTS ──────────────────────────────────────────────── */}
        <SectionCard
          icon={<TrendingUp size={20} className="text-amber-500" strokeWidth={1.5} />}
          iconBg="bg-amber-50"
          title="Existing Investments"
          desc="Amount you've put in — no profit/loss needed, just your original investment"
        >
          <div className="flex flex-col gap-2">
            {investments.map(row => {
              const usedCats = new Set(investments.filter(r => r.tempId !== row.tempId).map(r => r.category));
              return (
                <div key={row.tempId} className="flex items-center gap-2">
                  <select
                    value={row.category}
                    onChange={e => updateInvestRow(row.tempId, 'category', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
                  >
                    {INVEST_CATS.map(c => (
                      <option key={c.key} value={c.key} disabled={usedCats.has(c.key)}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 gap-1 w-28 shrink-0">
                    <span className="text-sm text-slate-400">₹</span>
                    <input
                      type="text" inputMode="decimal" placeholder="0"
                      value={row.amount}
                      onChange={e => updateInvestRow(row.tempId, 'amount', e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full text-sm font-bold text-slate-800 outline-none bg-transparent placeholder:text-slate-300"
                    />
                  </div>
                  <button onClick={() => removeInvestRow(row.tempId, row.dbId)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 active:text-rose-400 shrink-0">
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}

            {investments.length < INVEST_CATS.length && (
              <button onClick={addInvestRow}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-400 flex items-center justify-center gap-1.5 active:bg-slate-50">
                <Plus size={15} strokeWidth={2.5} /> Add investment
              </button>
            )}
          </div>
        </SectionCard>

        {/* ── BORROWS ──────────────────────────────────────────────────── */}
        <SectionCard
          icon={<HandCoins size={20} className="text-violet-500" strokeWidth={1.5} />}
          iconBg="bg-violet-50"
          title="Existing Borrows"
          desc="People who already owe you money before you started tracking"
        >
          <div className="flex flex-col gap-2">
            {/* Existing borrows — display only */}
            {existingBorrows.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-1">
                {existingBorrows.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700">
                      {t.person?.name ?? 'Unknown'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-violet-600">{formatAmount(t.amount)}</span>
                      <button onClick={() => navigate('/borrows')}
                        className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 active:text-indigo-500">
                        Manage <ArrowRight size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 text-center">
                  To edit or record repayments, use the Borrows page
                </p>
              </div>
            )}

            {/* New borrow rows */}
            {borrows.map(row => (
              <div key={row.tempId} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text" placeholder="Person's name"
                    value={row.name}
                    onChange={e => updateBorrowRow(row.tempId, 'name', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                  />
                  <button onClick={() => removeBorrowRow(row.tempId)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 active:text-rose-400 shrink-0">
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
                    {(['FRIEND', 'FAMILY'] as const).map(t => (
                      <button key={t} onClick={() => updateBorrowRow(row.tempId, 'personType', t)}
                        className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
                          row.personType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                        }`}>
                        {t === 'FRIEND' ? 'Friend' : 'Family'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 gap-1 flex-1">
                    <span className="text-sm text-slate-400">₹</span>
                    <input
                      type="text" inputMode="decimal" placeholder="0"
                      value={row.amount}
                      onChange={e => updateBorrowRow(row.tempId, 'amount', e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full text-sm font-bold text-slate-800 outline-none bg-transparent placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addBorrowRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-400 flex items-center justify-center gap-1.5 active:bg-slate-50">
              <Plus size={15} strokeWidth={2.5} /> Add person
            </button>
          </div>
        </SectionCard>

        {error && <p className="text-sm text-rose-500 font-medium text-center">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full py-4 rounded-2xl text-sm font-bold transition-all active:opacity-80 disabled:opacity-50 ${
            saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
          }`}
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PageHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
      <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200">
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>
      <div className="flex items-center gap-2">
        <LogoMark className="w-6 h-6" />
        <span className="text-base font-bold text-slate-900">Opening Balances</span>
      </div>
    </div>
  );
}

function SectionCard({
  icon, iconBg, title, desc, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
