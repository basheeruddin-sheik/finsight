import { useEffect, useState } from 'react';
import { getTransactions, updateTransaction, deleteTransaction } from '../api/transactions';
import { getPersons } from '../api/persons';
import type { Transaction, TransactionType, PaymentMethod, Person } from '../types';
import { formatAmount, formatDate, PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner, EmptyState, BottomSheet, IconCircle, ConfirmModal } from '../components/ui';

const PAYMENTS: PaymentMethod[] = ['GPAY', 'PHONEPE', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];
const NOTE_LABEL: Record<string, string> = {
  EXPENSE: 'What was this for?',
  INCOME: 'Source / description',
  FAMILY_TRANSFER: 'What was this for?',
  BORROW_GIVEN: 'Why did you lend this?',
  BORROW_RECEIVED: 'What did you borrow for?',
};

export default function Transactions() {
  const { config, getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeColor, getTypeIcon, getBehavior } = useConfig();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter,        setFilter]       = useState<TransactionType | 'ALL'>('ALL');
  const [loading,       setLoading]      = useState(true);
  const [selectedId,    setSelectedId]   = useState<string | null>(null);

  const [editing,       setEditing]      = useState<Transaction | null>(null);
  const [editAmount,    setEditAmount]   = useState('');
  const [editType,      setEditType]     = useState('EXPENSE');
  const [editCategory,  setEditCategory] = useState('FOOD_DINING');
  const [editPayment,   setEditPayment]  = useState<PaymentMethod>('GPAY');
  const [editDate,      setEditDate]     = useState('');
  const [editNote,      setEditNote]     = useState('');
  const [editPersonId,  setEditPersonId] = useState('');
  const [editError,     setEditError]    = useState('');
  const [saving,        setSaving]       = useState(false);
  const [persons,       setPersons]      = useState<Person[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = (type?: TransactionType) => {
    setLoading(true);
    getTransactions(type ? { type } : undefined)
      .then(setTransactions).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getPersons().then(setPersons).catch(() => {});
  }, []);

  const handleFilter = (f: TransactionType | 'ALL') => {
    setFilter(f); setSelectedId(null);
    load(f === 'ALL' ? undefined : f);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setSelectedId(null);
      load(filter === 'ALL' ? undefined : filter);
    } catch { alert('Failed to delete. Try again.'); }
  };

  const openEdit = (t: Transaction) => {
    setEditing(t); setEditAmount(String(t.amount)); setEditType(t.type);
    setEditCategory(t.category ?? 'FOOD_DINING'); setEditPayment(t.paymentMethod);
    setEditDate(t.date.substring(0, 10)); setEditNote(t.note ?? '');
    setEditPersonId(t.personId ?? ''); setEditError(''); setSelectedId(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    const amt = Number(editAmount);
    if (!editAmount || isNaN(amt) || amt <= 0) { setEditError('Enter a valid amount'); return; }
    const _editTypeConf = config.types.find(t => t.key === editType);
    const _needsPerson  = _editTypeConf?.requiresPerson ?? false;
    const _showCats     = _editTypeConf?.hasCategories  ?? false;
    if (_needsPerson && !editPersonId) { setEditError('Select a person'); return; }
    setSaving(true); setEditError('');
    try {
      await updateTransaction(editing.id, {
        type: editType as any, amount: amt, date: editDate,
        category: _showCats ? editCategory : undefined,
        paymentMethod: editPayment,
        personId: _needsPerson ? editPersonId : undefined,
        note: editNote.trim() || undefined,
      });
      setEditing(null);
      load(filter === 'ALL' ? undefined : filter);
    } catch { setEditError('Failed to save. Try again.'); }
    finally { setSaving(false); }
  };

  const filters = [
    { label: 'All', value: 'ALL' as const },
    ...config.types.map(t => ({ label: t.label, value: t.key as TransactionType | 'ALL' })),
  ];

  const editTypeConf    = config.types.find(t => t.key === editType);
  const needsPerson     = editTypeConf?.requiresPerson ?? false;
  const editShowCats    = editTypeConf?.hasCategories  ?? false;
  const filteredPersons = editTypeConf?.personType === 'FAMILY' ? persons.filter(p => p.type === 'FAMILY') : persons;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900">Transactions</h1>
        </div>
        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {filters.map(f => (
            <button key={f.value} onClick={() => handleFilter(f.value as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${
                filter === f.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : transactions.length === 0 ? (
        <EmptyState icon="💳" title="No transactions" description="Add your first transaction to get started" />
      ) : (
        <div className="p-4 flex flex-col gap-2">
          {transactions.map(t => {
            const behavior   = getBehavior(t.type);
            const isPositive = behavior === 'INCOME' || behavior === 'RECEIVE_BACK';
            const icon = t.category ? getCategoryIcon(t.category) : getTypeIcon(t.type);
            const label = t.note || (t.category ? getCategoryLabel(t.category) : getTypeLabel(t.type));
            const sub = `${formatDate(t.date)} · ${t.category ? getCategoryLabel(t.category) : getTypeLabel(t.type)} · ${PAYMENT_LABELS[t.paymentMethod]}`;

            return (
              <div key={t.id}>
                <div
                  onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer active:opacity-70"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <IconCircle icon={icon} color="bg-slate-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${getTypeColor(t.type)}`}>
                      {isPositive ? '+' : '-'}{formatAmount(t.amount)}
                    </p>
                  </div>
                </div>

                {selectedId === t.id && (
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => openEdit(t)}
                      className="flex-1 py-2.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-xl bg-indigo-50">
                      ✏️ Edit
                    </button>
                    <button onClick={() => setConfirmDelete(t.id)}
                      className="flex-1 py-2.5 text-xs font-semibold text-rose-500 border border-rose-200 rounded-xl bg-rose-50">
                      🗑 Delete
                    </button>
                    <button onClick={() => setSelectedId(null)}
                      className="flex-1 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-xl bg-white">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <BottomSheet title="Edit Transaction" onClose={() => setEditing(null)}>
          {/* Amount */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</p>
            <input type="number" inputMode="decimal" value={editAmount}
              onChange={e => setEditAmount(e.target.value)}
              className="w-full text-3xl font-bold text-slate-900 outline-none bg-transparent" />
          </div>

          {/* Note */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{NOTE_LABEL[editType] ?? 'Description'}</p>
            <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          {/* Type */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Type</p>
            <div className="flex flex-wrap gap-2">
              {config.types.map(t => (
                <button key={t.key} onClick={() => { setEditType(t.key); setEditPersonId(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${editType === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {editShowCats && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Category</p>
              <div className="grid grid-cols-3 gap-2">
                {config.categories.map(c => (
                  <button key={c.key} onClick={() => setEditCategory(c.key)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${editCategory === c.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-xs font-semibold">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Person */}
          {needsPerson && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                {editTypeConf?.personType === 'FAMILY' ? 'Family Member' : 'Person'}
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredPersons.map(p => (
                  <button key={p.id} onClick={() => setEditPersonId(p.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${editPersonId === p.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENTS.map(p => (
                <button key={p} onClick={() => setEditPayment(p)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${editPayment === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {PAYMENT_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date</p>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          {editError && <p className="text-sm text-rose-500 font-medium">{editError}</p>}

          <div className="flex gap-3 pb-2">
            <button onClick={() => setEditing(null)}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </BottomSheet>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Transaction"
          message="This transaction will be permanently removed and cannot be recovered."
          confirmLabel="Delete"
          onConfirm={() => { const id = confirmDelete; setConfirmDelete(null); handleDelete(id); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
