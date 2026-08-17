import moment from 'moment';
import type { TransactionType, PaymentMethod, Transaction } from './types';

export const formatAmount = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN');

// Current month as YYYY-MM.
export const currentMonth = () => moment().format('YYYY-MM');

// "8 Jun" — used on transaction rows. UTC-based: `date` is a day-only value
// (stored as UTC midnight), so extracting it via local-timezone conversion
// can land on a different calendar day than the one that was actually stored.
export const formatDate = (iso: string) => moment.utc(iso).format('D MMM');

// "2:34:56 pm" — time of day with seconds, for transaction rows.
export const formatTime = (iso: string) => moment(iso).format('h:mm:ss a');

// "8 Jun 2026, 2:34:56 pm" — full date+time for detail sheets.
export const formatDateTime = (iso: string) => moment(iso).format('D MMM YYYY, h:mm:ss a');

// "Sat, 1 Aug 2026" — UTC-based, so it always agrees with the plain
// YYYY-MM-DD day an edit form derives via `iso.substring(0, 10)`. `date` is
// stored as a day-only value (UTC midnight), so reading it back through the
// browser's local timezone (moment(iso) / new Date(iso).toLocaleDateString())
// can land on a different calendar day than the stored one.
export const formatDateLongUTC = (iso: string) => moment.utc(iso).format('ddd, D MMM YYYY');

// Relative day header: "Today" / "Yesterday" / "Monday, 2 Jun". Compares the
// UTC calendar day the date represents against the viewer's local "today" —
// string comparison, not epoch diffing, so mixing UTC/local moments can't
// introduce an off-by-one.
export const dayLabel = (iso: string) => {
  const key      = moment.utc(iso).format('YYYY-MM-DD');
  const todayKey = moment().format('YYYY-MM-DD');
  const yestKey  = moment().subtract(1, 'day').format('YYYY-MM-DD');
  if (key === todayKey) return 'Today';
  if (key === yestKey)  return 'Yesterday';
  return moment.utc(iso).format('dddd, D MMM');
};

// Group a sorted list into [{ key, label, items }] by calendar day. UTC-based
// (see formatDate) so a `date` value always groups under the day it was
// actually stored as, regardless of the viewer's timezone.
export function groupByDay<T extends { date: string }>(items: T[]) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const it of items) {
    const key = moment.utc(it.date).format('YYYY-MM-DD');
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

// Last day before the current month started — used to check whether a user has
// any history at all (incl. backdated opening-balance entries), so "no
// transactions yet this month" isn't mistaken for "brand new user".
export function dayBeforeCurrentMonth() {
  return moment().startOf('month').subtract(1, 'day').format('YYYY-MM-DD');
}

// First/last day of an arbitrary YYYY-MM month (unlike monthRange, which is
// relative to today) — used by month-navigable pages like Splits.
export function monthRangeFor(month: string) {
  const m = moment(month, 'YYYY-MM');
  return { from: m.clone().startOf('month').format('YYYY-MM-DD'), to: m.clone().endOf('month').format('YYYY-MM-DD') };
}

// A bill split between several friends creates one transaction leg per
// person (plus, if you included yourself, a plain EXPENSE leg with no
// person for your own share), all sharing the same splitGroupId. Collapse
// those into a single feed item instead of one per leg. Keeps every leg so
// the caller can pick a representative one (a friend leg, not your EXPENSE)
// for icon/sign, and can drill into an individual leg to view/edit it.
export type FeedItem =
  | { kind: 'txn'; t: Transaction }
  | { kind: 'splitGroup'; groupId: string; legs: Transaction[] };

export function collapseSplitGroups(items: Transaction[]): FeedItem[] {
  const order: FeedItem[] = [];
  const groups = new Map<string, Transaction[]>();
  for (const t of items) {
    if (t.splitGroupId) {
      let legs = groups.get(t.splitGroupId);
      if (!legs) {
        legs = [];
        groups.set(t.splitGroupId, legs);
        order.push({ kind: 'splitGroup', groupId: t.splitGroupId, legs });
      }
      legs.push(t);
    } else {
      order.push({ kind: 'txn', t });
    }
  }
  return order;
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
  WALLET: 'Wallet',
};

export const TYPE_COLOR: Record<TransactionType, string> = {
  INCOME: 'text-green-600',
  EXPENSE: 'text-red-500',
  FAMILY_TRANSFER: 'text-blue-500',
  BORROW_GIVEN: 'text-orange-500',
  BORROW_RECEIVED: 'text-purple-500',
};
