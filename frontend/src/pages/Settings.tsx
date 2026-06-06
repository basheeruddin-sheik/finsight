import { useState, useEffect } from 'react';
import { updateType, updateCategory, addCategory, deleteCategory, addType, deleteType } from '../api/config';
import { getPersons, createPerson, updatePerson, deletePerson } from '../api/persons';
import { useConfig } from '../context/ConfigContext';
import type { Behavior, TypeConfig, CategoryConfig, Person } from '../types';
import { ConfirmModal } from '../components/ui';

// ── Constants ─────────────────────────────────────────────────────────────────

const BEHAVIORS: { key: Behavior; label: string; badge: string }[] = [
  { key: 'INCOME',       label: 'Income',       badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'EXPENSE',      label: 'Expense',      badge: 'bg-rose-100 text-rose-600 border-rose-200'          },
  { key: 'TRANSFER',     label: 'Transfer',     badge: 'bg-blue-100 text-blue-700 border-blue-200'          },
  { key: 'LEND',         label: 'Lend',         badge: 'bg-amber-100 text-amber-700 border-amber-200'       },
  { key: 'RECEIVE_BACK', label: 'Receive Back', badge: 'bg-violet-100 text-violet-700 border-violet-200'    },
];

const ICON_GROUPS = [
  { label: 'Finance',       icons: ['💰','💸','💵','💴','💹','📈','📉','🏦','💳','🪙','💎','🧾','🏧','📊'] },
  { label: 'Food & Drinks', icons: ['🍜','🍕','🍔','🥗','🍱','☕','🍷','🥤','🍚','🌮','🥘','🍣','🍗','🧁'] },
  { label: 'Shopping',      icons: ['🛍️','👗','👟','💻','📱','⌚','📷','🎒','👜','🛒','🧴','👒','🕶️','🎽'] },
  { label: 'Transport',     icons: ['🚗','⛽','🚌','✈️','🛵','🚂','🚢','🏍️','🚕','🛺','🚲','⚓','🚁','🛸'] },
  { label: 'Health',        icons: ['💊','🏥','🧴','💪','🦷','🩺','🏋️','🧘','🩹','🧬','🌡️','❤️','🫀','🧠'] },
  { label: 'Home & Bills',  icons: ['🏠','💡','🔧','🛋️','🛁','🪴','🏗️','🪣','🔌','📦','🧹','🛏️','🚿','🪞'] },
  { label: 'Entertainment', icons: ['🎬','🎮','🎵','🎭','📺','🎯','🎪','🎲','🎸','🏟️','🎰','🎠','🎡','🎢'] },
  { label: 'Education',     icons: ['📚','🎓','✏️','📝','🖥️','🔬','🧪','📐','🖊️','📖','🗂️','📓','🏫','📡'] },
  { label: 'Work',          icons: ['💼','📋','📌','🖨️','📎','🗃️','🏢','🤝','📧','🗓️','🖱️','⌨️','📟','📠'] },
  { label: 'Personal',      icons: ['🎁','💈','🐾','🌿','🌍','🧸','🌸','✨','🌟','⚙️','🎈','🪄','🧿','🪬'] },
  { label: 'People',        icons: ['👤','👥','👨‍👩‍👦','🤝','📥','📤','👶','👴','👩‍⚕️','👨‍💼','🧑‍🎓','👩‍🍳','🧑‍🔧','🧑‍🎨'] },
];

function getBadge(b: string) { return BEHAVIORS.find(x => x.key === b)?.badge ?? 'bg-slate-100 text-slate-500 border-slate-200'; }
function getBehaviorLabel(b: string) { return BEHAVIORS.find(x => x.key === b)?.label ?? b; }

