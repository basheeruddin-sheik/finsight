import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getConfig } from '../api/config';
import type { AppConfig, TypeConfig, CategoryConfig, Behavior } from '../types';

const FALLBACK_TYPES: TypeConfig[] = [
  { key: 'EXPENSE',        label: 'Expense',        icon: 'wallet',     color: 'text-rose-500',    behavior: 'EXPENSE',      hasCategories: true,  requiresPerson: false, personType: 'ANY',    isBuiltin: true },
  { key: 'INCOME',         label: 'Income',          icon: 'banknote',   color: 'text-emerald-600', behavior: 'INCOME',       hasCategories: false, requiresPerson: false, personType: 'ANY',    isBuiltin: true },
  { key: 'FAMILY_TRANSFER',label: 'Family',          icon: 'users',      color: 'text-blue-500',   behavior: 'TRANSFER',     hasCategories: false, requiresPerson: true,  personType: 'FAMILY', isBuiltin: true },
  { key: 'BORROW_GIVEN',   label: 'Borrow Given',    icon: 'hand-coins', color: 'text-amber-500',  behavior: 'LEND',         hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true },
  { key: 'BORROW_RECEIVED',label: 'Borrow Received', icon: 'handshake',  color: 'text-violet-500', behavior: 'RECEIVE_BACK', hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true },
  { key: 'INTEREST_RECEIVED', label: 'Interest Received', icon: 'coins', color: 'text-emerald-600', behavior: 'INCOME',     hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true },
];

const FALLBACK_CATEGORIES: CategoryConfig[] = [
  { key: 'FOOD_DINING',   label: 'Food',          icon: 'utensils',      isBuiltin: true },
  { key: 'GROCERIES',     label: 'Groceries',     icon: 'shopping-cart', isBuiltin: true },
  { key: 'SHOPPING',      label: 'Shopping',      icon: 'shopping-bag',  isBuiltin: true },
  { key: 'FUEL_TRAVEL',   label: 'Fuel / Travel', icon: 'fuel',          isBuiltin: true },
  { key: 'SUBSCRIPTIONS', label: 'Subscriptions', icon: 'smartphone',    isBuiltin: true },
  { key: 'MEDICAL',       label: 'Medical',       icon: 'pill',          isBuiltin: true },
  { key: 'ENTERTAINMENT', label: 'Entertainment', icon: 'film',          isBuiltin: true },
  { key: 'UTILITIES',     label: 'Utilities',     icon: 'lightbulb',     isBuiltin: true },
  { key: 'OTHER',         label: 'Other',         icon: 'tag',           isBuiltin: true },
];

const FALLBACK: AppConfig = { types: FALLBACK_TYPES, categories: FALLBACK_CATEGORIES };

interface ConfigCtx {
  config: AppConfig;            // all types/categories (incl. archived) — for resolving history
  activeTypes: TypeConfig[];    // non-archived — for pickers
  activeCategories: CategoryConfig[];
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
  activeTypes: FALLBACK.types,
  activeCategories: FALLBACK.categories,
  reload: async () => {},
  getTypeConfig: () => undefined,
  getCategoryLabel: k => k,
  getCategoryIcon: () => 'tag',
  getTypeLabel: k => k,
  getTypeColor: () => 'text-slate-600',
  getTypeIcon: () => 'wallet',
  getBehavior: () => 'EXPENSE',
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(FALLBACK);

  const reload = async () => {
    try { setConfig(await getConfig()); } catch {}
  };

  useEffect(() => { reload(); }, []);

  // WRITEOFF is a system behavior (created when settling a loan) — never a manual pick.
  // Hide system/managed types from the Add-transaction picker: write-offs and
  // splits (splits are created from the Splits page, not added manually here).
  const activeTypes      = config.types.filter(t => !t.archived && t.behavior !== 'WRITEOFF' && !t.behavior.startsWith('SPLIT_'));
  const activeCategories = config.categories.filter(c => !c.archived);
  const getTypeConfig    = (key: string) => config.types.find(t => t.key === key);
  const getCategoryLabel = (key: string) => config.categories.find(c => c.key === key)?.label ?? key;
  const getCategoryIcon  = (key: string) => config.categories.find(c => c.key === key)?.icon  ?? 'tag';
  const getTypeLabel     = (key: string) => config.types.find(t => t.key === key)?.label ?? key;
  const getTypeColor     = (key: string) => config.types.find(t => t.key === key)?.color ?? 'text-slate-600';
  const getTypeIcon      = (key: string) => config.types.find(t => t.key === key)?.icon  ?? 'wallet';
  const getBehavior      = (key: string) => (config.types.find(t => t.key === key)?.behavior ?? 'EXPENSE') as Behavior;

  return (
    <ConfigContext.Provider value={{ config, activeTypes, activeCategories, reload, getTypeConfig, getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeColor, getTypeIcon, getBehavior }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
