import client from './client';
import type { Person } from '../types';

export const getPersons = (type?: string, archived?: boolean) =>
  client.get<Person[]>('/persons', {
    params: { ...(type ? { type } : {}), ...(archived ? { archived: 'true' } : {}) },
  }).then(r => r.data);

export const createPerson = (dto: { name: string; type: string; phone?: string }) =>
  client.post<Person>('/persons', dto).then(r => r.data);

export const updatePerson = (id: string, dto: { name: string; type: string; phone?: string }) =>
  client.put<Person>(`/persons/${id}`, dto).then(r => r.data);

// Soft delete / restore
export const archivePerson = (id: string) =>
  client.put<Person>(`/persons/${id}/archive`).then(r => r.data);

export const restorePerson = (id: string) =>
  client.put<Person>(`/persons/${id}/restore`).then(r => r.data);

export const deletePerson = (id: string) =>
  client.delete(`/persons/${id}`).then(r => r.data);