// ── Icon picker ───────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 active:opacity-70">
        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">{value}</span>
        <span className="flex-1 text-left text-sm text-slate-600">{open ? 'Choose icon' : 'Change icon'}</span>
        <span className={`text-slate-400 text-[9px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="mt-2 bg-slate-50 rounded-xl border border-slate-100 p-2.5 flex flex-col gap-2.5">
          {ICON_GROUPS.map(g => (
            <div key={g.label}>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-0.5">{g.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {g.icons.map(icon => (
                  <button key={icon} type="button" onClick={() => { onChange(icon); setOpen(false); }}
                    className={`h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                      value === icon ? 'bg-indigo-500' : 'bg-white active:bg-slate-200'
                    }`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
// The scroll area uses calc() to set its own max-height so the sheet
// naturally shrinks to fit short content — no flex-1 growing to max-h.

const SHEET_CHROME = 50; // handle(14) + header(36)

function Sheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl overflow-hidden">
        <div className="flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-8 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose}
            className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold active:bg-slate-200">
            ✕
          </button>
        </div>
        {/* calc() caps the scroll area; short content = small sheet */}
        <div
          className="overflow-y-auto px-4 pt-3 pb-5 flex flex-col gap-2.5"
          style={{ maxHeight: `calc(60dvh - ${SHEET_CHROME}px)` }}
        >
          {children}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  );
}

// ── Grouped card + row (iOS-Settings style) ───────────────────────────────────
// All fields share a single rounded card; hairline dividers between rows.
// Removes double borders and halves wasted vertical space vs individual cards.

function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
      {children}
    </div>
  );
}

function GroupRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3.5 py-2.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      {children}
    </div>
  );
}

function InlineInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-sm font-medium text-slate-800 outline-none bg-transparent placeholder:font-normal placeholder:text-slate-300" />
  );
}

function CompactSegment({ options, value, onChange }: {
  options: { v: string; l: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            value === o.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      {/* w-10(40px) h-6(24px), thumb w-4 h-4(16px), 4px inset → travel = 40-16-4-4 = 16px = translate-x-4 */}
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full cursor-pointer shrink-0 transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function SaveBtn({ label, saving, disabled, onClick }: {
  label: string; saving?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || saving}
      className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80">
      {saving ? 'Saving…' : label}
    </button>
  );
}

// ── Person sheet ──────────────────────────────────────────────────────────────

function PersonSheet({ person, onClose, onSaved }: {
  person?: Person; onClose: () => void;
  onSaved: (d: { name: string; type: string; phone: string }) => Promise<void>;
}) {
  const [name,   setName]   = useState(person?.name  ?? '');
  const [type,   setType]   = useState(person?.type  ?? 'FRIEND');
  const [phone,  setPhone]  = useState(person?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSaved({ name: name.trim(), type, phone: phone.trim() });
    setSaving(false);
    onClose();
  };

  return (
    <Sheet title={person ? 'Edit Person' : 'New Person'} onClose={onClose}>
      <GroupCard>
        <GroupRow label="Name">
          <InlineInput value={name} onChange={setName} placeholder="Full name" />
        </GroupRow>
        <GroupRow label="Type">
          <CompactSegment
            options={[{ v: 'FRIEND', l: '👤 Friend' }, { v: 'FAMILY', l: '👨‍👩‍👦 Family' }]}
            value={type} onChange={setType}
          />
        </GroupRow>
        <GroupRow label="Phone (optional)">
          <InlineInput value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" />
        </GroupRow>
      </GroupCard>
      <SaveBtn label={person ? 'Save Changes' : 'Add Person'} saving={saving} disabled={!name.trim()} onClick={save} />
    </Sheet>
  );
}

// ── Section (label + content block, no overflow-hidden wrapper) ───────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">{label}</p>
      {children}
    </div>
  );
}

// ── Type sheet ────────────────────────────────────────────────────────────────

function TypeSheet({ type, onClose, onSaved }: {
  type?: TypeConfig; onClose: () => void;
  onSaved: (d: { key?: string; label: string; icon: string; behavior: string; hasCategories: boolean; requiresPerson: boolean; personType: string }) => Promise<void>;
}) {
  const [label,         setLabel]         = useState(type?.label         ?? '');
  const [icon,          setIcon]          = useState(type?.icon          ?? '💸');
  const [behavior,      setBehavior]      = useState<Behavior>(type?.behavior ?? 'EXPENSE');
  const [hasCategories, setHasCategories] = useState(type?.hasCategories ?? false);
  const [reqPerson,     setReqPerson]     = useState(type?.requiresPerson ?? false);
  const [personType,    setPersonType]    = useState(type?.personType    ?? 'ANY');
  const [saving,        setSaving]        = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    const key = type?.key ?? label.toUpperCase().replace(/\s+/g, '_');
    await onSaved({ key, label: label.trim(), icon, behavior, hasCategories, requiresPerson: reqPerson, personType });
    setSaving(false);
    onClose();
  };

  return (
    <Sheet title={type ? 'Edit Type' : 'New Transaction Type'} onClose={onClose}>

      {/* Icon — standalone so overflow-hidden on GroupCard never clips the picker */}
      <Section label="Icon">
        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </Section>

      {/* Display Name */}
      <Section label="Display Name">
        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
          <InlineInput value={label} onChange={setLabel} placeholder={type ? '' : 'e.g. Salary, Rent'} />
        </div>
      </Section>

      {/* Behavior */}
      <Section label="Behavior">
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {BEHAVIORS.map(b => (
            <button key={b.key} type="button" onClick={() => setBehavior(b.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors ${behavior === b.key ? 'bg-indigo-50' : 'active:bg-slate-50'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                behavior === b.key ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
              }`}>
                {behavior === b.key && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>
              <span className="flex-1 text-left text-sm font-medium text-slate-800">{b.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.badge}`}>{b.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Options */}
      <Section label="Options">
        <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <Toggle label="Show category picker" desc="For expense-like types" checked={hasCategories} onChange={setHasCategories} />
          <Toggle label="Requires a person" checked={reqPerson} onChange={setReqPerson} />
          {reqPerson && (
            <div className="px-3.5 py-2">
              <CompactSegment
                options={[{ v: 'ANY', l: '👥 Any person' }, { v: 'FAMILY', l: '👨‍👩‍👦 Family only' }]}
                value={personType} onChange={setPersonType}
              />
            </div>
          )}
        </div>
      </Section>

      <SaveBtn label={type ? 'Save Changes' : 'Add Type'} saving={saving} disabled={!label.trim()} onClick={save} />
    </Sheet>
  );
}

// ── Category sheet ────────────────────────────────────────────────────────────

function CategorySheet({ cat, onClose, onSaved }: {
  cat?: CategoryConfig; onClose: () => void;
  onSaved: (d: { key?: string; label: string; icon: string }) => Promise<void>;
}) {
  const [label,  setLabel]  = useState(cat?.label ?? '');
  const [icon,   setIcon]   = useState(cat?.icon  ?? '📌');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    const key = cat?.key ?? label.toUpperCase().replace(/\s+/g, '_');
    await onSaved({ key, label: label.trim(), icon });
    setSaving(false);
    onClose();
  };

  return (
    <Sheet title={cat ? 'Edit Category' : 'New Category'} onClose={onClose}>
      <Section label="Icon">
        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </Section>
      <Section label="Name">
        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
          <InlineInput value={label} onChange={setLabel} placeholder={cat ? '' : 'e.g. EMI, Rent, Insurance'} />
        </div>
      </Section>
      <SaveBtn label={cat ? 'Save Changes' : 'Add Category'} saving={saving} disabled={!label.trim()} onClick={save} />
    </Sheet>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, hint, onAdd }: { label: string; hint?: string; onAdd: () => void }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <button onClick={onAdd}
          className="text-xs font-semibold text-indigo-600 px-3 py-1 bg-indigo-50 rounded-xl border border-indigo-100 active:opacity-70">
          + Add
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400 px-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

// ── List row ─────────────────────────────────────────────────────────────────

function ListRow({ icon, title, subtitle, badge, badgeStyle, onEdit, onDelete }: {
  icon: React.ReactNode; title: string; subtitle?: React.ReactNode;
  badge?: string; badgeStyle?: string;
  onEdit: () => void; onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 overflow-hidden">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
        {subtitle && <div className="mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {badge && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle}`}>{badge}</span>}
        <button onClick={onEdit}
          className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        {onDelete ? (
          <button onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 active:bg-rose-100">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ActiveSheet =
  | { kind: 'addPerson' }
  | { kind: 'editPerson'; person: Person }
  | { kind: 'addType' }
  | { kind: 'editType'; type: TypeConfig }
  | { kind: 'addCat' }
  | { kind: 'editCat'; cat: CategoryConfig };

type Confirm = { title: string; message: string; onConfirm: () => void };

export default function Settings() {
  const { config, reload } = useConfig();

  const [persons, setPersons] = useState<Person[]>([]);
  const [sheet,   setSheet]   = useState<ActiveSheet | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [error,   setError]   = useState('');

  const loadPersons = async () => {
    try { setPersons(await getPersons()); } catch { /* silent */ }
  };

  useEffect(() => { loadPersons(); }, []);

  const close   = () => setSheet(null);
  const showErr = (msg: string) => setError(msg);
  const askDelete = (title: string, message: string, onConfirm: () => void) =>
    setConfirm({ title, message, onConfirm });

  const handleSavePerson = async (data: { name: string; type: string; phone: string }) => {
    try {
      if (sheet?.kind === 'editPerson') {
        await updatePerson(sheet.person.id, { ...data, phone: data.phone || undefined });
      } else {
        await createPerson({ ...data, phone: data.phone || undefined });
      }
      await loadPersons();
    } catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to save person'); }
  };

  const handleDeletePerson = (p: Person) =>
    askDelete('Delete Person', `Remove "${p.name}"? This fails if they have linked transactions.`, async () => {
      setConfirm(null);
      try { await deletePerson(p.id); await loadPersons(); }
      catch (e: any) { showErr(e?.response?.data?.message ?? 'Cannot delete — linked records exist'); }
    });

  const handleSaveType = async (data: { key?: string; label: string; icon: string; behavior: string; hasCategories: boolean; requiresPerson: boolean; personType: string }) => {
    try {
      if (sheet?.kind === 'editType') {
        await updateType(sheet.type.key, { label: data.label, icon: data.icon, behavior: data.behavior, hasCategories: data.hasCategories, requiresPerson: data.requiresPerson, personType: data.personType });
      } else {
        await addType(data as any);
      }
      await reload();
    } catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to save type'); }
  };

  const handleDeleteType = (t: TypeConfig) =>
    askDelete('Delete Type', `Remove "${t.label}"? Existing transactions keep this key.`, async () => {
      setConfirm(null);
      try { await deleteType(t.key); await reload(); }
      catch (e: any) { showErr(e?.response?.data?.message ?? 'Cannot delete type'); }
    });

  const handleSaveCat = async (data: { key?: string; label: string; icon: string }) => {
    try {
      if (sheet?.kind === 'editCat') {
        await updateCategory(sheet.cat.key, { label: data.label, icon: data.icon });
      } else {
        await addCategory(data as any);
      }
      await reload();
    } catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to save category'); }
  };

  const handleDeleteCat = (c: CategoryConfig) =>
    askDelete('Delete Category', `Remove "${c.label}"? This cannot be undone.`, async () => {
      setConfirm(null);
      try { await deleteCategory(c.key); await reload(); }
      catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to delete'); }
    });

  const friends = persons.filter(p => p.type === 'FRIEND');
  const family  = persons.filter(p => p.type === 'FAMILY');

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-900">Settings</h1>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button onClick={() => setError('')} className="text-rose-400 font-bold text-sm ml-3">✕</button>
        </div>
      )}

      <div className="p-4 flex flex-col gap-5">

        {/* ── PEOPLE ── */}
        <section>
          <SectionHeader label="People" onAdd={() => setSheet({ kind: 'addPerson' })} />
          {persons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-8 flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-slate-400">No people yet</p>
              <p className="text-xs text-slate-300">Add friends &amp; family to track transfers</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {([
                { label: 'Friends', list: friends, badge: 'Friend', badgeStyle: 'bg-blue-50 text-blue-600 border-blue-100' },
                { label: 'Family',  list: family,  badge: 'Family',  badgeStyle: 'bg-purple-50 text-purple-600 border-purple-100' },
              ] as const).map(({ label, list, badge, badgeStyle }) => list.length > 0 && (
                <div key={label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">{label} · {list.length}</p>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {list.map((p, i) => (
                      <div key={p.id}>
                        {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                        <ListRow
                          icon={
                            <span className="w-full h-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                              {p.name[0].toUpperCase()}
                            </span>
                          }
                          title={p.name}
                          subtitle={p.phone ? <p className="text-xs text-slate-400">{p.phone}</p> : undefined}
                          badge={badge} badgeStyle={badgeStyle}
                          onEdit={() => setSheet({ kind: 'editPerson', person: p })}
                          onDelete={() => handleDeletePerson(p)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── TRANSACTION TYPES ── */}
        <section>
          <SectionHeader
            label="Transaction Types"
            hint="Controls how each transaction affects your savings. Built-in types cannot be deleted."
            onAdd={() => setSheet({ kind: 'addType' })}
          />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {config.types.map((t, i) => (
              <div key={t.key}>
                {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                <ListRow
                  icon={t.icon}
                  title={t.label}
                  subtitle={
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadge(t.behavior)}`}>
                        {getBehaviorLabel(t.behavior)}
                      </span>
                      {t.isBuiltin && <span className="text-[10px] text-slate-400">built-in</span>}
                    </div>
                  }
                  onEdit={() => setSheet({ kind: 'editType', type: t })}
                  onDelete={!t.isBuiltin ? () => handleDeleteType(t) : undefined}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── EXPENSE CATEGORIES ── */}
        <section>
          <SectionHeader
            label="Expense Categories"
            hint="Sub-categories for expenses. Built-in categories cannot be deleted."
            onAdd={() => setSheet({ kind: 'addCat' })}
          />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {config.categories.map((c, i) => (
              <div key={c.key}>
                {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                <ListRow
                  icon={c.icon}
                  title={c.label}
                  subtitle={<p className="text-[10px] text-slate-400 font-mono">{c.key}</p>}
                  badge={!c.isBuiltin ? 'custom' : undefined}
                  badgeStyle="bg-indigo-50 text-indigo-500 border-indigo-100"
                  onEdit={() => setSheet({ kind: 'editCat', cat: c })}
                  onDelete={!c.isBuiltin ? () => handleDeleteCat(c) : undefined}
                />
              </div>
            ))}
          </div>
        </section>

      </div>

      {(sheet?.kind === 'addPerson' || sheet?.kind === 'editPerson') && (
        <PersonSheet
          person={sheet.kind === 'editPerson' ? sheet.person : undefined}
          onClose={close} onSaved={handleSavePerson}
        />
      )}
      {(sheet?.kind === 'addType' || sheet?.kind === 'editType') && (
        <TypeSheet
          type={sheet.kind === 'editType' ? sheet.type : undefined}
          onClose={close} onSaved={handleSaveType}
        />
      )}
      {(sheet?.kind === 'addCat' || sheet?.kind === 'editCat') && (
        <CategorySheet
          cat={sheet.kind === 'editCat' ? sheet.cat : undefined}
          onClose={close} onSaved={handleSaveCat}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.title} message={confirm.message}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
