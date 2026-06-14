import { useEffect, useState } from 'react';
import { getPersons, createPerson, archivePerson } from '../api/persons';
import type { Person } from '../types';
import { Spinner, EmptyState, BottomSheet, ConfirmModal } from '../components/ui';
import { Users, User } from 'lucide-react';

export default function Persons() {
  const [persons,  setPersons]  = useState<Person[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [form,        setForm]        = useState({ name: '', type: 'FRIEND', phone: '' });
  const [addError,    setAddError]    = useState('');
  const [confirmDel,  setConfirmDel]  = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try { const p = await getPersons(); setPersons(p); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { setAddError('Name is required'); return; }
    setAddError('');
    try {
      await createPerson({ name: form.name.trim(), type: form.type, phone: form.phone.trim() || undefined });
      setShowAdd(false); setForm({ name: '', type: 'FRIEND', phone: '' }); load();
    } catch { setAddError('Failed to save. Try again.'); }
  };

  const handleArchive = async (id: string) => {
    try { await archivePerson(id); load(); }
    catch (e: any) { alert(e.response?.data?.message ?? 'Failed to archive.'); }
  };

  const friends = persons.filter(p => p.type === 'FRIEND');
  const family  = persons.filter(p => p.type === 'FAMILY');

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="text-base font-semibold text-slate-900">Manage People</h1>
      </div>

      {loading ? <Spinner /> : persons.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No people added" description="Add friends and family to track transfers and borrows"
          action={
            <button onClick={() => setShowAdd(true)}
              className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
              Add Person
            </button>
          }
        />
      ) : (
        <div className="p-4 flex flex-col gap-5">
          {[{ label: 'Friends', list: friends }, { label: 'Family', list: family }].map(({ label, list }) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {label} · {list.length}
              </p>
              {list.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-6 text-center">
                  <p className="text-sm text-slate-400">No {label.toLowerCase()} added yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {list.map((p, i) => (
                    <div key={p.id}>
                      {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                          {p.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                          {p.phone && <p className="text-xs text-slate-400 mt-0.5">{p.phone}</p>}
                        </div>
                        <button onClick={() => setConfirmDel({ id: p.id, name: p.name })}
                          className="text-xs font-semibold text-amber-500 border border-amber-100 bg-amber-50 px-3 py-1.5 rounded-xl">
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-24 z-20 pointer-events-none">
        <div className="max-w-md mx-auto relative">
          <button onClick={() => setShowAdd(true)}
            className="pointer-events-auto absolute right-4 bottom-0 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl">
            +
          </button>
        </div>
      </div>

      {showAdd && (
        <BottomSheet title="Add Person" onClose={() => { setShowAdd(false); setAddError(''); }}>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Name</p>
            <input type="text" placeholder="Full name" value={form.name} autoFocus
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Type</p>
            <div className="flex gap-2">
              {[{ key: 'FRIEND', label: 'Friend', Icon: User }, { key: 'FAMILY', label: 'Family', Icon: Users }].map(t => (
                <button key={t.key} onClick={() => setForm({ ...form, type: t.key })}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${form.type === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  <t.Icon size={16} strokeWidth={2} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Phone (optional)</p>
            <input type="tel" placeholder="+91 98765 43210" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          {addError && <p className="text-sm text-rose-500 font-medium">{addError}</p>}

          <div className="flex gap-3 pb-2">
            <button onClick={() => { setShowAdd(false); setAddError(''); }}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleAdd}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">Save</button>
          </div>
        </BottomSheet>
      )}

      {confirmDel && (
        <ConfirmModal
          title={`Archive "${confirmDel.name}"?`}
          message="They'll be hidden from your lists. Transactions and borrows stay intact, and you can reactivate them from Settings → People."
          confirmLabel="Archive"
          variant="confirm"
          onConfirm={() => { const { id } = confirmDel; setConfirmDel(null); handleArchive(id); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
