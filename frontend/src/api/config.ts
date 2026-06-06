import client from './client';
import type { AppConfig } from '../types';

export const getConfig = (): Promise<AppConfig> =>
  client.get<AppConfig>('/config').then(r => r.data);

// ── Types ─────────────────────────────────────────────────────────────────────
export const addType = (dto: {
  key: string; label: string; icon: string; behavior: string;
  hasCategories: boolean; requiresPerson: boolean; personType: string;
}) => client.post('/config/types', dto).then(r => r.data);

export const deleteType = (key: string) =>
  client.delete(`/config/types/${key}`).then(r => r.data);

export const updateType = (key: string, dto: {
  label?: string; icon?: string; behavior?: string;
  hasCategories?: boolean; requiresPerson?: boolean; personType?: string;
}) => client.patch(`/config/types/${key}`, dto).then(r => r.data);

// ── Categories ────────────────────────────────────────────────────────────────
export const addCategory = (dto: { key: string; label: string; icon: string }) =>
  client.post('/config/categories', dto).then(r => r.data);

export const deleteCategory = (key: string) =>
  client.delete(`/config/categories/${key}`).then(r => r.data);

export const updateCategory = (key: string, dto: { label?: string; icon?: string }) =>
  client.patch(`/config/categories/${key}`, dto).then(r => r.data);
