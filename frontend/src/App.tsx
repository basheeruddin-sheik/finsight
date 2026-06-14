import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Setup from './pages/Setup';
import { ConfigProvider } from './context/ConfigContext';
import { ThemeProvider } from './context/ThemeContext';
import RequireAuth from './auth/RequireAuth';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <RequireAuth>
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
            <Route path="/insights"    element={<Insights />} />
            <Route path="/setup"       element={<Setup />} />
          </Routes>
          <BottomNav />
        </div>
      </ConfigProvider>
      </RequireAuth>
      </ThemeProvider>
    </BrowserRouter>
  );
}
