import type { TransactionType, Category, PaymentMethod } from './types';

export const formatAmount = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN');

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  FAMILY_TRANSFER: 'Family',
  BORROW_GIVEN: 'Borrow Given',
  BORROW_RECEIVED: 'Borrow Received',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  FOOD_DINING: '🍜 Food',
  GROCERIES: '🛒 Groceries',
  SHOPPING: '🛍️ Shopping',
  FUEL_TRAVEL: '⛽ Fuel',
  SUBSCRIPTIONS: '📱 Subscriptions',
  MEDICAL: '💊 Medical',
  ENTERTAINMENT: '🎬 Entertainment',
  UTILITIES: '💡 Utilities',
  OTHER: '💰 Other',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  GPAY: 'GPay',
  PHONEPE: 'PhonePe',
  PAYTM: 'Paytm',
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank',
  OTHER: 'Other',
};

export const TYPE_COLOR: Record<TransactionType, string> = {
  INCOME: 'text-green-600',
  EXPENSE: 'text-red-500',
  FAMILY_TRANSFER: 'text-blue-500',
  BORROW_GIVEN: 'text-orange-500',
  BORROW_RECEIVED: 'text-purple-500',
};
