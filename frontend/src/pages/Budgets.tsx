import { useEffect, useState } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../api/budgets';
import type { Budget } from '../types';
import { formatAmount, currentMonth } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner, EmptyState, ConfirmModal } from '../components/ui';
import { AlertTriangle, Target, Trash2, X } from 'lucide-react';
import { IconBadge } from '../components/configIcons';

function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function barColor(pct: number) {
  if (pct > 100) return 'bg-rose-500';
  if (pct > 80)  return 'bg-amber-400';
  return 'bg-emerald-400';
}
function pctColor(pct: number) {
  if (pct > 100) return 'text-rose-600';
  if (pct > 80)  return 'text-amber-600';
  return 'text-emerald-600';
}

export default function Budgets() {
  const { activeCategories, getCategoryLabel, getCategoryIcon } = useConfig();
  const [month,       setMonth]      = useState(currentMonth());
  const [budgets,     setBudgets]    = useState<Budget[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [editingId,   setEditingId]  = useState<string | null>(null);
  const [editLimit,   setEditLimit]  = useState('');
  const [adding,      setAdding]     = useState(false);
  const [newCategory, setNewCategory]= useState('');
  const [newLimit,    setNewLimit]   = useState('');
  const [addError,    setAddError]   = useState('');
  const [editError,    setEditError]   = useState('');
  const [confirmDelId, setConfirmDelId]= useState<string | null>(null);

  const canGoNext = month < currentMonth();

  const load = (m: string) => {
    setLoading(true);
    getBudgets(m).then(setBudgets).finally(() => setLoading(false));
  };

  useEffect(() => { load(month); }, [month]);

  const budgetedCats    = new Set(budgets.map(b => b.category));
  const availableCats   = activeCategories.filter(c => !budgetedCats.has(c.key));
  const overBudgetCount = budgets.filter(b => b.overBudget).length;

  async function handleAdd() {
    const val = Number(newLimit);
    if (!newCategory) { setAddError('Select a category'); return; }
    if (!newLimit || isNaN(val) || val <= 0) { setAddError('Enter a limit greater than 0'); return; }
    setAddError('');
    try {
      await createBudget({ category: newCategory, monthlyLimit: val, month });
      setAdding(false); setNewLimit(''); load(month);
    } catch { setAddError('Failed to save. Try again.'); }
  }

  async function handleUpdate(id: string) {
    const val = Number(editLimit);
    if (!editLimit || isNaN(val) || val <= 0) { setEditError('Enter a limit greater than 0'); return; }
    setEditError('');
    try {
      await updateBudget(id, val); setEditingId(null); load(month);
    } catch { setEditError('Failed to update. Try again.'); }
  }

  async function handleDelete(id: string) {
    try { await deleteBudget(id); load(month); }
    catch { alert('Failed to delete. Try again.'); }
  }

  const monthLabel = new Date(month + '-02').toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header with month nav */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold text-slate-900">Budgets</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonth(prevMonth(month))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-lg">‹</button>
            <span className="text-xs font-semibold text-slate-600 w-28 text-center">{monthLabel}</span>
            <button onClick={() => canGoNext && setMonth(nextMonth(month))}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-lg transition-colors ${canGoNext ? 'bg-slate-100 text-slate-600' : 'text-slate-200'}`}>›</button>
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="p-4 flex flex-col gap-4">
          {/* Alert if over budget */}
          {overBudgetCount > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="text-rose-500 shrink-0" size={22} strokeWidth={2} />
              <p className="text-sm font-semibold text-rose-600">
                {overBudgetCount} categor{overBudgetCount > 1 ? 'ies are' : 'y is'} over budget this month
              </p>
            </div>
          )}

          {budgets.length === 0 && !adding && (
            <EmptyState icon={<Target size={32} />} title="No budgets set" description="Set monthly limits to track your spending by category" />
          )}

          {/* Budget cards */}
          {budgets.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconBadge name={getCategoryIcon(b.category)} size={20} className="w-9 h-9 rounded-xl" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{getCategoryLabel(b.category)}</p>
                    {b.overBudget && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                        Over budget
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingId(b.id); setEditLimit(String(b.monthlyLimit)); setEditError(''); }}
                    className="text-xs font-semibold text-indigo-500 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-xl">
                    Edit
                  </button>
                  <button onClick={() => setConfirmDelId(b.id)}
                    className="text-rose-400 w-7 h-7 flex items-center justify-center border border-rose-100 bg-rose-50 rounded-xl">
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Edit inline */}
              {editingId === b.id && (
                <div className="mb-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 px-3 py-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">New Limit (₹)</p>
                      <input type="number" value={editLimit} autoFocus
                        onChange={e => setEditLimit(e.target.value)}
                        className="w-full text-base font-bold text-slate-900 outline-none bg-transparent" />
                    </div>
                    <button onClick={() => handleUpdate(b.id)}
                      className="px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl">Save</button>
                    <button onClick={() => { setEditingId(null); setEditError(''); }}
                      className="px-3 border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center"><X size={16} strokeWidth={2.5} /></button>
                  </div>
                  {editError && <p className="text-xs text-rose-500 font-medium">{editError}</p>}
                </div>
              )}

              {/* Progress */}
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500">{formatAmount(b.spent)} spent</span>
                <span className={`font-bold ${pctColor(b.percentUsed)}`}>
                  {b.percentUsed}% of {formatAmount(b.monthlyLimit)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor(b.percentUsed)}`}
                  style={{ width: `${Math.min(b.percentUsed, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {b.percentUsed <= 100
                  ? `${formatAmount(b.monthlyLimit - b.spent)} remaining`
                  : `${formatAmount(b.spent - b.monthlyLimit)} over limit`}
              </p>
            </div>
          ))}

          {/* Add budget */}
          {availableCats.length > 0 && (
            adding ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-slate-800">Set Budget</p>
                <div className="bg-slate-50 rounded-2xl border border-slate-100">
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 outline-none">
                    <option value="">Select category…</option>
                    {availableCats.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Monthly Limit (₹)</p>
                  <input type="number" inputMode="decimal" placeholder="0" value={newLimit}
                    onChange={e => setNewLimit(e.target.value)}
                    className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent" />
                </div>
                {addError && <p className="text-xs text-rose-500 font-medium">{addError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setAdding(false); setNewLimit(''); setAddError(''); }}
                    className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">
                    Cancel
                  </button>
                  <button onClick={handleAdd}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
                    Add Budget
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAdding(true); setNewCategory(availableCats[0]?.key ?? ''); }}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 bg-white">
                + Add budget for a category
              </button>
            )
          )}
        </div>
      )}
      {confirmDelId && (
        <ConfirmModal
          title="Remove Budget"
          message="This budget limit will be removed. Your transactions won't be affected."
          confirmLabel="Remove"
          onConfirm={() => { const id = confirmDelId; setConfirmDelId(null); handleDelete(id); }}
          onCancel={() => setConfirmDelId(null)}
        />
      )}
    </div>
  );
}
