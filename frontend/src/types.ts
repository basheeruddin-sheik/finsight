export type TransactionType = string; // dynamic — driven by TypeConfig keys

export type Behavior = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'LEND' | 'RECEIVE_BACK' | 'WRITEOFF' | 'INVEST' | 'DIVEST'
  | 'SPLIT_LEND' | 'SPLIT_COLLECT' | 'SPLIT_OWE' | 'SPLIT_REPAY' | 'ACCOUNT_TRANSFER';

export interface TypeConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  behavior: Behavior;
  hasCategories: boolean;    // show category picker for this type
  requiresPerson: boolean;   // person selection required
  personType: 'FAMILY' | 'FRIEND' | 'ANY';
  isBuiltin: boolean;
  archived?: boolean;
}

export interface CategoryConfig {
  key: string;
  label: string;
  icon: string;
  isBuiltin: boolean;
  archived?: boolean;
}

export interface AppConfig {
  types: TypeConfig[];
  categories: CategoryConfig[];
}
export type PaymentMethod = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'WALLET';

export interface Person {
  id: string;
  name: string;
  type: 'FRIEND' | 'FAMILY';
  phone: string | null;
  archived?: boolean;
}

export interface Account {
  id: string;
  type: 'BANK' | 'WALLET' | 'CASH';
  bank: string;               // key into BANKS or WALLETS (frontend/src/data/banks.ts), depending on `type`
  last4: string | null;
  customName: string | null;  // only meaningful when bank === 'OTHER'
  openingBalance: number;
  balance: number;      // openingBalance + every transaction tagged to this account
  isDefault: boolean;
  archived?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string | null;
  paymentMethod: PaymentMethod;
  personId: string | null;
  note: string | null;
  createdAt: string;
  person: Person | null;
  borrowId?: string | null;
  interestExpected?: number;
  settled?: boolean;
  costBasis?: number;
  splitGroupId?: string | null;
  accountId?: string | null;
  toAccountId?: string | null;
}

export interface TransactionSummary {
  income: number;
  expenses: number;
  familyTransfers: number;
  borrowsGiven: number;
  borrowRecoveries: number;
  investments: number;
  investmentReturns: number;
  splitLent: number;
  splitCollected: number;
  splitRepaid: number;
  costBasisReturned: number;
  realSavings: number;
  savingsRate: number;
  byType: Record<string, number>; // per-type totals for dynamic insights
}

export interface MonthlyBreakdown {
  categories: { category: string; total: number }[];
  paymentMethods: { method: string; total: number }[];
  topCategories: { category: string; total: number }[];
  investments: { category: string; total: number }[]; // net cash deployed per asset (INVEST − DIVEST)
}

export interface CategoryTrend {
  category: string;
  months: { month: string; total: number }[];
}

export interface SavingsRateMonth {
  month: string;
  income: number;
  expenses: number;
  familyTransfers: number;
  realSavings: number;
  savingsRate: number;
  investments: number;
}

export interface MoneyOutside {
  borrowsOutstanding: number;
  splitsOwed: number;
  grandTotal: number;
}

export interface NetWorth {
  netWorth: number;
  cash: number;
  investmentsTotal: number;
  investments: { category: string; amount: number }[];
  borrowsOutstanding: number;
  splitsOwed: number;     // friends owe you (asset)
  splitsOwe: number;      // you owe friends (liability)
  splitsNet: number;      // splitsOwed − splitsOwe
  salesProceeds: number;  // total cash received from investments sold
  salesCost: number;      // original cost basis of what was sold
  realizedGains: number;  // salesProceeds − salesCost (profit/loss booked)
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
  spent: number;
  percentUsed: number;
  overBudget: boolean;
}

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  date: string;
  category?: string;
  paymentMethod: PaymentMethod;
  personId?: string;
  note?: string;
  borrowId?: string;          // repayment / interest → the lend txn it applies to
  interestExpected?: number;  // BORROW_GIVEN only
  costBasis?: number;         // INVESTMENT_RETURN only: original amount invested
  accountId?: string;         // which account this moved money in/out of
}
