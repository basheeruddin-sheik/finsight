import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../api/transactions';
import { getPersons } from '../api/persons';
import type { TransactionType, Category, PaymentMethod } from '../types';
import type { Person } from '../types';
import { CATEGORY_LABELS, PAYMENT_LABELS, TYPE_LABELS } from '../utils';

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'FAMILY_TRANSFER', 'BORROW_GIVEN', 'BORROW_RECEIVED'];
const CATEGORIES: Category[] = ['FOOD_DINING', 'GROCERIES', 'SHOPPING', 'FUEL_TRAVEL', 'SUBSCRIPTIONS', 'MEDICAL', 'ENTERTAINMENT', 'UTILITIES', 'OTHER'];
const PAYMENTS: PaymentMethod[] = ['GPAY', 'PHONEPE', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

const PERSON_TYPE_FILTER: Partial<Record<TransactionType, string>> = {
  FAMILY_TRANSFER: 'FAMILY',
  BORROW_GIVEN: undefined,      // any person
  BORROW_RECEIVED: undefined,   // any person
};

// Use local date — toISOString() is UTC which gives wrong date in IST after midnight
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AddTransaction() {
  const navigate = useNavigate();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState<Category>('FOOD_DINING');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GPAY');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [personId, setPersonId] = useState('');
  const [persons, setPersons] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  useEffect(() => {
    amountRef.current?.focus();
    // Ping the server to confirm it's reachable
    const base = `${window.location.protocol}//${window.location.hostname}:3000`;
    fetch(`${base}/persons`)
      .then(r => { setServerOk(r.ok); return r.json(); })
      .then(setPersons)
      .catch(() => setServerOk(false));
  }, []);

  const needsPerson = type === 'FAMILY_TRANSFER' || type === 'BORROW_GIVEN' || type === 'BORROW_RECEIVED';

  const filteredPersons = needsPerson
    ? (PERSON_TYPE_FILTER[type] ? persons.filter(p => p.type === PERSON_TYPE_FILTER[type]) : persons)
    : [];

  const handleTypeChange = (t: TransactionType) => {
    setType(t);
    setPersonId('');
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (needsPerson && !personId) {
      setError('Select a person');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createTransaction({
        type,
        amount: Number(amount),
        date,
        category: type === 'EXPENSE' ? category : undefined,
        paymentMethod,
        personId: needsPerson ? Number(personId) : undefined,
        note: note.trim() || undefined,
      });
      navigate('/');
    } catch (e: any) {
      const detail = [e?.code, e?.message, e?.response?.status, JSON.stringify(e?.response?.data)].filter(Boolean).join(' | ');
      setError(detail || 'Unknown error — check browser console');
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-700">Add Transaction</h1>
        {serverOk === false && (
          <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg">Server offline</span>
        )}
        {serverOk === true && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">Server OK</span>
        )}
      </div>

      {/* Amount */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Amount (₹)</label>
        <input
          ref={amountRef}
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full text-4xl font-bold text-gray-800 mt-1 outline-none"
        />
      </div>

      {/* Type selector */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                type === t
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Category grid — only for EXPENSE */}
      {type === 'EXPENSE' && (
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`p-3 rounded-xl text-sm font-medium border text-center transition-all ${
                  category === c
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Person selector — for FAMILY_TRANSFER / BORROW types */}
      {needsPerson && (
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
            {type === 'FAMILY_TRANSFER' ? 'Family Member' : 'Person'}
          </label>
          {filteredPersons.length === 0 ? (
            <p className="text-sm text-red-400 bg-red-50 rounded-xl p-3">
              No {type === 'FAMILY_TRANSFER' ? 'family members' : 'people'} found. Add them in People first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredPersons.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPersonId(String(p.id))}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    personId === String(p.id)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment method */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Payment Method</label>
        <div className="flex flex-wrap gap-2">
          {PAYMENTS.map(p => (
            <button
              key={p}
              onClick={() => setPaymentMethod(p)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                paymentMethod === p
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {PAYMENT_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full text-base text-gray-800 mt-1 outline-none"
        />
      </div>

      {/* Note */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Note (optional)</label>
        <input
          type="text"
          placeholder="What was this for?"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full text-base text-gray-800 mt-1 outline-none"
        />
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-base font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
