import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Handshake, PieChart, Settings, Plus, type LucideIcon } from 'lucide-react';

const tabs: { path: string; label: string; Icon?: LucideIcon; fab?: boolean }[] = [
  { path: '/',         label: 'Home',     Icon: Home     },
  { path: '/borrows',  label: 'Borrows',  Icon: Handshake },
  { path: '/add',      label: '',         fab: true      },
  { path: '/insights', label: 'Insights', Icon: PieChart },
  { path: '/settings', label: 'Settings', Icon: Settings },
];

const INSIGHTS_PATHS = ['/insights', '/reports', '/budgets'];
const SETTINGS_PATHS = ['/settings', '/splits', '/family', '/persons'];

export default function BottomNav() {
  const navigate    = useNavigate();
  const { pathname } = useLocation();

  // Hide the nav on the focused Add flow so the sticky Save button is clear.
  if (pathname === '/add') return null;

  function isActive(tab: typeof tabs[number]) {
    if (tab.path === '/insights') return INSIGHTS_PATHS.includes(pathname);
    if (tab.path === '/settings') return SETTINGS_PATHS.includes(pathname);
    return pathname === tab.path;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 flex items-end z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(tab => {
        if (tab.fab) {
          return (
            <button key="fab" onClick={() => navigate('/add')} className="flex-1 flex flex-col items-center pb-2 pt-1">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-0.5 -mt-6 bg-indigo-600">
                <Plus className="text-white" size={28} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Add</span>
            </button>
          );
        }
        const active = isActive(tab);
        const Icon = tab.Icon!;
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} className="flex-1 flex flex-col items-center py-2 gap-0.5">
            <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors ${active ? 'bg-indigo-50' : ''}`}>
              <Icon className={`transition-all ${active ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} size={22} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
