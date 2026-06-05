import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../api/transactions';
import { getPersons } from '../api/persons';
import type { TransactionType, PaymentMethod, Person } from '../types';
import { PAYMENT_LABELS } from '../utils';
import { BUILTIN_CATEGORIES, getCategoryLabel, getSettings, saveSettings } from '../settings';

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'FAMILY_TRANSFER', 'BORROW_GIVEN', 'BORROW_RECEIVED'];
const PAYMENTS: PaymentMethod[] = ['GPAY', 'PHONEPE', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

const NOTE_PLACEHOLDER: Record<TransactionType, string> = {
  EXPENSE: 'e.g. Swiggy order, grocery run at DMart',
  INCOME: 'e.g. Salary, freelance payment, bonus',
  FAMILY_TRANSFER: "e.g. Monthly transfer to mom, dad's medical",
  BORROW_GIVEN: 'e.g. Lent for house rent, medical emergency',
  BORROW_RECEIVED: 'e.g. Borrowed for travel, emergency',
};

const NOTE_LABEL: Record<TransactionType, string> = {
  EXPENSE: 'What was this for?',
  INCOME: 'Source / description',
  FAMILY_TRANSFER: 'What was this for?',
  BORROW_GIVEN: 'Why did you lend this?',
  BORROW_RECEIVED: 'What did you borrow for?',
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AddTransaction() {
  const navigate = useNavigate();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState(BUILTIN_CATEGORIES[0].key);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GPAY');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [personId, setPersonId] = useState('');
  const [persons, setPersons] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [typeLabels, setTypeLabels] = useState<Record<TransactionType, string>>({} as any);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    amountRef.current?.focus();
    getPersons().then(setPersons).catch(() => {});
    const s = getSettings();
    setCustomCategories(s.customCategories);
    setTypeLabels(s.typeLabels);
  }, []);

  const allCategories = [
    ...BUILTIN_CATEGORIES,
    ...customCategories.map(c => ({ key: c, label: c })),
  ];

  const handleAddCustomCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const updated = [...customCategories, name];
    setCustomCategories(updated);
    const s = getSettings();
    saveSettings({ ...s, customCategories: updated });
    setCategory(name);
    setNewCatName('');
    setShowNewCat(false);
  };

  const needsPerson = type === 'FAMILY_TRANSFER' || type === 'BORROW_GIVEN' || type === 'BORROW_RECEIVED';

  const filteredPersons = needsPerson
    ? (type === 'FAMILY_TRANSFER' ? persons.filter(p => p.type === 'FAMILY') : persons)
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
        personId: needsPerson ? personId : undefined,
        note: note.trim() || undefined,
      });
      navigate('/');
    } catch (e: any) {
      const detail = [e?.message, JSON.stringify(e?.response?.data)].filter(Boolean).join(' | ');
      setError(detail || 'Failed to save. Try again.');
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

      {/* Note */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <label className="text-xs text-gray-400 uppercase tracking-wide">{NOTE_LABEL[type]}</label>
        <input
          type="text"
          placeholder={NOTE_PLACEHOLDER[type]}
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full text-base text-gray-800 mt-1 outline-none"
        />
      </div>

      {/* Type */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                type === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {typeLabels[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Category — only for EXPENSE */}
      {type === 'EXPENSE' && (
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {allCategories.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`p-3 rounded-xl text-sm font-medium border text-center transition-all ${
                  category === c.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}

            {/* Add custom category */}
            {showNewCat ? (
              <div className="col-span-3 flex gap-2 mt-1">
                <input
                  autoFocus
                  type="text"
                  placeholder="Category name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomCategory()}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                />
                <button onClick={handleAddCustomCategory} className="px-3 py-2 bg-gray-800 text-white rounded-xl text-sm">Add</button>
                <button onClick={() => { setShowNewCat(false); setNewCatName(''); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCat(true)}
                className="p-3 rounded-xl text-sm font-medium border text-center border-dashed border-gray-300 text-gray-400 bg-white"
              >
                + New
              </button>
            )}
          </div>
        </div>
      )}

      {/* Person */}
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
                    personId === String(p.id) ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
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
                paymentMethod === p ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'
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

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

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
