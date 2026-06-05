import type { TransactionType } from './types';

export const BUILTIN_CATEGORIES: { key: string; label: string }[] = [
  { key: 'FOOD_DINING',    label: '🍜 Food' },
  { key: 'GROCERIES',      label: '🛒 Groceries' },
  { key: 'SHOPPING',       label: '🛍️ Shopping' },
  { key: 'FUEL_TRAVEL',    label: '⛽ Fuel / Travel' },
  { key: 'SUBSCRIPTIONS',  label: '📱 Subscriptions' },
  { key: 'MEDICAL',        label: '💊 Medical' },
  { key: 'ENTERTAINMENT',  label: '🎬 Entertainment' },
  { key: 'UTILITIES',      label: '💡 Utilities' },
  { key: 'OTHER',          label: '💰 Other' },
];

export const DEFAULT_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  FAMILY_TRANSFER: 'Family',
  BORROW_GIVEN: 'Borrow Given',
  BORROW_RECEIVED: 'Borrow Received',
};

export interface AppSettings {
  customCategories: string[];
  typeLabels: Record<TransactionType, string>;
}

const KEY = 'finsight_settings';

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        customCategories: Array.isArray(p.customCategories) ? p.customCategories : [],
        typeLabels: { ...DEFAULT_TYPE_LABELS, ...(p.typeLabels ?? {}) },
      };
    }
  } catch {}
  return { customCategories: [], typeLabels: { ...DEFAULT_TYPE_LABELS } };
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getCategoryLabel(key: string): string {
  return BUILTIN_CATEGORIES.find(c => c.key === key)?.label ?? key;
}
