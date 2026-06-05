export type TransactionType = 'INCOME' | 'EXPENSE' | 'FAMILY_TRANSFER' | 'BORROW_GIVEN' | 'BORROW_RECEIVED';
export type Category = 'FOOD_DINING' | 'GROCERIES' | 'SHOPPING' | 'FUEL_TRAVEL' | 'SUBSCRIPTIONS' | 'MEDICAL' | 'ENTERTAINMENT' | 'UTILITIES' | 'OTHER';
export type PaymentMethod = 'GPAY' | 'PHONEPE' | 'PAYTM' | 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface Person {
  id: number;
  name: string;
  type: 'FRIEND' | 'FAMILY';
  phone: string | null;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  category: Category | null;
  paymentMethod: PaymentMethod;
  personId: number | null;
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
  id: number;
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
  category?: Category;
  paymentMethod: PaymentMethod;
  personId?: number;
  note?: string;
}
