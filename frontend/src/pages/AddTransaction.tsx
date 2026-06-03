import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../api/transactions';
import type { TransactionType, Category, PaymentMethod } from '../types';
import { CATEGORY_LABELS, PAYMENT_LABELS, TYPE_LABELS } from '../utils';

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'FAMILY_TRANSFER', 'BORROW_GIVEN', 'BORROW_RECEIVED'];
const CATEGORIES: Category[] = ['FOOD_DINING', 'GROCERIES', 'SHOPPING', 'FUEL_TRAVEL', 'SUBSCRIPTIONS', 'MEDICAL', 'ENTERTAINMENT', 'UTILITIES', 'OTHER'];
const PAYMENTS: PaymentMethod[] = ['GPAY', 'PHONEPE', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

const today = () => new Date().toISOString().split('T')[0];

export default function AddTransaction() {
  const navigate = useNavigate();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState<Category>('FOOD_DINING');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GPAY');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount');
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
        note: note.trim() || undefined,
      });
      navigate('/');
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">
      <h1 className="text-lg font-semibold text-gray-700">Add Transaction</h1>

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
              onClick={() => setType(t)}
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
