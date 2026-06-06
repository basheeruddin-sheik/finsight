import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';
import Borrows from './pages/Borrows';
import Family from './pages/Family';
import Splits from './pages/Splits';
import Persons from './pages/Persons';
import Reports from './pages/Reports';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';
import { ConfigProvider } from './context/ConfigContext';

const INSIGHTS_ITEMS = [
  { path: '/reports', label: 'Reports', desc: 'Spending breakdown & savings trend', icon: '📊', color: 'bg-indigo-50'  },
  { path: '/budgets', label: 'Budgets', desc: 'Monthly limits & spend progress',    icon: '🎯', color: 'bg-emerald-50' },
];

function InsightsHub() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-semibold text-slate-900">Insights</h1>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {INSIGHTS_ITEMS.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 text-left w-full active:opacity-70">
            <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center text-2xl shrink-0`}>{item.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <span className="text-slate-300 text-lg shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/add"         element={<AddTransaction />} />
            <Route path="/transactions"element={<Transactions />} />
            <Route path="/borrows"     element={<Borrows />} />
            <Route path="/family"      element={<Family />} />
            <Route path="/splits"      element={<Splits />} />
            <Route path="/persons"     element={<Persons />} />
            <Route path="/reports"     element={<Reports />} />
            <Route path="/budgets"     element={<Budgets />} />
            <Route path="/settings"    element={<Settings />} />
            <Route path="/insights"    element={<InsightsHub />} />
          </Routes>
          <BottomNav />
        </div>
      </ConfigProvider>
    </BrowserRouter>
  );
}
