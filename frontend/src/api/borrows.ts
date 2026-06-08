import client from './client';

export interface BorrowAudit {
  id: string;
  kind: 'given' | 'repaid' | 'interest' | 'writeoff';
  amount: number;
  date: string;
  createdAt: string;
  note: string | null;
}

// A borrow = one BORROW_GIVEN transaction, derived with its repayments/interest.
export interface Borrow {
  id: string;
  personId: string | null;
  person: { id: string; name: string; type: string } | null;
  principal: number;
  date: string;
  note: string | null;
  interestExpected: number;
  settledFlag: boolean;
  principalPaid: number;
  interestPaid: number;
  interestPending: number;
  outstanding: number;
  overReturned: number;
  writtenOff: number;       // settled with money still out
  status: 'ACTIVE' | 'PARTIALLY_RETURNED' | 'SETTLED';
  audit: BorrowAudit[];
}

export interface PersonBorrows {
  person: { id: string; name: string; type: string };
  borrows: Borrow[];
  totalGiven: number;
  totalRepaid: number;
  interestPaid: number;
  outstanding: number;
  interestPending: number;
}

export interface BorrowSummary {
  totalLent: number;
  totalRecovered: number;
  totalOutstanding: number;
  interestPending: number;
  activeCount: number;
}

export const getBorrowGroups = () =>
  client.get<PersonBorrows[]>('/borrows').then(r => r.data);

export const getPersonBorrows = (personId: string) =>
  client.get<Borrow[]>(`/borrows/person/${personId}`).then(r => r.data);

export const getBorrowSummary = () =>
  client.get<BorrowSummary>('/borrows/summary').then(r => r.data);

export const settleBorrow = (id: string) =>
  client.put<{ settled: boolean }>(`/borrows/${id}/settle`).then(r => r.data);

export const unsettleBorrow = (id: string) =>
  client.put<{ settled: boolean }>(`/borrows/${id}/unsettle`).then(r => r.data);
