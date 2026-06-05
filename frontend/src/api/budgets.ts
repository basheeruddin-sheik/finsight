import client from './client';
import type { Budget } from '../types';

export const getBudgets = (month: string): Promise<Budget[]> =>
  client.get('/budgets', { params: { month } }).then(r => r.data);

export const createBudget = (data: { category: string; monthlyLimit: number; month: string }): Promise<Budget> =>
  client.post('/budgets', data).then(r => r.data);

export const updateBudget = (id: number, monthlyLimit: number): Promise<Budget> =>
  client.put(`/budgets/${id}`, { monthlyLimit }).then(r => r.data);

export const deleteBudget = (id: number): Promise<void> =>
  client.delete(`/budgets/${id}`).then(r => r.data);
