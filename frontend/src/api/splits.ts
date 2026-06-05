import client from './client';

export interface SplitBalance {
  id: number;
  personId: number;
  name: string;
  balance: number;
  source: string;
  lastSyncedAt: string | null;
}

export const getSplits = () =>
  client.get<SplitBalance[]>('/splits').then(r => r.data);

export const setManualSplit = (personId: number, balance: number) =>
  client.post('/splits/manual', { personId, balance }).then(r => r.data);

export const syncSplitwise = () =>
  client.post<{ synced: number; total: number }>('/splits/sync').then(r => r.data);
