import { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction } from '../api/transactions';
import type { Transaction, TransactionType } from '../types';
import { formatAmount, formatDate, TYPE_LABELS, CATEGORY_LABELS, PAYMENT_LABELS, TYPE_COLOR } from '../utils';

const FILTERS: { label: string; value: TransactionType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Income', value: 'INCOME' },
  { label: 'Family', value: 'FAMILY_TRANSFER' },
  { label: 'Borrow', value: 'BORROW_GIVEN' },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = (type?: TransactionType) => {
    setLoading(true);
    getTransactions(type ? { type } : undefined)
      .then(setTransactions)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (f: TransactionType | 'ALL') => {
    setFilter(f);
    setSelectedId(null);
    load(f === 'ALL' ? undefined : f);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(id);
    setSelectedId(null);
    load(filter === 'ALL' ? undefined : filter);
  };

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
                    {t.category ? CATEGORY_LABELS[t.category] : TYPE_LABELS[t.type]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(t.date)} · {PAYMENT_LABELS[t.paymentMethod]}
                    {t.note ? ` · ${t.note}` : ''}
                  </span>
                </div>
                <span className={`text-base font-semibold ml-3 shrink-0 ${TYPE_COLOR[t.type]}`}>
                  {t.type === 'INCOME' || t.type === 'BORROW_RECEIVED' ? '+' : '-'}{formatAmount(t.amount)}
                </span>
              </div>

              {/* Inline actions on tap */}
              {selectedId === t.id && (
                <div className="flex gap-2 mt-1 px-1">
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
    </div>
  );
}
