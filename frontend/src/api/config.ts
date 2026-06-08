import client from './client';
import type { AppConfig } from '../types';

export const getConfig = (): Promise<AppConfig> =>
  client.get<AppConfig>('/config').then(r => r.data);

// ── Types ─────────────────────────────────────────────────────────────────────
export const addType = (dto: {
  key: string; label: string; icon: string; behavior: string;
  hasCategories: boolean; requiresPerson: boolean; personType: string;
}) => client.post('/config/types', dto).then(r => r.data);

export const archiveType = (key: string) =>
  client.put(`/config/types/${key}/archive`).then(r => r.data);

export const restoreType = (key: string) =>
  client.put(`/config/types/${key}/restore`).then(r => r.data);

export const updateType = (key: string, dto: {
  label?: string; icon?: string; behavior?: string;
  hasCategories?: boolean; requiresPerson?: boolean; personType?: string;
}) => client.patch(`/config/types/${key}`, dto).then(r => r.data);

// ── Categories ────────────────────────────────────────────────────────────────
export const addCategory = (dto: { key: string; label: string; icon: string }) =>
  client.post('/config/categories', dto).then(r => r.data);

export const archiveCategory = (key: string) =>
  client.put(`/config/categories/${key}/archive`).then(r => r.data);

export const restoreCategory = (key: string) =>
  client.put(`/config/categories/${key}/restore`).then(r => r.data);

export const updateCategory = (key: string, dto: { label?: string; icon?: string }) =>
  client.patch(`/config/categories/${key}`, dto).then(r => r.data);
