import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getConfig } from '../api/config';
import type { AppConfig, TypeConfig, CategoryConfig, Behavior } from '../types';

const FALLBACK_TYPES: TypeConfig[] = [
  { key: 'EXPENSE',        label: 'Expense',        icon: '💸', color: 'text-rose-500',    behavior: 'EXPENSE',      hasCategories: true,  requiresPerson: false, personType: 'ANY',    isBuiltin: true },
  { key: 'INCOME',         label: 'Income',          icon: '💰', color: 'text-emerald-600', behavior: 'INCOME',       hasCategories: false, requiresPerson: false, personType: 'ANY',    isBuiltin: true },
  { key: 'FAMILY_TRANSFER',label: 'Family',          icon: '👨‍👩‍👦', color: 'text-blue-500',   behavior: 'TRANSFER',     hasCategories: false, requiresPerson: true,  personType: 'FAMILY', isBuiltin: true },
  { key: 'BORROW_GIVEN',   label: 'Borrow Given',    icon: '🤝', color: 'text-amber-500',  behavior: 'LEND',         hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true },
  { key: 'BORROW_RECEIVED',label: 'Borrow Received', icon: '📥', color: 'text-violet-500', behavior: 'RECEIVE_BACK', hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true },
];

const FALLBACK_CATEGORIES: CategoryConfig[] = [
  { key: 'FOOD_DINING',   label: 'Food',          icon: '🍜', isBuiltin: true },
  { key: 'GROCERIES',     label: 'Groceries',     icon: '🛒', isBuiltin: true },
  { key: 'SHOPPING',      label: 'Shopping',      icon: '🛍️', isBuiltin: true },
  { key: 'FUEL_TRAVEL',   label: 'Fuel / Travel', icon: '⛽', isBuiltin: true },
  { key: 'SUBSCRIPTIONS', label: 'Subscriptions', icon: '📱', isBuiltin: true },
  { key: 'MEDICAL',       label: 'Medical',       icon: '💊', isBuiltin: true },
  { key: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎬', isBuiltin: true },
  { key: 'UTILITIES',     label: 'Utilities',     icon: '💡', isBuiltin: true },
  { key: 'OTHER',         label: 'Other',         icon: '💰', isBuiltin: true },
];

const FALLBACK: AppConfig = { types: FALLBACK_TYPES, categories: FALLBACK_CATEGORIES };

interface ConfigCtx {
  config: AppConfig;
  reload: () => Promise<void>;
  getTypeConfig: (key: string) => TypeConfig | undefined;
  getCategoryLabel: (key: string) => string;
  getCategoryIcon: (key: string) => string;
  getTypeLabel: (key: string) => string;
  getTypeColor: (key: string) => string;
  getTypeIcon: (key: string) => string;
  getBehavior: (key: string) => Behavior;
}

const ConfigContext = createContext<ConfigCtx>({
  config: FALLBACK,
  reload: async () => {},
  getTypeConfig: () => undefined,
  getCategoryLabel: k => k,
  getCategoryIcon: () => '💰',
  getTypeLabel: k => k,
  getTypeColor: () => 'text-slate-600',
  getTypeIcon: () => '💸',
  getBehavior: () => 'EXPENSE',
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(FALLBACK);

  const reload = async () => {
    try { setConfig(await getConfig()); } catch {}
  };

  useEffect(() => { reload(); }, []);

  const getTypeConfig    = (key: string) => config.types.find(t => t.key === key);
  const getCategoryLabel = (key: string) => config.categories.find(c => c.key === key)?.label ?? key;
  const getCategoryIcon  = (key: string) => config.categories.find(c => c.key === key)?.icon  ?? '💰';
  const getTypeLabel     = (key: string) => config.types.find(t => t.key === key)?.label ?? key;
  const getTypeColor     = (key: string) => config.types.find(t => t.key === key)?.color ?? 'text-slate-600';
  const getTypeIcon      = (key: string) => config.types.find(t => t.key === key)?.icon  ?? '💸';
  const getBehavior      = (key: string) => (config.types.find(t => t.key === key)?.behavior ?? 'EXPENSE') as Behavior;

  return (
    <ConfigContext.Provider value={{ config, reload, getTypeConfig, getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeColor, getTypeIcon, getBehavior }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
