import client from './client';

export interface Borrow {
  id: string;
  personId: string;
  principal: number;
  interestRate: number;
  startDate: string;
  status: string;
  totalPaid: number;
  interestOwed: number;
  totalOwed: number;
  person: { id: string; name: string; type: string };
  payments: { id: string; amount: number; date: string; note: string | null }[];
}

export interface BorrowSummary {
  totalLent: number;
  totalRecovered: number;
  totalOutstanding: number;
  activeCount: number;
}

export const getBorrows = (status?: string) =>
  client.get<Borrow[]>('/borrows', { params: status ? { status } : undefined }).then(r => r.data);

export const createBorrow = (dto: { personId: string; principal: number; interestRate: number; startDate: string }) =>
  client.post<Borrow>('/borrows', dto).then(r => r.data);

export const addPayment = (id: string, dto: { amount: number; date: string; note?: string }) =>
  client.post<Borrow>(`/borrows/${id}/payment`, dto).then(r => r.data);

export const settleBorrow = (id: string) =>
  client.put<Borrow>(`/borrows/${id}/settle`).then(r => r.data);

export const getBorrowSummary = () =>
  client.get<BorrowSummary>('/borrows/summary').then(r => r.data);

export const deleteBorrow = (id: string) =>
  client.delete(`/borrows/${id}`).then(r => r.data);
