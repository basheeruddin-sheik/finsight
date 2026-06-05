import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransactionType } from '../types';
import { BUILTIN_CATEGORIES, DEFAULT_TYPE_LABELS, getSettings, saveSettings } from '../settings';

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'FAMILY_TRANSFER', 'BORROW_GIVEN', 'BORROW_RECEIVED'];

export default function Settings() {
  const navigate = useNavigate();
  const s = getSettings();

  const [typeLabels, setTypeLabels] = useState<Record<TransactionType, string>>(s.typeLabels);
  const [customCategories, setCustomCategories] = useState<string[]>(s.customCategories);
  const [newCat, setNewCat] = useState('');
  const [saved, setSaved] = useState(false);

  const handleTypeLabel = (type: TransactionType, val: string) => {
    setTypeLabels(prev => ({ ...prev, [type]: val }));
    setSaved(false);
  };

  const handleAddCat = () => {
    const name = newCat.trim();
    if (!name || customCategories.includes(name)) return;
    setCustomCategories(prev => [...prev, name]);
    setNewCat('');
    setSaved(false);
  };

  const handleDeleteCat = (cat: string) => {
    setCustomCategories(prev => prev.filter(c => c !== cat));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings({ typeLabels, customCategories });
    setSaved(true);
  };

  const handleReset = () => {
    const reset = { typeLabels: { ...DEFAULT_TYPE_LABELS }, customCategories: [] };
    saveSettings(reset);
    setTypeLabels(reset.typeLabels);
    setCustomCategories([]);
    setSaved(true);
  };

  return (
    <div className="flex flex-col pb-24">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-lg font-semibold text-gray-800">Customize</h1>
      </div>

      <div className="p-4 flex flex-col gap-6">

        {/* Transaction Type Labels */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Transaction Type Names</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {TYPES.map((t, i) => (
              <div key={t} className={`flex items-center gap-3 px-4 py-3 ${i < TYPES.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="text-xs text-gray-400 w-28 shrink-0">{DEFAULT_TYPE_LABELS[t]}</span>
                <input
                  type="text"
                  value={typeLabels[t]}
                  onChange={e => handleTypeLabel(t, e.target.value)}
                  className="flex-1 text-sm text-gray-800 outline-none border-b border-transparent focus:border-gray-300"
                  placeholder={DEFAULT_TYPE_LABELS[t]}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 px-1">Left = original name, right = your custom name</p>
        </div>

        {/* Custom Categories */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Custom Categories</p>

          {/* Built-in (read only) */}
          <div className="flex flex-wrap gap-2 mb-3">
            {BUILTIN_CATEGORIES.map(c => (
              <span key={c.key} className="px-3 py-1.5 rounded-xl text-sm bg-gray-100 text-gray-500 border border-gray-200">
                {c.label}
              </span>
            ))}
          </div>

          {/* Custom ones — deletable */}
          {customCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {customCategories.map(c => (
                <div key={c} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm bg-blue-50 border border-blue-200 text-blue-700">
                  <span>{c}</span>
                  <button onClick={() => handleDeleteCat(c)} className="text-blue-400 ml-1 leading-none">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category name (e.g. EMI, Rent)"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCat()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={handleAddCat}
              disabled={!newCat.trim()}
              className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save / Reset */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-sm font-semibold"
          >
            {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
