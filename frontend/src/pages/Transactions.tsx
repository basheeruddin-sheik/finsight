import { useEffect, useState } from 'react';
import { getTransactions, updateTransaction, deleteTransaction } from '../api/transactions';
import { getPersons } from '../api/persons';
import type { Transaction, TransactionType, PaymentMethod, Person } from '../types';
import { formatAmount, formatDate, TYPE_LABELS, getCategoryLabel, PAYMENT_LABELS, TYPE_COLOR } from '../utils';
import { BUILTIN_CATEGORIES, getSettings } from '../settings';

const FILTERS: { label: string; value: TransactionType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Income', value: 'INCOME' },
  { label: 'Family', value: 'FAMILY_TRANSFER' },
  { label: 'Lent', value: 'BORROW_GIVEN' },
  { label: 'Returns', value: 'BORROW_RECEIVED' },
];

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'FAMILY_TRANSFER', 'BORROW_GIVEN', 'BORROW_RECEIVED'];
const PAYMENTS: PaymentMethod[] = ['GPAY', 'PHONEPE', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];

const NOTE_LABEL: Record<TransactionType, string> = {
  EXPENSE: 'What was this for?',
  INCOME: 'Source / description',
  FAMILY_TRANSFER: 'What was this for?',
  BORROW_GIVEN: 'Why did you lend this?',
  BORROW_RECEIVED: 'What did you borrow for?',
};

const PERSON_FILTER: Partial<Record<TransactionType, string>> = {
  FAMILY_TRANSFER: 'FAMILY',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // edit modal state
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editCategory, setEditCategory] = useState('FOOD_DINING');
  const [editPayment, setEditPayment] = useState<PaymentMethod>('GPAY');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editPersonId, setEditPersonId] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [allCategories, setAllCategories] = useState(BUILTIN_CATEGORIES);

  const load = (type?: TransactionType) => {
    setLoading(true);
    getTransactions(type ? { type } : undefined)
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getPersons().then(setPersons).catch(() => {});
    const s = getSettings();
    setAllCategories([
      ...BUILTIN_CATEGORIES,
      ...s.customCategories.map(c => ({ key: c, label: c })),
    ]);
  }, []);

  const handleFilter = (f: TransactionType | 'ALL') => {
    setFilter(f);
    setSelectedId(null);
    load(f === 'ALL' ? undefined : f);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      setSelectedId(null);
      load(filter === 'ALL' ? undefined : filter);
    } catch {
      alert('Failed to delete. Try again.');
    }
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setEditAmount(String(t.amount));
    setEditType(t.type);
    setEditCategory(t.category ?? 'FOOD_DINING');
    setEditPayment(t.paymentMethod);
    setEditDate(t.date.substring(0, 10));
    setEditNote(t.note ?? '');
    setEditPersonId(t.personId ? String(t.personId) : '');
    setEditError('');
    setSelectedId(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    const amt = Number(editAmount);
    if (!editAmount || isNaN(amt) || amt <= 0) { setEditError('Enter a valid amount'); return; }
    const needsPerson = editType === 'FAMILY_TRANSFER' || editType === 'BORROW_GIVEN' || editType === 'BORROW_RECEIVED';
    if (needsPerson && !editPersonId) { setEditError('Select a person'); return; }
    setSaving(true);
    setEditError('');
    try {
      await updateTransaction(editing.id, {
        type: editType,
        amount: amt,
        date: editDate,
        category: editType === 'EXPENSE' ? editCategory : undefined,
        paymentMethod: editPayment,
        personId: needsPerson ? Number(editPersonId) : undefined,
        note: editNote.trim() || undefined,
      });
      setEditing(null);
      load(filter === 'ALL' ? undefined : filter);
    } catch {
      setEditError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPersons = (type: TransactionType) => {
    const typeFilter = PERSON_FILTER[type];
    return typeFilter ? persons.filter(p => p.type === typeFilter) : persons;
  };

  const needsPerson = editType === 'FAMILY_TRANSFER' || editType === 'BORROW_GIVEN' || editType === 'BORROW_RECEIVED';

  return (
    <div className="flex flex-col pb-24">
      {/* Filter bar */}
      <div className="flex gap-2 p-4 overflow-x-auto sticky top-0 bg-gray-50 z-10">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all ${
              filter === f.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 text-sm py-12">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">No transactions found.</p>
      ) : (
        <div className="flex flex-col gap-2 px-4">
          {transactions.map(t => (
            <div key={t.id}>
              <div
                onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm border border-gray-100 cursor-pointer active:opacity-70"
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {t.note || (t.category ? getCategoryLabel(t.category) : TYPE_LABELS[t.type])}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(t.date)} · {t.category ? getCategoryLabel(t.category) : TYPE_LABELS[t.type]} · {PAYMENT_LABELS[t.paymentMethod]}
                  </span>
                </div>
                <span className={`text-base font-semibold ml-3 shrink-0 ${TYPE_COLOR[t.type]}`}>
                  {t.type === 'INCOME' || t.type === 'BORROW_RECEIVED' ? '+' : '-'}{formatAmount(t.amount)}
                </span>
              </div>

              {selectedId === t.id && (
                <div className="flex gap-2 mt-1 px-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="flex-1 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="flex-1 py-2 text-sm text-red-500 border border-red-200 rounded-xl bg-red-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Transaction</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 text-sm">✕</button>
            </div>

            {/* Amount */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Amount (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="w-full text-3xl font-bold text-gray-800 mt-1 outline-none bg-transparent"
              />
            </div>

            {/* Note */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <label className="text-xs text-gray-400 uppercase tracking-wide">{NOTE_LABEL[editType]}</label>
              <input
                type="text"
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                className="w-full text-base text-gray-800 mt-1 outline-none bg-transparent"
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(t => (
                  <button key={t} onClick={() => { setEditType(t); setEditPersonId(''); }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${editType === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            {editType === 'EXPENSE' && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {allCategories.map(c => (
                    <button key={c.key} onClick={() => setEditCategory(c.key)}
                      className={`p-2 rounded-xl text-sm font-medium border text-center transition-all ${editCategory === c.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Person */}
            {needsPerson && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                  {editType === 'FAMILY_TRANSFER' ? 'Family Member' : 'Person'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {filteredPersons(editType).map(p => (
                    <button key={p.id} onClick={() => setEditPersonId(String(p.id))}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${editPersonId === String(p.id) ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {p.name}
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
                  <button key={p} onClick={() => setEditPayment(p)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${editPayment === p ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {PAYMENT_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full text-base text-gray-800 mt-1 outline-none bg-transparent"
              />
            </div>

            {editError && <p className="text-red-500 text-sm">{editError}</p>}

            <div className="flex gap-2 pb-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
