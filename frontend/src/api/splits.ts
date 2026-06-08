import client from './client';

export interface SplitBalance {
  id: string;
  personId: string;
  name: string;
  balance: number;
  source: string;
  lastSyncedAt: string | null;
}

export const getSplits = () =>
  client.get<SplitBalance[]>('/splits').then(r => r.data);

export const setManualSplit = (personId: string, balance: number) =>
  client.post('/splits/manual', { personId, balance }).then(r => r.data);

export const syncSplitwise = () =>
  client.post<{ synced: number; total: number }>('/splits/sync').then(r => r.data);
