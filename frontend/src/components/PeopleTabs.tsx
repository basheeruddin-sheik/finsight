import { useNavigate } from 'react-router-dom';
import { Handshake, Users } from 'lucide-react';

// Shared sticky header for the "People" section. Borrows and Splits are kept as
// separate data models (loans vs shared bills) but grouped under one tab here.
export default function PeopleTabs({ active }: { active: 'borrows' | 'splits' }) {
  const navigate = useNavigate();
  const tabs = [
    { key: 'borrows', label: 'Borrows', path: '/borrows', Icon: Handshake },
    { key: 'splits',  label: 'Splits',  path: '/splits',  Icon: Users },
  ] as const;

  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-base font-bold text-slate-900">People</h1>
      </div>
      <div className="flex px-2">
        {tabs.map(t => {
          const on = t.key === active;
          return (
            <button key={t.key} onClick={() => !on && navigate(t.path)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
                on ? 'border-indigo-600' : 'border-transparent'
              }`}>
              <t.Icon size={15} strokeWidth={on ? 2.5 : 2} className={on ? 'text-indigo-600' : 'text-slate-400'} />
              <span className={`text-sm font-bold ${on ? 'text-indigo-600' : 'text-slate-400'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
