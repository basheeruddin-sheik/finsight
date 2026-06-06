import { useEffect, useState } from 'react';
import { getSplits, setManualSplit, type SplitBalance } from '../api/splits';
import { getPersons } from '../api/persons';
import type { Person } from '../types';
import { formatAmount } from '../utils';
import { Spinner, EmptyState, BottomSheet } from '../components/ui';

export default function Splits() {
  const [splits,       setSplits]      = useState<SplitBalance[]>([]);
  const [friends,      setFriends]     = useState<Person[]>([]);
  const [editingId,    setEditingId]   = useState<string | null>(null);
  const [editAmount,   setEditAmount]  = useState('');
  const [showAddModal, setShowAddModal]= useState(false);
  const [newPersonId,  setNewPersonId] = useState('');
  const [newTotalPaid, setNewTotalPaid]= useState('');
  const [newMyShare,   setNewMyShare]  = useState('');
  const [loading,      setLoading]     = useState(true);
  const [saveError,    setSaveError]   = useState('');
  const [addError,     setAddError]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([getSplits(), getPersons('FRIEND')]);
      setSplits(s); setFriends(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalOwedToMe = splits.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
  const totalIOwe     = splits.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
  const net = totalOwedToMe - totalIOwe;

  const handleSave = async (personId: string) => {
    const val = parseFloat(editAmount);
    if (!editAmount || isNaN(val)) { setSaveError('Enter a valid number'); return; }
    setSaveError('');
    try {
      await setManualSplit(personId, val);
      setEditingId(null); setEditAmount(''); load();
    } catch { setSaveError('Failed to save. Try again.'); }
  };

  const toGetBack = () => {
    const paid = parseFloat(newTotalPaid), share = parseFloat(newMyShare);
    if (!isNaN(paid) && !isNaN(share)) return paid - share;
    return null;
  };

  const handleAdd = async () => {
    if (!newPersonId) { setAddError('Select a friend'); return; }
    const back = toGetBack();
    if (back === null) { setAddError('Enter valid amounts'); return; }
    setAddError('');
    try {
      await setManualSplit(newPersonId, back);
      setShowAddModal(false); setNewPersonId(''); setNewTotalPaid(''); setNewMyShare('');
      load();
    } catch { setAddError('Failed to save. Try again.'); }
  };

  const existingPersonIds = new Set(splits.map(s => s.personId));
  const availableFriends  = friends.filter(f => !existingPersonIds.has(f.id));

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-900">Friends & Splits</h1>
      </div>

      {/* Net summary card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: 'They owe you', value: formatAmount(totalOwedToMe), color: 'text-emerald-600' },
            { label: 'You owe',      value: formatAmount(totalIOwe),     color: 'text-rose-500'    },
            { label: 'Net',          value: `${net >= 0 ? '+' : ''}${formatAmount(net)}`, color: net >= 0 ? 'text-emerald-600' : 'text-rose-500' },
          ].map(c => (
            <div key={c.label} className="flex flex-col items-center py-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : splits.length === 0 ? (
        <EmptyState icon="🤝" title="No balances yet" description="Track what friends owe you from shared expenses"
          action={availableFriends.length > 0 ? (
            <button onClick={() => setShowAddModal(true)}
              className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold">
              Add Split
            </button>
          ) : undefined}
        />
      ) : (
        <div className="p-4 flex flex-col gap-2">
          {splits.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {editingId === s.id ? (
                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Positive = they owe you · Negative = you owe them</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Net Balance (₹)</p>
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                      placeholder="e.g. 500 or -300" autoFocus
                      className="w-full text-2xl font-bold text-slate-900 outline-none bg-transparent" />
                  </div>
                  {saveError && <p className="text-xs text-rose-500 font-medium">{saveError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(s.personId)}
                      className="flex-1 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl">Save</button>
                    <button onClick={() => { setEditingId(null); setSaveError(''); }}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-slate-50"
                  onClick={() => { setEditingId(s.id); setEditAmount(String(s.balance)); }}>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-600 shrink-0">
                    {s.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                    <p className={`text-xs font-medium mt-0.5 ${s.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {s.balance >= 0 ? 'Owes you' : 'You owe'}
                    </p>
                  </div>
                  <p className={`text-base font-bold ${s.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {s.balance >= 0 ? '+' : ''}{formatAmount(s.balance)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {availableFriends.length > 0 && (
        <button onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20">
          +
        </button>
      )}

      {showAddModal && (
        <BottomSheet title="Add Split" onClose={() => { setShowAddModal(false); setAddError(''); setNewTotalPaid(''); setNewMyShare(''); }}>
          <div className="bg-slate-50 rounded-2xl border border-slate-100">
            <select value={newPersonId} onChange={e => setNewPersonId(e.target.value)}
              className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 outline-none">
              <option value="">Select friend…</option>
              {availableFriends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total I paid</p>
              <input type="number" inputMode="decimal" placeholder="e.g. 1000" value={newTotalPaid}
                onChange={e => setNewTotalPaid(e.target.value)}
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent" />
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">My share</p>
              <input type="number" inputMode="decimal" placeholder="e.g. 400" value={newMyShare}
                onChange={e => setNewMyShare(e.target.value)}
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent" />
            </div>
          </div>

          {toGetBack() !== null && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-slate-500">To get back from {availableFriends.find(f => f.id === newPersonId)?.name ?? 'friend'}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatAmount(toGetBack()!)}</p>
            </div>
          )}

          {addError && <p className="text-sm text-rose-500 font-medium">{addError}</p>}

          <div className="flex gap-3 pb-2">
            <button onClick={() => { setShowAddModal(false); setAddError(''); setNewTotalPaid(''); setNewMyShare(''); }}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleAdd}
              className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold">Save</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
