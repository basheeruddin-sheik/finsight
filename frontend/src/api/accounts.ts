import client from './client';
import type { Account } from '../types';

export const getAccounts = (archived?: boolean) =>
  client.get<Account[]>('/accounts', { params: archived ? { archived: 'true' } : {} }).then(r => r.data);

export const createAccount = (dto: { bank: string; last4?: string; customName?: string; openingBalance?: number; isDefault?: boolean }) =>
  client.post<Account>('/accounts', dto).then(r => r.data);

export const updateAccount = (id: string, dto: { bank?: string; last4?: string; customName?: string; openingBalance?: number }) =>
  client.put<Account>(`/accounts/${id}`, dto).then(r => r.data);

export const setDefaultAccount = (id: string) =>
  client.put<{ defaulted: boolean }>(`/accounts/${id}/default`).then(r => r.data);

export const archiveAccount = (id: string) =>
  client.put<Account>(`/accounts/${id}/archive`).then(r => r.data);

export const restoreAccount = (id: string) =>
  client.put<Account>(`/accounts/${id}/restore`).then(r => r.data);

export const deleteAccount = (id: string) =>
  client.delete(`/accounts/${id}`).then(r => r.data);

export const transferBetweenAccounts = (dto: { fromAccountId: string; toAccountId: string; amount: number; note?: string; date?: string }) =>
  client.post<{ transferred: boolean }>('/accounts/transfer', dto).then(r => r.data);
