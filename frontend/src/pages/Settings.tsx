import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { formatAmount } from '../utils';
import { updateType, updateCategory, addCategory, addType, archiveType, restoreType, archiveCategory, restoreCategory } from '../api/config';
import { getPersons, createPerson, updatePerson, archivePerson, restorePerson } from '../api/persons';
import { useConfig } from '../context/ConfigContext';
import { useTheme } from '../context/ThemeContext';
import type { Behavior, TypeConfig, CategoryConfig, Person, Account } from '../types';
import { ConfirmModal } from '../components/ui';
import { ConfigIcon, IconBadge, getIconColor, CONFIG_ICON_GROUPS } from '../components/configIcons';
import { X, ChevronDown, User, Users, Plus, Pencil, Trash2, Archive, RotateCcw, Sun, Moon, LogOut, PiggyBank, Landmark, ChevronRight, type LucideIcon } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const BEHAVIORS: { key: Behavior; label: string; badge: string }[] = [
  { key: 'INCOME',       label: 'Income',       badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'EXPENSE',      label: 'Expense',      badge: 'bg-rose-100 text-rose-600 border-rose-200'          },
  { key: 'TRANSFER',     label: 'Transfer',     badge: 'bg-blue-100 text-blue-700 border-blue-200'          },
  { key: 'LEND',         label: 'Lend',         badge: 'bg-amber-100 text-amber-700 border-amber-200'       },
  { key: 'RECEIVE_BACK', label: 'Receive Back', badge: 'bg-violet-100 text-violet-700 border-violet-200'    },
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
        <IconBadge name={value} size={18} className="w-8 h-8 rounded-lg" />
        <span className="flex-1 text-left text-sm text-slate-600">{open ? 'Choose icon' : 'Change icon'}</span>
        <ChevronDown className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} size={16} />
      </button>
      {open && (
        <div className="mt-2 bg-slate-50 rounded-xl border border-slate-100 p-2.5 flex flex-col gap-2.5">
          {CONFIG_ICON_GROUPS.map(g => (
            <div key={g.label}>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-0.5">{g.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {g.icons.map(name => (
                  <button key={name} type="button" onClick={() => { onChange(name); setOpen(false); }}
                    className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                      value === name ? 'bg-indigo-500' : 'bg-white active:bg-slate-200'
                    }`}>
                    <ConfigIcon name={name} size={17} className={value === name ? 'text-white' : getIconColor(name).text} />
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
            className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center active:bg-slate-200">
            <X size={14} strokeWidth={2.5} />
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
  options: { v: string; l: string; Icon?: LucideIcon }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
            value === o.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
          {o.Icon && <o.Icon size={14} strokeWidth={2} />}
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
      className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80">
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
  const [type,   setType]   = useState<string>(person?.type  ?? 'FRIEND');
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
            options={[{ v: 'FRIEND', l: 'Friend', Icon: User }, { v: 'FAMILY', l: 'Family', Icon: Users }]}
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
  const [icon,          setIcon]          = useState(type?.icon          ?? 'wallet');
  const [behavior,      setBehavior]      = useState<Behavior>(type?.behavior ?? 'EXPENSE');
  const [hasCategories, setHasCategories] = useState(type?.hasCategories ?? false);
  const [reqPerson,     setReqPerson]     = useState(type?.requiresPerson ?? false);
  const [personType,    setPersonType]    = useState<string>(type?.personType    ?? 'ANY');
  const [saving,        setSaving]        = useState(false);

  const isBuiltin = type?.isBuiltin ?? false;

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    const key = type?.key ?? label.toUpperCase().replace(/\s+/g, '_');
    await onSaved({ key, label: label.trim(), icon, behavior, hasCategories, requiresPerson: reqPerson, personType });
    setSaving(false);
    onClose();
  };

  return (
    <Sheet title={type ? (isBuiltin ? `Edit "${type.label}"` : 'Edit Type') : 'New Transaction Type'} onClose={onClose}>

      {/* Icon — always editable */}
      <Section label="Icon">
        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </Section>

      {isBuiltin ? (
        <p className="text-xs text-slate-400 leading-relaxed px-0.5">
          This is a <span className="font-semibold text-slate-500">built-in</span> type. Only its icon can be changed —
          its name, behavior and options are fixed so your reports stay consistent.
        </p>
      ) : (
        <>
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
                    options={[{ v: 'ANY', l: 'Any person', Icon: Users }, { v: 'FAMILY', l: 'Family only', Icon: Users }]}
                    value={personType} onChange={setPersonType}
                  />
                </div>
              )}
            </div>
          </Section>
        </>
      )}

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
  const [icon,   setIcon]   = useState(cat?.icon  ?? 'tag');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    const key = cat?.key ?? label.toUpperCase().replace(/\s+/g, '_');
    await onSaved({ key, label: label.trim(), icon });
    setSaving(false);
    onClose();
  };

  const isBuiltin = cat?.isBuiltin ?? false;

  return (
    <Sheet title={cat ? (isBuiltin ? `Edit "${cat.label}"` : 'Edit Category') : 'New Category'} onClose={onClose}>
      <Section label="Icon">
        <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </Section>
      {isBuiltin ? (
        <p className="text-xs text-slate-400 leading-relaxed px-0.5">
          This is a <span className="font-semibold text-slate-500">built-in</span> category. Only its icon can be changed.
        </p>
      ) : (
        <Section label="Name">
          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
            <InlineInput value={label} onChange={setLabel} placeholder={cat ? '' : 'e.g. EMI, Rent, Insurance'} />
          </div>
        </Section>
      )}
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
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 pl-2 pr-3 py-1 bg-indigo-50 rounded-xl border border-indigo-100 active:opacity-70">
          <Plus size={14} strokeWidth={2.5} /> Add
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400 px-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

// ── List row ─────────────────────────────────────────────────────────────────

function ListRow({ icon, title, subtitle, badge, badgeStyle, onEdit, onDelete, onArchive }: {
  icon: React.ReactNode; title: string; subtitle?: React.ReactNode;
  badge?: string; badgeStyle?: string;
  onEdit: () => void; onDelete?: () => void; onArchive?: () => void;
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
          <Pencil size={14} strokeWidth={2} />
        </button>
        {onArchive ? (
          <button onClick={onArchive} title="Archive"
            className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 active:bg-amber-100">
            <Archive size={14} strokeWidth={2} />
          </button>
        ) : onDelete ? (
          <button onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 active:bg-rose-100">
            <Trash2 size={14} strokeWidth={2} />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>
    </div>
  );
}

// ── Archived block (collapsible; Activate-only) ───────────────────────────────

function ArchivedBlock({ count, open, onToggle, items }: {
  count: number; open: boolean; onToggle: () => void;
  items: { key: string; icon: string; label: string; sub: string; onRestore: () => void }[];
}) {
  return (
    <div className="mt-3">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-1 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <span className="flex items-center gap-1.5"><Archive size={12} strokeWidth={2.5} /> Archived · {count}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-1">
          {items.map((it, i) => (
            <div key={it.key} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
              <span className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <ConfigIcon name={it.icon} size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-500 truncate">{it.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{it.sub}</p>
              </div>
              <button onClick={it.onRestore}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 active:opacity-70 shrink-0">
                <RotateCcw size={13} strokeWidth={2} /> Activate
              </button>
            </div>
          ))}
        </div>
      )}
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

type Confirm = { title: string; message: string; onConfirm: () => void; confirmLabel?: string; variant?: 'danger' | 'confirm' };

export default function Settings() {
  const navigate = useNavigate();
  const { config, reload } = useConfig();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth0();

  const [persons,  setPersons]  = useState<Person[]>([]);
  const [archived, setArchived] = useState<Person[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchTypes, setShowArchTypes] = useState(false);
  const [showArchCats,  setShowArchCats]  = useState(false);
  const [sheet,    setSheet]    = useState<ActiveSheet | null>(null);
  const [confirm,  setConfirm]  = useState<Confirm | null>(null);
  const [error,    setError]    = useState('');

  // Opening balance summary
  const [obSavings,   setObSavings]   = useState(0);
  const [obInvCount,  setObInvCount]  = useState(0);
  const [obLentCount, setObLentCount] = useState(0);

  // Accounts summary
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadPersons = async () => {
    try {
      const [active, arch] = await Promise.all([getPersons(), getPersons(undefined, true)]);
      setPersons(active); setArchived(arch);
    } catch { /* silent */ }
  };

  const loadOpeningBalances = async () => {
    try {
      const [obTxns, invTxns, lentTxns] = await Promise.all([
        getTransactions({ type: 'OPENING_BALANCE' }),
        getTransactions({ type: 'INVESTMENT',   search: 'Opening balance' }),
        getTransactions({ type: 'BORROW_GIVEN', search: 'Opening balance' }),
      ]);
      setObSavings(obTxns.reduce((s, t) => s + t.amount, 0));
      setObInvCount(invTxns.length);
      setObLentCount(lentTxns.length);
    } catch { /* silent */ }
  };

  const loadAccounts = async () => {
    try { setAccounts(await getAccounts()); } catch { /* silent */ }
  };

  useEffect(() => { loadPersons(); loadOpeningBalances(); loadAccounts(); }, []);

  const close   = () => setSheet(null);
  const showErr = (msg: string) => setError(msg);
  const askDelete = (title: string, message: string, onConfirm: () => void, extra?: { confirmLabel?: string; variant?: 'danger' | 'confirm' }) =>
    setConfirm({ title, message, onConfirm, ...extra });

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

  const handleArchivePerson = (p: Person) =>
    askDelete('Archive Person', `Hide "${p.name}" from your lists? Their transactions and borrows stay intact, and you can reactivate them anytime from Archived.`, async () => {
      setConfirm(null);
      try { await archivePerson(p.id); await loadPersons(); }
      catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to archive'); }
    }, { confirmLabel: 'Archive', variant: 'confirm' });

  const handleRestorePerson = async (p: Person) => {
    try { await restorePerson(p.id); await loadPersons(); }
    catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to reactivate'); }
  };

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

  const handleArchiveType = (t: TypeConfig) =>
    askDelete('Archive Type', `Hide "${t.label}" from the Add screen and filters? Existing transactions keep it, and you can reactivate anytime from Archived.`, async () => {
      setConfirm(null);
      try { await archiveType(t.key); await reload(); }
      catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to archive type'); }
    }, { confirmLabel: 'Archive', variant: 'confirm' });

  const handleRestoreType = async (t: TypeConfig) => {
    try { await restoreType(t.key); await reload(); }
    catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to reactivate'); }
  };

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

  const handleArchiveCat = (c: CategoryConfig) =>
    askDelete('Archive Category', `Hide "${c.label}" from pickers? Existing transactions keep it, and you can reactivate anytime from Archived.`, async () => {
      setConfirm(null);
      try { await archiveCategory(c.key); await reload(); }
      catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to archive'); }
    }, { confirmLabel: 'Archive', variant: 'confirm' });

  const handleRestoreCat = async (c: CategoryConfig) => {
    try { await restoreCategory(c.key); await reload(); }
    catch (e: any) { showErr(e?.response?.data?.message ?? 'Failed to reactivate'); }
  };

  const friends = persons.filter(p => p.type === 'FRIEND');
  const family  = persons.filter(p => p.type === 'FAMILY');

  const activeTypeList = config.types.filter(t => !t.archived);
  const archivedTypes  = config.types.filter(t => t.archived);
  const activeCatList  = config.categories.filter(c => !c.archived);
  const archivedCats   = config.categories.filter(c => c.archived);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="text-base font-semibold text-slate-900">Settings</h1>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button onClick={() => setError('')} className="text-rose-400 ml-3 shrink-0"><X size={16} strokeWidth={2.5} /></button>
        </div>
      )}

      <div className="p-4 flex flex-col gap-5">

        {/* ── DATA ── */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Data</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button onClick={() => navigate('/setup')}
              className="w-full p-4 flex items-center gap-3 text-left active:bg-slate-50">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <PiggyBank className="text-indigo-500" size={18} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">Opening balances</p>
                {obSavings === 0 && obInvCount === 0 && obLentCount === 0 ? (
                  <p className="text-xs text-slate-400">Add existing savings, investments &amp; loans</p>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {obSavings > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ₹{(obSavings / 100000).toFixed(1)}L savings
                      </span>
                    )}
                    {obInvCount > 0 && (
                      <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {obInvCount} investment{obInvCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {obLentCount > 0 && (
                      <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        {obLentCount} loan{obLentCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="text-slate-300 shrink-0" size={18} />
            </button>
            <div className="h-px bg-slate-50 mx-4" />
            <button onClick={() => navigate('/accounts')}
              className="w-full p-4 flex items-center gap-3 text-left active:bg-slate-50">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <Landmark className="text-teal-600" size={18} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">Accounts</p>
                {accounts.length === 0 ? (
                  <p className="text-xs text-slate-400">Track balances across bank accounts &amp; wallets</p>
                ) : (
                  <p className="text-xs text-slate-400">
                    {accounts.length} account{accounts.length > 1 ? 's' : ''} · {formatAmount(accounts.reduce((s, a) => s + a.balance, 0))}
                  </p>
                )}
              </div>
              <ChevronRight className="text-slate-300 shrink-0" size={18} />
            </button>
          </div>
        </section>

        {/* ── ACCOUNT ── */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Account</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <User className="text-indigo-600" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || user?.email || 'Signed in'}</p>
              {user?.email && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
            </div>
            <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold active:bg-slate-50 shrink-0">
              <LogOut size={14} /> Log out
            </button>
          </div>
        </section>

        {/* ── APPEARANCE ── */}
        <section>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Appearance</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex gap-2">
            {([
              { v: 'light', label: 'Light', Icon: Sun },
              { v: 'dark',  label: 'Dark',  Icon: Moon },
            ] as const).map(o => (
              <button key={o.v} onClick={() => setTheme(o.v)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  theme === o.v ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'
                }`}>
                <o.Icon size={16} strokeWidth={2} /> {o.label}
              </button>
            ))}
          </div>
        </section>

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
                          onArchive={() => handleArchivePerson(p)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowArchived(s => !s)}
                className="w-full flex items-center justify-between px-1 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Archive size={12} strokeWidth={2.5} /> Archived · {archived.length}</span>
                <ChevronDown size={14} className={`transition-transform ${showArchived ? 'rotate-180' : ''}`} />
              </button>
              {showArchived && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-1">
                  {archived.map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                      <span className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                        {p.name[0].toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-500 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.type === 'FAMILY' ? 'Family' : 'Friend'}</p>
                      </div>
                      <button onClick={() => handleRestorePerson(p)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 active:opacity-70 shrink-0">
                        <RotateCcw size={13} strokeWidth={2} /> Activate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── TRANSACTION TYPES ── */}
        <section>
          <SectionHeader
            label="Transaction Types"
            hint="Controls how each transaction affects your savings. Built-in types can only have their icon changed."
            onAdd={() => setSheet({ kind: 'addType' })}
          />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {activeTypeList.map((t, i) => (
              <div key={t.key}>
                {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                <ListRow
                  icon={<IconBadge name={t.icon} size={20} className="w-full h-full" />}
                  title={t.label}
                  subtitle={
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${getBadge(t.behavior)}`}>
                      {getBehaviorLabel(t.behavior)}
                    </span>
                  }
                  badge={t.isBuiltin ? 'Built-in' : 'Custom'}
                  badgeStyle={t.isBuiltin ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}
                  onEdit={() => setSheet({ kind: 'editType', type: t })}
                  onArchive={!t.isBuiltin ? () => handleArchiveType(t) : undefined}
                />
              </div>
            ))}
          </div>

          {archivedTypes.length > 0 && (
            <ArchivedBlock
              count={archivedTypes.length} open={showArchTypes} onToggle={() => setShowArchTypes(s => !s)}
              items={archivedTypes.map(t => ({ key: t.key, icon: t.icon, label: t.label, sub: getBehaviorLabel(t.behavior), onRestore: () => handleRestoreType(t) }))}
            />
          )}
        </section>

        {/* ── EXPENSE CATEGORIES ── */}
        <section>
          <SectionHeader
            label="Expense Categories"
            hint="Sub-categories for expenses. Built-in categories can only have their icon changed."
            onAdd={() => setSheet({ kind: 'addCat' })}
          />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {activeCatList.map((c, i) => (
              <div key={c.key}>
                {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                <ListRow
                  icon={<IconBadge name={c.icon} size={20} className="w-full h-full" />}
                  title={c.label}
                  subtitle={<p className="text-[10px] text-slate-400 font-mono">{c.key}</p>}
                  badge={c.isBuiltin ? 'Built-in' : 'Custom'}
                  badgeStyle={c.isBuiltin ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}
                  onEdit={() => setSheet({ kind: 'editCat', cat: c })}
                  onArchive={!c.isBuiltin ? () => handleArchiveCat(c) : undefined}
                />
              </div>
            ))}
          </div>

          {archivedCats.length > 0 && (
            <ArchivedBlock
              count={archivedCats.length} open={showArchCats} onToggle={() => setShowArchCats(s => !s)}
              items={archivedCats.map(c => ({ key: c.key, icon: c.icon, label: c.label, sub: 'Category', onRestore: () => handleRestoreCat(c) }))}
            />
          )}
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
          confirmLabel={confirm.confirmLabel} variant={confirm.variant}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
