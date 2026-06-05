import client from './client';

export interface Borrow {
  id: number;
  personId: number;
  principal: number;
  interestRate: number;
  startDate: string;
  status: string;
  totalPaid: number;
  interestOwed: number;
  totalOwed: number;
  person: { id: number; name: string; type: string };
  payments: { id: number; amount: number; date: string; note: string | null }[];
}

export interface BorrowSummary {
  totalLent: number;
  totalRecovered: number;
  totalOutstanding: number;
  activeCount: number;
}

export const getBorrows = (status?: string) =>
  client.get<Borrow[]>('/borrows', { params: status ? { status } : undefined }).then(r => r.data);

export const createBorrow = (dto: { personId: number; principal: number; interestRate: number; startDate: string }) =>
  client.post<Borrow>('/borrows', dto).then(r => r.data);

export const addPayment = (id: number, dto: { amount: number; date: string; note?: string }) =>
  client.post<Borrow>(`/borrows/${id}/payment`, dto).then(r => r.data);

export const settleBorrow = (id: number) =>
  client.put<Borrow>(`/borrows/${id}/settle`).then(r => r.data);

export const getBorrowSummary = () =>
  client.get<BorrowSummary>('/borrows/summary').then(r => r.data);

export const deleteBorrow = (id: number) =>
  client.delete(`/borrows/${id}`).then(r => r.data);
