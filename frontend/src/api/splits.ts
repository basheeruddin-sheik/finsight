import client from './client';

export interface SplitBalance {
  personId: string;
  name: string;
  balance: number;      // signed: + = they owe you, − = you owe them
  lastDate: number;
}

export interface SplitEntry {
  id: string;
  type: string;
  behavior: string;
  amount: number;       // always positive (raw)
  signed: number;       // + = adds to what they owe you, − = adds to what you owe
  date: number;
  note: string | null;
  splitGroupId: string | null;
}

export interface SplitDetail {
  personId: string;
  balance: number;
  entries: SplitEntry[];
}

export interface SplitLeg { personId: string; amount: number; }

export const getSplits = () =>
  client.get<SplitBalance[]>('/splits').then(r => r.data);

export const getSplitDetail = (personId: string) =>
  client.get<SplitDetail>(`/splits/person/${personId}`).then(r => r.data);

// Create the legs of a shared bill. iPaid=true → friends owe you; false → you owe the payer.
export const createSplitGroup = (body: { iPaid: boolean; legs: SplitLeg[]; note?: string; date?: string; myShare?: number; myShareCategory?: string; category?: string; accountId?: string }) =>
  client.post<{ created: number }>('/splits/group', body).then(r => r.data);

// Omit amount to clear the full balance; pass it for a partial settlement.
export const settleSplit = (personId: string, amount: number | undefined, accountId: string, date?: string) =>
  client.post<SplitDetail>('/splits/settle', { personId, amount, accountId, date }).then(r => r.data);

export const deleteSplitEntry = (id: string) =>
  client.delete(`/splits/entry/${id}`).then(r => r.data);

export const deleteSplitGroup = (groupId: string) =>
  client.delete(`/splits/group/${groupId}`).then(r => r.data);
