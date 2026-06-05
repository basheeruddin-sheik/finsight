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

function PeopleHub() {
  const navigate = useNavigate();
  return (
    <div className="p-4 flex flex-col gap-3 pb-24">
      <h1 className="text-lg font-semibold text-gray-700">People</h1>
      {[
        { path: '/splits',  label: 'Friends & Splits', desc: 'Net balances with friends',        icon: '🤝' },
        { path: '/family',  label: 'Family',            desc: 'Transfer history per member',      icon: '👨‍👩‍👦' },
        { path: '/persons', label: 'Manage People',     desc: 'Add or remove friends & family',   icon: '⚙️' },
      ].map(item => (
        <button key={item.path} onClick={() => navigate(item.path)}
          className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm text-left w-full">
          <span className="text-3xl">{item.icon}</span>
          <div>
            <p className="font-medium text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function InsightsHub() {
  const navigate = useNavigate();
  return (
    <div className="p-4 flex flex-col gap-3 pb-24">
      <h1 className="text-lg font-semibold text-gray-700">Insights</h1>
      {[
        { path: '/reports', label: 'Reports',  desc: 'Category breakdown, trends, money outside', icon: '📊' },
        { path: '/budgets', label: 'Budgets',  desc: 'Monthly limits, spend progress & alerts',   icon: '🎯' },
      ].map(item => (
        <button key={item.path} onClick={() => navigate(item.path)}
          className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm text-left w-full">
          <span className="text-3xl">{item.icon}</span>
          <div>
            <p className="font-medium text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/borrows" element={<Borrows />} />
          <Route path="/family" element={<Family />} />
          <Route path="/splits" element={<Splits />} />
          <Route path="/persons" element={<Persons />} />
          <Route path="/people" element={<PeopleHub />} />
          <Route path="/insights" element={<InsightsHub />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/budgets" element={<Budgets />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
