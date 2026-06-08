// Per-user defaults. Seeded into a user's own config the first time they appear.

export const BEHAVIOR_COLORS: Record<string, string> = {
  INCOME:       'text-emerald-600',
  EXPENSE:      'text-rose-500',
  TRANSFER:     'text-blue-500',
  LEND:         'text-amber-500',
  RECEIVE_BACK: 'text-violet-500',
  INVEST:       'text-yellow-600',
  DIVEST:       'text-emerald-600',   // money returning from investments — positive
};

export const DEFAULT_TYPES = [
  { configType: 'type', key: 'EXPENSE',         label: 'Expense',         icon: 'wallet',     color: 'text-rose-500',    behavior: 'EXPENSE',      hasCategories: true,  requiresPerson: false, personType: 'ANY',    isBuiltin: true, order: 0 },
  { configType: 'type', key: 'INCOME',           label: 'Income',           icon: 'banknote',   color: 'text-emerald-600', behavior: 'INCOME',       hasCategories: false, requiresPerson: false, personType: 'ANY',    isBuiltin: true, order: 1 },
  { configType: 'type', key: 'FAMILY_TRANSFER',  label: 'Family',           icon: 'users',      color: 'text-blue-500',   behavior: 'TRANSFER',     hasCategories: false, requiresPerson: true,  personType: 'FAMILY', isBuiltin: true, order: 2 },
  { configType: 'type', key: 'BORROW_GIVEN',     label: 'Borrow Given',     icon: 'hand-coins', color: 'text-amber-500',  behavior: 'LEND',         hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true, order: 3 },
  { configType: 'type', key: 'BORROW_RECEIVED',  label: 'Borrow Received',  icon: 'handshake',  color: 'text-violet-500', behavior: 'RECEIVE_BACK', hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true, order: 4 },
  { configType: 'type', key: 'INTEREST_RECEIVED', label: 'Interest Received', icon: 'coins',     color: 'text-emerald-600', behavior: 'INCOME',      hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true, order: 5 },
  // System-only: created when a loan is settled with money still outstanding.
  { configType: 'type', key: 'BORROW_WRITEOFF',  label: 'Written Off',      icon: 'trending-down', color: 'text-slate-500',   behavior: 'WRITEOFF', hasCategories: false, requiresPerson: false, personType: 'ANY', isBuiltin: true, order: 6 },
  // Investment — money allocated to stocks, mutual funds, gold, etc.
  { configType: 'type', key: 'INVESTMENT',        label: 'Investment',        icon: 'trending-up',   color: 'text-yellow-600',  behavior: 'INVEST',  hasCategories: true,  requiresPerson: false, personType: 'ANY', isBuiltin: true, order: 7 },
  // Investment Return — selling/redeeming an investment. costBasis field stores
  // the original amount invested so profit/loss and net invested can be derived.
  { configType: 'type', key: 'INVESTMENT_RETURN', label: 'Investment Return', icon: 'trending-up',   color: 'text-emerald-600', behavior: 'DIVEST',  hasCategories: true,  requiresPerson: false, personType: 'ANY', isBuiltin: true, order: 8 },
  // Opening Balance — one-time entry to seed existing savings/wealth when first using the app.
  { configType: 'type', key: 'OPENING_BALANCE',   label: 'Opening Balance',   icon: 'piggy-bank',    color: 'text-slate-500',   behavior: 'INCOME',  hasCategories: false, requiresPerson: false, personType: 'ANY', isBuiltin: true, order: 9 },
];

export const DEFAULT_CATEGORIES = [
  { configType: 'category', key: 'FOOD_DINING',   label: 'Food',          icon: 'utensils',      isBuiltin: true, order: 0 },
  { configType: 'category', key: 'GROCERIES',     label: 'Groceries',     icon: 'shopping-cart', isBuiltin: true, order: 1 },
  { configType: 'category', key: 'SHOPPING',      label: 'Shopping',      icon: 'shopping-bag',  isBuiltin: true, order: 2 },
  { configType: 'category', key: 'FUEL_TRAVEL',   label: 'Fuel / Travel', icon: 'fuel',          isBuiltin: true, order: 3 },
  { configType: 'category', key: 'SUBSCRIPTIONS', label: 'Subscriptions', icon: 'smartphone',    isBuiltin: true, order: 4 },
  { configType: 'category', key: 'MEDICAL',       label: 'Medical',       icon: 'pill',          isBuiltin: true, order: 5 },
  { configType: 'category', key: 'ENTERTAINMENT', label: 'Entertainment', icon: 'film',          isBuiltin: true, order: 6 },
  { configType: 'category', key: 'UTILITIES',     label: 'Utilities',     icon: 'lightbulb',     isBuiltin: true, order: 7 },
  { configType: 'category', key: 'OTHER',          label: 'Other',         icon: 'tag',           isBuiltin: true, order: 8 },
  // Investment categories
  { configType: 'category', key: 'STOCKS',         label: 'Stocks',        icon: 'landmark',      isBuiltin: true, order: 9 },
  { configType: 'category', key: 'MUTUAL_FUNDS',   label: 'Mutual Funds',  icon: 'line-chart',    isBuiltin: true, order: 10 },
  { configType: 'category', key: 'GOLD',           label: 'Gold',          icon: 'gem',           isBuiltin: true, order: 11 },
  { configType: 'category', key: 'FIXED_DEPOSIT',  label: 'Fixed Deposit', icon: 'piggy-bank',    isBuiltin: true, order: 12 },
];
