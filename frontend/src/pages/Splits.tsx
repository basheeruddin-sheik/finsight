import { useEffect, useState } from 'react';
import { getSplits, setManualSplit, syncSplitwise, type SplitBalance } from '../api/splits';
import { getPersons } from '../api/persons';
import type { Person } from '../types';
import { formatAmount } from '../utils';
import FAB from '../components/FAB';

function fmtSyncTime(ts: string | null) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Splits() {
  const [splits, setSplits] = useState<SplitBalance[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonId, setNewPersonId] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [addError, setAddError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([getSplits(), getPersons('FRIEND')]);
      setSplits(s);
      setFriends(p);
    } catch {
      // stop spinner; show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalOwedToMe = splits.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
  const totalIOwe = splits.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
  const net = totalOwedToMe - totalIOwe;

  const handleSave = async (personId: number) => {
    const val = parseFloat(editAmount);
    if (!editAmount || isNaN(val)) { setSaveError('Enter a valid number'); return; }
    setSaveError('');
    try {
      await setManualSplit(personId, val);
      setEditingId(null);
      setEditAmount('');
      load();
    } catch {
      setSaveError('Failed to save. Try again.');
    }
  };

  const handleAdd = async () => {
    if (!newPersonId) { setAddError('Select a friend'); return; }
    const val = parseFloat(newBalance);
    if (!newBalance || isNaN(val)) { setAddError('Enter a valid balance'); return; }
    setAddError('');
    try {
      await setManualSplit(+newPersonId, val);
      setShowAddModal(false);
      setNewPersonId('');
      setNewBalance('');
      load();
    } catch {
      setAddError('Failed to save. Try again.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await syncSplitwise();
      setSyncMsg(`Synced ${result.synced} of ${result.total} friends`);
      load();
    } catch {
      setSyncMsg('Sync failed — check API key');
    } finally {
      setSyncing(false);
    }
  };

  const existingPersonIds = new Set(splits.map(s => s.personId));
  const availableFriends = friends.filter(f => !existingPersonIds.has(f.id));

  return (
    <div className="flex flex-col pb-24">
      {/* Totals */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-white border-b border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-400">They owe you</p>
          <p className="text-sm font-bold text-green-600">{formatAmount(totalOwedToMe)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">You owe</p>
          <p className="text-sm font-bold text-red-500">{formatAmount(totalIOwe)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Net</p>
          <p className={`text-sm font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {net >= 0 ? '+' : ''}{formatAmount(net)}
          </p>
        </div>
      </div>

      {/* Sync row */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-400">
          {syncMsg ?? 'Sync balances from Splitwise'}
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync Splitwise'}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-2">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : splits.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No balances yet. Add one.</p>
        ) : (
          splits.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              {editingId === s.id ? (
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 mb-1">{s.name}</p>
                    <p className="text-xs text-gray-400">+ = they owe you, - = you owe them</p>
                    {saveError && <p className="text-xs text-red-500 mt-0.5">{saveError}</p>}
                    <input
                      type="number"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      placeholder="e.g. 500 or -300"
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleSave(s.personId)} className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg">Save</button>
                    <button onClick={() => { setEditingId(null); setSaveError(''); }} className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => { setEditingId(s.id); setEditAmount(String(s.balance)); }}
                >
                  <div>
                    <p className="font-medium text-gray-800">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.source === 'SPLITWISE' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {s.source}
                      </span>
                      {s.lastSyncedAt && (
                        <span className="text-[10px] text-gray-400">{fmtSyncTime(s.lastSyncedAt)}</span>
                      )}
                    </div>
                  </div>
                  <p className={`text-base font-bold ${s.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {s.balance >= 0 ? '+' : ''}{formatAmount(s.balance)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {availableFriends.length > 0 && (
        <FAB onClick={() => setShowAddModal(true)} />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Add Balance</h2>
            <select
              value={newPersonId}
              onChange={e => setNewPersonId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm"
            >
              <option value="">Select friend...</option>
              {availableFriends.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input
              type="number"
              placeholder="Balance (+ they owe you, - you owe them)"
              value={newBalance}
              onChange={e => setNewBalance(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm"
            />
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowAddModal(false); setAddError(''); }} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
