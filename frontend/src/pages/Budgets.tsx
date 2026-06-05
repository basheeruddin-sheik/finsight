import { useEffect, useState } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../api/budgets';
import type { Budget } from '../types';
import { formatAmount, currentMonth, CATEGORY_LABELS } from '../utils';
import type { Category } from '../types';

const ALL_CATEGORIES: Category[] = [
  'FOOD_DINING', 'GROCERIES', 'SHOPPING', 'FUEL_TRAVEL',
  'SUBSCRIPTIONS', 'MEDICAL', 'ENTERTAINMENT', 'UTILITIES', 'OTHER',
];

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
  if (pct > 100) return 'bg-red-500';
  if (pct > 80) return 'bg-yellow-400';
  return 'bg-emerald-400';
}

function textColor(pct: number) {
  if (pct > 100) return 'text-red-600';
  if (pct > 80) return 'text-yellow-600';
  return 'text-emerald-600';
}

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<Category>('FOOD_DINING');
  const [newLimit, setNewLimit] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');

  const canGoNext = month < currentMonth();

  const load = (m: string) => {
    setLoading(true);
    getBudgets(m).then(setBudgets).finally(() => setLoading(false));
  };

  useEffect(() => { load(month); }, [month]);

  const budgetedCategories = new Set(budgets.map(b => b.category));
  const availableCategories = ALL_CATEGORIES.filter(c => !budgetedCategories.has(c));

  async function handleAdd() {
    const val = Number(newLimit);
    if (!newLimit || isNaN(val) || val <= 0) { setAddError('Enter a limit greater than 0'); return; }
    setAddError('');
    try {
      await createBudget({ category: newCategory, monthlyLimit: val, month });
      setAdding(false);
      setNewLimit('');
      load(month);
    } catch {
      setAddError('Failed to save. Try again.');
    }
  }

  async function handleUpdate(id: number) {
    const val = Number(editLimit);
    if (!editLimit || isNaN(val) || val <= 0) { setEditError('Enter a limit greater than 0'); return; }
    setEditError('');
    try {
      await updateBudget(id, val);
      setEditingId(null);
      load(month);
    } catch {
      setEditError('Failed to update. Try again.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this budget?')) return;
    try {
      await deleteBudget(id);
      load(month);
    } catch {
      alert('Failed to delete. Try again.');
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-700">Budgets</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(prevMonth(month))} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">‹</button>
          <span className="text-sm font-medium text-gray-700 w-24 text-center">
            {new Date(month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => canGoNext && setMonth(nextMonth(month))}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${canGoNext ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-300'}`}>›</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : (
        <>
          {budgets.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">No budgets set for this month.</p>
          )}

          <div className="flex flex-col gap-3">
            {budgets.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800">
                      {CATEGORY_LABELS[b.category as Category] ?? b.category}
                    </span>
                    {b.overBudget && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Over!</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(b.id); setEditLimit(String(b.monthlyLimit)); }}
                      className="text-xs text-blue-500">Edit</button>
                    <button onClick={() => handleDelete(b.id)} className="text-xs text-gray-400">✕</button>
                  </div>
                </div>

                {editingId === b.id ? (
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editLimit}
                        onChange={e => setEditLimit(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1"
                        placeholder="New limit"
                      />
                      <button onClick={() => handleUpdate(b.id)}
                        className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg">Save</button>
                      <button onClick={() => { setEditingId(null); setEditError(''); }}
                        className="text-gray-400 text-xs px-2">Cancel</button>
                    </div>
                    {editError && <p className="text-xs text-red-500">{editError}</p>}
                  </div>
                ) : null}

                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatAmount(b.spent)} spent</span>
                  <span className={`font-medium ${textColor(b.percentUsed)}`}>{b.percentUsed}% of {formatAmount(b.monthlyLimit)}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(b.percentUsed)}`}
                    style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add budget */}
          {availableCategories.length > 0 && (
            adding ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                <p className="text-sm font-medium text-gray-700">Add Budget</p>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as Category)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  placeholder="Monthly limit (₹)"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                {addError && <p className="text-xs text-red-500">{addError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleAdd} className="flex-1 bg-gray-900 text-white text-sm py-2 rounded-xl">Add</button>
                  <button onClick={() => { setAdding(false); setNewLimit(''); setAddError(''); }} className="text-gray-400 text-sm px-4">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAdding(true); setNewCategory(availableCategories[0]); }}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
              >
                + Add budget for a category
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
