import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../api/transactions';
import { getPersons } from '../api/persons';
import { addCategory } from '../api/config';
import type { PaymentMethod, Person } from '../types';
import { PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { PrimaryButton } from '../components/ui';

const PAYMENTS: PaymentMethod[] = ['GPAY', 'PHONEPE', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

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
  FAMILY_TRANSFER: "e.g. Monthly transfer to mom…",
  BORROW_GIVEN: 'e.g. Lent for medical, house rent…',
  BORROW_RECEIVED: 'e.g. Borrowed for travel…',
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AddTransaction() {
  const navigate = useNavigate();
  const amountRef = useRef<HTMLInputElement>(null);
  const { config, reload: reloadConfig } = useConfig();

  const [amount,        setAmount]        = useState('');
  const [type,          setType]          = useState('EXPENSE');
  const [category,      setCategory]      = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GPAY');
  const [date,          setDate]          = useState(today());
  const [note,          setNote]          = useState('');
  const [personId,      setPersonId]      = useState('');
  const [persons,       setPersons]       = useState<Person[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [showNewCat,    setShowNewCat]    = useState(false);
  const [newCatLabel,   setNewCatLabel]   = useState('');
  const [newCatIcon,    setNewCatIcon]    = useState('');

  useEffect(() => {
    amountRef.current?.focus();
    getPersons().then(setPersons).catch(() => {});
  }, []);

  useEffect(() => {
    if (config.categories.length > 0 && !category) setCategory(config.categories[0].key);
  }, [config.categories]);

  const typeConf     = config.types.find(t => t.key === type);
  const needsPerson  = typeConf?.requiresPerson ?? false;
  const showCats     = typeConf?.hasCategories  ?? false;
  const filteredPersons = needsPerson
    ? (typeConf?.personType === 'FAMILY' ? persons.filter(p => p.type === 'FAMILY') : persons)
    : [];

  const handleAddCustomCategory = async () => {
    const label = newCatLabel.trim();
    const icon  = newCatIcon.trim() || '📌';
    if (!label) return;
    const key = label.toUpperCase().replace(/\s+/g, '_');
    try {
      await addCategory({ key, label, icon });
      await reloadConfig();
      setCategory(key);
    } catch { setCategory(key); }
    setNewCatLabel(''); setNewCatIcon(''); setShowNewCat(false);
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (needsPerson && !personId) { setError('Select a person'); return; }
    setSaving(true); setError('');
    try {
      await createTransaction({
        type: type as any,
        amount: Number(amount),
        date,
        category: showCats ? category : undefined,
        paymentMethod,
        personId: needsPerson ? personId : undefined,
        note: note.trim() || undefined,
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
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-lg">‹</button>
        <h1 className="text-base font-semibold text-slate-900">Add Transaction</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Amount */}
        <div className="bg-white px-4 py-6 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Amount</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-slate-400">₹</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 text-4xl font-bold text-slate-900 outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="p-4 flex flex-col gap-5">
          {/* Note */}
          <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{NOTE_LABEL[type] ?? 'Description'}</p>
            <input
              type="text"
              placeholder={NOTE_PLACEHOLDER[type] ?? 'What was this for?'}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Type</p>
            <div className="flex flex-wrap gap-2">
              {config.types.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setType(t.key); setPersonId(''); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
                    type === t.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category — for types that have hasCategories=true */}
          {showCats && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Category</p>
              <div className="grid grid-cols-3 gap-2">
                {config.categories.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      category === c.key
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-xs font-semibold leading-tight text-center">{c.label}</span>
                  </button>
                ))}

                {showNewCat ? (
                  <div className="col-span-3 bg-white rounded-2xl border border-indigo-200 p-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input autoFocus type="text" placeholder="emoji" value={newCatIcon}
                        onChange={e => setNewCatIcon(e.target.value)} maxLength={2}
                        className="w-14 border border-slate-200 rounded-xl px-2 py-2 text-center text-xl outline-none" />
                      <input type="text" placeholder="Category name" value={newCatLabel}
                        onChange={e => setNewCatLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustomCategory()}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddCustomCategory} className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Add & Select</button>
                      <button onClick={() => { setShowNewCat(false); setNewCatLabel(''); setNewCatIcon(''); }} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNewCat(true)}
                    className="py-3 px-2 rounded-2xl border border-dashed border-slate-300 bg-white flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="text-2xl">＋</span>
                    <span className="text-xs font-semibold">New</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Person */}
          {needsPerson && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {type === 'FAMILY_TRANSFER' ? 'Family Member' : 'Person'}
              </p>
              {filteredPersons.length === 0 ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-rose-600 font-medium">No {type === 'FAMILY_TRANSFER' ? 'family members' : 'people'} added yet.</p>
                  <p className="text-xs text-rose-400 mt-0.5">Go to People → Manage People to add them.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredPersons.map(p => (
                    <button key={p.id} onClick={() => setPersonId(p.id)}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
                        personId === p.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">Payment Method</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENTS.map(p => (
                <button key={p} onClick={() => setPaymentMethod(p)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
                    paymentMethod === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                  {PAYMENT_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 pt-3 bg-gradient-to-t from-slate-50 to-transparent">
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Transaction'}
        </PrimaryButton>
      </div>
    </div>
  );
}
