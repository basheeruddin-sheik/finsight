import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/',        label: 'Home',     icon: '⌂'  },
  { path: '/borrows', label: 'Borrows',  icon: '🤝' },
  { path: '/add',     label: '',         icon: '',   fab: true },
  { path: '/insights',label: 'Insights', icon: '◉'  },
  { path: '/settings',label: 'Settings', icon: '⚙'  },
];

const INSIGHTS_PATHS = ['/insights', '/reports', '/budgets'];
const SETTINGS_PATHS = ['/settings', '/splits', '/family', '/persons'];

export default function BottomNav() {
  const navigate    = useNavigate();
  const { pathname } = useLocation();

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
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-0.5 -mt-6 transition-colors ${pathname === '/add' ? 'bg-indigo-600' : 'bg-slate-900'}`}>
                <span className="text-white text-3xl font-light leading-none">+</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Add</span>
            </button>
          );
        }
        const active = isActive(tab);
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} className="flex-1 flex flex-col items-center py-2 gap-0.5">
            <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors ${active ? 'bg-indigo-50' : ''}`}>
              <span className={`text-2xl transition-all ${active ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>{tab.icon}</span>
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
