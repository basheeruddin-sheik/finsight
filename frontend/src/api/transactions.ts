import client from './client';
import type { Transaction, TransactionSummary, CreateTransactionDto } from '../types';

export const getTransactions = (filters?: {
  type?: string;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
}) => client.get<Transaction[]>('/transactions', { params: filters }).then(r => r.data);

export const createTransaction = (dto: CreateTransactionDto) =>
  client.post<Transaction>('/transactions', dto).then(r => r.data);

export const updateTransaction = (id: string, dto: Partial<CreateTransactionDto>) =>
  client.put<Transaction>(`/transactions/${id}`, dto).then(r => r.data);

export const deleteTransaction = (id: string) =>
  client.delete(`/transactions/${id}`).then(r => r.data);

export const getSummary = (month: string) =>
  client.get<TransactionSummary>('/transactions/summary', { params: { month } }).then(r => r.data);
