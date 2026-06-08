import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfigIcon, getIconColor } from './configIcons';
import { prettyDate, ymd, todayStr } from '../utils';

// ── Custom calendar picker ────────────────────────────────────────────────────
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function CalendarModal({ value, onSelect, onClose, max }: {
  value: string; onSelect: (v: string) => void; onClose: () => void; max?: string;
}) {
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');

  const maxD  = max ? new Date(max + 'T00:00:00') : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayDisabled = maxD ? today > maxD : false;

  const offset  = new Date(view.y, view.m, 1).getDay();
  const numDays = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: numDays }, (_, i) => i + 1)];

  // header title + prev/next behaviour depend on mode
  const yearStart = Math.floor(view.y / 12) * 12;
  const title = mode === 'days' ? `${MONTHS[view.m]} ${view.y}` : mode === 'months' ? `${view.y}` : `${yearStart} – ${yearStart + 11}`;
  const cycleMode = () => setMode(m => (m === 'days' ? 'months' : m === 'months' ? 'years' : 'days'));
  const step = (delta: number) => {
    if (mode === 'days')   setView(v => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
    if (mode === 'months') setView(v => ({ ...v, y: v.y + delta }));
    if (mode === 'years')  setView(v => ({ ...v, y: v.y + delta * 12 }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-[320px] shadow-2xl p-4">
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => step(-1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200"><ChevronLeft size={17} /></button>
          <button onClick={cycleMode} className="px-3 py-1 rounded-lg text-sm font-bold text-slate-800 active:bg-slate-100">{title}</button>
          <button onClick={() => step(1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200"><ChevronRight size={17} /></button>
        </div>

        {mode === 'days' && (
          <>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d, i) => <span key={i} className="text-[10px] font-bold text-slate-400 text-center py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <span key={i} />;
                const d = new Date(view.y, view.m, day);
                const iso = ymd(d);
                const selected = iso === value;
                const isToday  = d.getTime() === today.getTime();
                const disabled = maxD ? d > maxD : false;
                return (
                  <button key={i} disabled={disabled} onClick={() => { onSelect(iso); onClose(); }}
                    className={`h-9 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
                      selected ? 'bg-indigo-600 text-white' : isToday ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700 active:bg-slate-100'
                    } ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === 'months' && (
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((mo, i) => {
              const active = i === view.m;
              return (
                <button key={mo} onClick={() => { setView(v => ({ ...v, m: i })); setMode('days'); }}
                  className={`h-11 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-700 bg-slate-50 active:bg-slate-100'}`}>
                  {mo}
                </button>
              );
            })}
          </div>
        )}

        {mode === 'years' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => yearStart + i).map(yr => {
              const active = yr === view.y;
              return (
                <button key={yr} onClick={() => { setView(v => ({ ...v, y: yr })); setMode('months'); }}
                  className={`h-11 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-700 bg-slate-50 active:bg-slate-100'}`}>
                  {yr}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          <button disabled={todayDisabled} onClick={() => { onSelect(todayStr()); onClose(); }}
            className="flex-1 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 disabled:opacity-40 active:bg-slate-200">Today</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── DateField — compact trigger + custom calendar (no native OS picker) ───────
export function DateField({ value, onChange, max }: {
  value: string; onChange: (v: string) => void; max?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full h-12 flex items-center gap-2.5 bg-white rounded-xl px-3 border border-slate-200 active:bg-slate-50">
        <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <Calendar size={15} className="text-indigo-500" />
        </span>
        <span className="flex-1 text-left text-sm font-semibold text-slate-800 truncate">{prettyDate(value)}</span>
        <ChevronRight size={15} className="text-slate-300 shrink-0" />
      </button>
      {open && <CalendarModal value={value} onSelect={onChange} onClose={() => setOpen(false)} max={max} />}
    </>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
// `icon` accepts a lucide icon node (preferred) or a string/emoji (legacy).
export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 text-4xl">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold text-slate-700">{title}</p>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, right, onBack }: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
      <button
        onClick={onBack ?? (() => navigate(-1))}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-lg shrink-0"
      >
        ‹
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 mb-2">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{children}</p>
      {right}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${onClick ? 'cursor-pointer active:opacity-70' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ── BottomSheet ───────────────────────────────────────────────────────────────
export function BottomSheet({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"><X size={15} strokeWidth={2.5} /></button>
        </div>
        <div className="p-5 pb-7 flex flex-col gap-4 overflow-y-auto"
          style={{ paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── PrimaryButton ─────────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, disabled, className = '' }: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 bg-indigo-600 text-white rounded-2xl text-[15px] font-semibold disabled:opacity-40 active:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </button>
  );
}

// ── SecondaryButton ───────────────────────────────────────────────────────────
export function SecondaryButton({ children, onClick, className = '' }: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-4 border border-slate-200 text-slate-600 rounded-2xl text-sm font-medium active:opacity-70 ${className}`}
    >
      {children}
    </button>
  );
}

// ── InputField ────────────────────────────────────────────────────────────────
export function InputField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      {children}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE:             'bg-red-50 text-red-600 border-red-100',
    PARTIALLY_RETURNED: 'bg-amber-50 text-amber-600 border-amber-100',
    SETTLED:            'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    PARTIALLY_RETURNED: 'Partial',
    SETTLED: 'Settled',
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${styles[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Amount ────────────────────────────────────────────────────────────────────
export function Amount({ value, size = 'md', className = '' }: {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' }[size];
  const color = value >= 0 ? 'text-emerald-600' : 'text-rose-500';
  const formatted = '₹' + Math.abs(value).toLocaleString('en-IN');
  return (
    <span className={`font-bold ${sizeClass} ${color} ${className}`}>
      {value > 0 ? '+' : value < 0 ? '-' : ''}{formatted}
    </span>
  );
}

// ── IconCircle ────────────────────────────────────────────────────────────────
// `icon` is a config icon name (lucide) or legacy emoji. Colors itself from the
// icon's palette; pass `color` to override the background.
export function IconCircle({ icon, color }: { icon: string; color?: string }) {
  const c = getIconColor(icon);
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color ?? c.bg}`}>
      <ConfigIcon name={icon} size={20} className={c.text} />
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
// variant="danger"  → rose Delete button + trash icon  (irreversible deletes)
// variant="confirm" → indigo button + check icon        (safe confirmations)
export function ConfirmModal({
  title, message, confirmLabel = 'Delete', variant = 'danger', onConfirm, onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'confirm';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const danger = variant === 'danger';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-[300px] shadow-2xl overflow-hidden">
        {/* icon badge */}
        <div className="flex justify-center pt-7 pb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${danger ? 'bg-rose-50' : 'bg-indigo-50'}`}>
            {danger ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
          </div>
        </div>
        {/* text */}
        <div className="px-6 pb-5 text-center">
          <p className="text-[15px] font-bold text-slate-900 mb-1.5">{title}</p>
          <p className="text-[13px] text-slate-400 leading-relaxed">{message}</p>
        </div>
        {/* divider + buttons */}
        <div className="border-t border-slate-100 flex">
          <button onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-semibold text-slate-500 border-r border-slate-100 active:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-bold active:opacity-80 ${danger ? 'text-rose-500' : 'text-indigo-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
