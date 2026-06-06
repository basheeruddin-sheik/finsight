export type TransactionType = string; // dynamic — driven by TypeConfig keys

export type Behavior = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'LEND' | 'RECEIVE_BACK';

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
}

export interface CategoryConfig {
  key: string;
  label: string;
  icon: string;
  isBuiltin: boolean;
}

export interface AppConfig {
  types: TypeConfig[];
  categories: CategoryConfig[];
}
export type Category = 'FOOD_DINING' | 'GROCERIES' | 'SHOPPING' | 'FUEL_TRAVEL' | 'SUBSCRIPTIONS' | 'MEDICAL' | 'ENTERTAINMENT' | 'UTILITIES' | 'OTHER';
export type PaymentMethod = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface Person {
  id: string;
  name: string;
  type: 'FRIEND' | 'FAMILY';
  phone: string | null;
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
}

export interface TransactionSummary {
  income: number;
  expenses: number;
  familyTransfers: number;
  borrowsGiven: number;
  borrowRecoveries: number;
  realSavings: number;
  savingsRate: number;
  byType: Record<string, number>; // per-type totals for dynamic insights
}

export interface MonthlyBreakdown {
  categories: { category: string; total: number }[];
  paymentMethods: { method: string; total: number }[];
  topCategories: { category: string; total: number }[];
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
}

export interface MoneyOutside {
  borrowsOutstanding: number;
  splitsOwed: number;
  grandTotal: number;
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
}
