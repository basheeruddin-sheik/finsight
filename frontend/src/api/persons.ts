import client from './client';
import type { Person } from '../types';

export const getPersons = (type?: string) =>
  client.get<Person[]>('/persons', { params: type ? { type } : undefined }).then(r => r.data);

export const createPerson = (dto: { name: string; type: string; phone?: string }) =>
  client.post<Person>('/persons', dto).then(r => r.data);

export const deletePerson = (id: string) =>
  client.delete(`/persons/${id}`).then(r => r.data);
