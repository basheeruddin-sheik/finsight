import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createTransaction } from '../api/transactions';
import { getPersons } from '../api/persons';
import { getPersonBorrows, type Borrow } from '../api/borrows';
import type { PaymentMethod, Person } from '../types';
import { formatAmount, formatDate, PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { PrimaryButton, DateField } from '../components/ui';
import { ConfigIcon, getIconColor } from '../components/configIcons';
import { ChevronLeft } from 'lucide-react';

const PAYMENTS: PaymentMethod[] = ['PHONEPE', 'GPAY', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

const NOTE_LABEL: Record<string, string> = {
  EXPENSE: 'What was this for?',
  INCOME: 'Source / description',
  FAMILY_TRANSFER: 'What was this for?',
  BORROW_GIVEN: 'Why did you lend this?',
  BORROW_RECEIVED: 'What did you borrow for?',
};

const NOTE_PLACEHOLDER: Record<string, string> = {
  EXPENSE: 'e.g. Swiggy order, grocery at DMart…',
  INCOME: 'e.g. Salary, freelance payment…',
  FAMILY_TRANSFER: 'e.g. Monthly transfer to mom…',
  BORROW_GIVEN: 'e.g. Lent for medical, house rent…',
  BORROW_RECEIVED: 'e.g. Borrowed for travel…',
};

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => fmt(new Date());

// ── Reusable section label ────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 px-1">{children}</p>;
}

export default function AddTransaction() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const amountRef = useRef<HTMLInputElement>(null);
  const { config, activeTypes, activeCategories } = useConfig();
  const pendingBorrow = useRef(sp.get('borrow') ?? '');

  const [amount,        setAmount]        = useState('');
  const [type,          setType]          = useState(sp.get('type') ?? 'EXPENSE');
  const [category,      setCategory]      = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PHONEPE');
  const [date,          setDate]          = useState(today());
  const [note,          setNote]          = useState('');
  const [personId,      setPersonId]      = useState(sp.get('person') ?? '');
  const [persons,       setPersons]       = useState<Person[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [interestExp,   setInterestExp]   = useState('');           // BORROW_GIVEN
  const [costBasis,     setCostBasis]     = useState('');           // INVESTMENT_RETURN
  const [borrowId,      setBorrowId]      = useState('');           // repayment / interest target
  const [personBorrows, setPersonBorrows] = useState<Borrow[]>([]);

  useEffect(() => {
    amountRef.current?.focus();
    getPersons().then(setPersons).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCategories.length > 0 && !category) setCategory(activeCategories[0].key);
  }, [activeCategories]);

  const typeConf     = config.types.find(t => t.key === type);
  const behavior     = typeConf?.behavior;
  const isCredit     = behavior === 'INCOME' || behavior === 'RECEIVE_BACK' || behavior === 'DIVEST';
  const needsPerson  = typeConf?.requiresPerson ?? false;
  const showCats     = typeConf?.hasCategories  ?? false;
  const isLend       = behavior === 'LEND';                                   // creates a borrow
  const isDivest     = behavior === 'DIVEST';                                 // selling an investment
  const needsBorrow  = behavior === 'RECEIVE_BACK' || type === 'INTEREST_RECEIVED'; // applies to a borrow
  const isInterest   = type === 'INTEREST_RECEIVED';
  const filteredPersons = needsPerson
    ? (typeConf?.personType === 'FAMILY' ? persons.filter(p => p.type === 'FAMILY') : persons)
    : [];

  // Load the selected person's open borrows when recording a repayment/interest.
  useEffect(() => {
    if (needsBorrow && personId) {
      getPersonBorrows(personId)
        .then(bs => {
          setPersonBorrows(bs.filter(b => isInterest ? (b.status !== 'SETTLED' || b.interestPending > 0) : b.status !== 'SETTLED'));
          // apply a pre-filled borrow once (from a Borrows-page quick action)
          if (pendingBorrow.current && bs.some(b => b.id === pendingBorrow.current)) {
            setBorrowId(pendingBorrow.current);
          } else {
            setBorrowId('');
          }
          pendingBorrow.current = '';
        })
        .catch(() => setPersonBorrows([]));
    } else {
      setPersonBorrows([]);
      setBorrowId('');
    }
  }, [needsBorrow, isInterest, personId, type]);

  const numAmount = Number(amount);
  const validAmount = !!amount && !isNaN(numAmount) && numAmount > 0;
  const amtColor = !amount ? 'text-slate-300' : isCredit ? 'text-emerald-500' : 'text-slate-900';

  const handleAmount = (v: string) => setAmount(v.replace(/[^0-9.]/g, ''));

  const handleSave = async () => {
    if (!validAmount) { setError('Enter a valid amount'); return; }
    if (needsPerson && !personId) { setError('Select a person'); return; }
    if (needsBorrow && !borrowId) { setError('Select which borrow this applies to'); return; }
    setSaving(true); setError('');
    try {
      await createTransaction({
        type: type as any,
        amount: numAmount,
        date,
        category: showCats ? category : undefined,
        paymentMethod,
        personId: needsPerson ? personId : undefined,
        note: note.trim() || undefined,
        borrowId: needsBorrow ? borrowId : undefined,
        interestExpected: isLend && interestExp ? Number(interestExp) : undefined,
        costBasis: isDivest && costBasis ? Number(costBasis) : undefined,
      });
      navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <h1 className="text-base font-semibold text-slate-900">Add Transaction</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Amount hero */}
        <div className="bg-white px-4 pt-7 pb-8 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
            {typeConf?.label ?? 'Amount'}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <span className={`text-3xl font-bold transition-colors ${amtColor}`}>₹</span>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => handleAmount(e.target.value)}
              size={Math.max((amount || '0').length, 1)}
              // Inline font-size beats the global `input { font-size:16px }` zoom-guard,
              // which otherwise shrinks this hero input to 16px.
              style={{ fontSize: '3rem', lineHeight: 1 }}
              className={`font-bold bg-transparent outline-none transition-colors ${amtColor} placeholder:text-slate-300`}
            />
          </div>
        </div>

        <div className="p-4 flex flex-col gap-6">
          {/* Type */}
          <div>
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {activeTypes.map(t => {
                const active = type === t.key;
                return (
                  <button key={t.key} onClick={() => { setType(t.key); setPersonId(''); }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
                      active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                    <ConfigIcon name={t.icon} size={16} className={active ? 'text-white' : getIconColor(t.icon).text} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          {showCats && (
            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-4 gap-2">
                {activeCategories.map(c => {
                  const active = category === c.key;
                  return (
                    <button key={c.key} onClick={() => setCategory(c.key)}
                      className={`py-3 px-1.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                      <ConfigIcon name={c.icon} size={22} className={active ? 'text-white' : getIconColor(c.icon).text} />
                      <span className="text-[11px] font-semibold leading-tight text-center truncate w-full">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Person */}
          {needsPerson && (
            <div>
              <Label>{type === 'FAMILY_TRANSFER' ? 'Family Member' : 'Person'}</Label>
              {filteredPersons.length === 0 ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-rose-600 font-medium">No {type === 'FAMILY_TRANSFER' ? 'family members' : 'people'} added yet.</p>
                  <p className="text-xs text-rose-400 mt-0.5">Go to People → Manage People to add them.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredPersons.map(p => {
                    const active = personId === p.id;
                    return (
                      <button key={p.id} onClick={() => setPersonId(p.id)}
                        className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                          active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                          {p.name[0].toUpperCase()}
                        </span>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Which borrow? — for repayment / interest */}
          {needsBorrow && personId && (
            <div>
              <Label>{isInterest ? 'Interest on which borrow?' : 'Repaying which borrow?'}</Label>
              {personBorrows.length === 0 ? (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-amber-700 font-medium">No open borrows for this person.</p>
                  <p className="text-xs text-amber-500 mt-0.5">Record a "Borrow Given" first.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {personBorrows.map(b => {
                    const active = borrowId === b.id;
                    return (
                      <button key={b.id} onClick={() => setBorrowId(b.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
                        }`}>
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{formatAmount(b.principal)} · {formatDate(b.date)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {b.outstanding > 0 ? `${formatAmount(b.outstanding)} left` : 'principal cleared'}
                            {b.interestPending > 0 ? ` · interest ${formatAmount(b.interestPending)} due` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Interest expected — for a new borrow given */}
          {isLend && (
            <div>
              <Label>Interest expected (optional)</Label>
              <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-center gap-2">
                <span className="text-slate-400 font-semibold">₹</span>
                <input type="text" inputMode="decimal" placeholder="0"
                  value={interestExp} onChange={e => setInterestExp(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full text-[15px] font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 px-1">Total interest you expect back. Record it later via “Interest Received”.</p>
            </div>
          )}

          {/* Cost basis — for an investment return (sell / redeem) */}
          {isDivest && (
            <div>
              <Label>Original amount invested (optional)</Label>
              <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-center gap-2">
                <span className="text-slate-400 font-semibold">₹</span>
                <input type="text" inputMode="decimal" placeholder="0"
                  value={costBasis} onChange={e => setCostBasis(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full text-[15px] font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
              </div>
              {(() => {
                const cost = Number(costBasis);
                if (!costBasis || isNaN(cost) || cost <= 0 || !validAmount) {
                  return <p className="text-[11px] text-slate-400 mt-1.5 px-1">What you originally put in. We’ll compute your profit / loss.</p>;
                }
                const pnl = numAmount - cost;
                if (pnl > 0)  return <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 px-1">Profit of {formatAmount(pnl)}</p>;
                if (pnl < 0)  return <p className="text-[11px] font-semibold text-rose-500 mt-1.5 px-1">Loss of {formatAmount(Math.abs(pnl))}</p>;
                return <p className="text-[11px] font-semibold text-slate-500 mt-1.5 px-1">Break even — no profit or loss</p>;
              })()}
            </div>
          )}

          {/* Note */}
          <div>
            <Label>{NOTE_LABEL[type] ?? 'Description'}</Label>
            <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
              <input type="text" placeholder={NOTE_PLACEHOLDER[type] ?? 'What was this for?'}
                value={note} onChange={e => setNote(e.target.value)}
                className="w-full text-[15px] text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
            </div>
          </div>

          {/* Payment + Date side by side */}
          <div>
            <Label>Payment Method</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENTS.map(p => (
                <button key={p} onClick={() => setPaymentMethod(p)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    paymentMethod === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                  {PAYMENT_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Date</Label>
            <DateField value={date} onChange={setDate} max={today()} />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-3 bg-slate-50 border-t border-slate-100 z-20"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : validAmount ? `Save ₹${numAmount.toLocaleString('en-IN')}` : 'Save Transaction'}
        </PrimaryButton>
      </div>
    </div>
  );
}
