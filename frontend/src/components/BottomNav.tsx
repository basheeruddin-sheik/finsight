import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/',         label: 'Home',     icon: '🏠' },
  { path: '/borrows',  label: 'Borrows',  icon: '💸' },
  { path: '/add',      label: 'Add',      icon: '＋', fab: true },
  { path: '/insights', label: 'Insights', icon: '📊' },
  { path: '/people',   label: 'People',   icon: '👥' },
];

const INSIGHTS_PATHS = ['/insights', '/reports', '/budgets'];
const PEOPLE_PATHS   = ['/people', '/splits', '/family', '/persons'];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function isActive(tab: typeof tabs[number]) {
    if (tab.path === '/insights') return INSIGHTS_PATHS.includes(pathname);
    if (tab.path === '/people')   return PEOPLE_PATHS.includes(pathname);
    return pathname === tab.path;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center py-2 z-20 max-w-md mx-auto">
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${active ? 'text-gray-900' : 'text-gray-400'}`}
          >
            {tab.fab ? (
              <span className="bg-gray-900 text-white rounded-full w-11 h-11 flex items-center justify-center text-2xl font-light mb-1">
                {tab.icon}
              </span>
            ) : (
              <span className="text-xl">{tab.icon}</span>
            )}
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
