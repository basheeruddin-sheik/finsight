import moment from 'moment';
import type { TransactionType, PaymentMethod } from './types';
export { getCategoryLabel } from './settings';

export const formatAmount = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN');

// Current month as YYYY-MM.
export const currentMonth = () => moment().format('YYYY-MM');

// "8 Jun" — used on transaction rows.
export const formatDate = (iso: string) => moment(iso).format('D MMM');

// "2:34:56 pm" — time of day with seconds, for transaction rows.
export const formatTime = (iso: string) => moment(iso).format('h:mm:ss a');

// "8 Jun 2026, 2:34:56 pm" — full date+time for detail sheets.
export const formatDateTime = (iso: string) => moment(iso).format('D MMM YYYY, h:mm:ss a');

// Relative day header: "Today" / "Yesterday" / "Monday, 2 Jun".
export const dayLabel = (iso: string) => {
  const m = moment(iso).startOf('day');
  const today = moment().startOf('day');
  const diff = today.diff(m, 'days');
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return m.format('dddd, D MMM');
};

// Group a sorted list into [{ key, label, items }] by local calendar day.
// Using moment avoids the UTC-vs-local split that broke grouping with new Date().
export function groupByDay<T extends { date: string }>(items: T[]) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const it of items) {
    const key = moment(it.date).format('YYYY-MM-DD');
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, label: dayLabel(it.date), items: [] }; groups.push(g); }
    g.items.push(it);
  }
  return groups;
}

// YYYY-MM-DD string from a moment or native Date.
export const ymd = (d: Date) => moment(d).format('YYYY-MM-DD');

export const todayStr = () => moment().format('YYYY-MM-DD');

// Friendly date for a YYYY-MM-DD picker value.
export const prettyDate = (s: string) => {
  if (!s) return 'Select date';
  const m = moment(s, 'YYYY-MM-DD');
  const diff = moment().startOf('day').diff(m, 'days');
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return m.format('D MMM YYYY');
};

// First/last day of a month offset from now (0 = this month). Returns YYYY-MM-DD strings.
export function monthRange(offset: number) {
  const m = moment().subtract(offset, 'months');
  return { from: m.startOf('month').format('YYYY-MM-DD'), to: m.endOf('month').format('YYYY-MM-DD') };
}

// Date range for an Activity-page period preset.
export type Period = 'this' | 'last' | 'q' | '6m' | 'year' | 'all' | 'custom';
export function periodRange(p: Period): { from?: string; to?: string } {
  const now = moment();
  switch (p) {
    case 'this': return monthRange(0);
    case 'last': return monthRange(1);
    case 'q':    return { from: moment().subtract(2, 'months').startOf('month').format('YYYY-MM-DD'), to: now.endOf('month').format('YYYY-MM-DD') };
    case '6m':   return { from: moment().subtract(5, 'months').startOf('month').format('YYYY-MM-DD'), to: now.endOf('month').format('YYYY-MM-DD') };
    case 'year': return { from: moment().startOf('year').format('YYYY-MM-DD'), to: moment().endOf('year').format('YYYY-MM-DD') };
    default:     return {};
  }
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  FAMILY_TRANSFER: 'Family',
  BORROW_GIVEN: 'Borrow Given',
  BORROW_RECEIVED: 'Borrow Received',
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
