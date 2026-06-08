import { AsyncLocalStorage } from 'async_hooks';

// Per-request store. `userId` scopes every tenant query; `bypass` disables
// scoping for system operations (seeding, cross-user migration).
export interface RequestStore {
  userId?: string;
  bypass?: boolean;
}

const als = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
  als,
  run<T>(store: RequestStore, fn: () => T): T {
    return als.run(store, fn);
  },
  // Run with tenant scoping disabled — used only for seeding/migration.
  runBypass<T>(fn: () => T): T {
    const current = als.getStore() ?? {};
    return als.run({ ...current, bypass: true }, fn);
  },
  get(): RequestStore | undefined {
    return als.getStore();
  },
  getUserId(): string | undefined {
    return als.getStore()?.userId;
  },
  isBypass(): boolean {
    return als.getStore()?.bypass === true;
  },
};
