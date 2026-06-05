import { useEffect, useState } from 'react';
import { getPersons, createPerson, deletePerson } from '../api/persons';
import type { Person } from '../types';
import FAB from '../components/FAB';

export default function Persons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'FRIEND', phone: '' });
  const [addError, setAddError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const p = await getPersons();
      setPersons(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { setAddError('Name is required'); return; }
    setAddError('');
    try {
      await createPerson({ name: form.name.trim(), type: form.type, phone: form.phone.trim() || undefined });
      setShowAdd(false);
      setForm({ name: '', type: 'FRIEND', phone: '' });
      load();
    } catch {
      setAddError('Failed to save. Try again.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}? This will fail if they have linked transactions or borrows.`)) return;
    try {
      await deletePerson(id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Cannot delete this person.');
    }
  };

  const friends = persons.filter(p => p.type === 'FRIEND');
  const family = persons.filter(p => p.type === 'FAMILY');

  return (
    <div className="flex flex-col pb-24 p-4 gap-6">
      {loading ? (
        <p className="text-center text-gray-400 py-8">Loading...</p>
      ) : (
        <>
          {[{ label: 'Friends', list: friends }, { label: 'Family', list: family }].map(({ label, list }) => (
            <div key={label}>
              <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</h2>
              {list.length === 0 ? (
                <p className="text-sm text-gray-400">None added yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {list.map(p => (
                    <div key={p.id} className="bg-white rounded-xl p-3 flex items-center justify-between border border-gray-100 shadow-sm">
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                      </div>
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="text-xs text-red-400 border border-red-100 px-3 py-1.5 rounded-lg">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <FAB onClick={() => setShowAdd(true)} />

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Add Person</h2>
            <input type="text" placeholder="Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" autoFocus />
            <div className="flex gap-2">
              {['FRIEND', 'FAMILY'].map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border ${form.type === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {t === 'FRIEND' ? 'Friend' : 'Family'}
                </button>
              ))}
            </div>
            <input type="tel" placeholder="Phone (optional)" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setAddError(''); }} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
