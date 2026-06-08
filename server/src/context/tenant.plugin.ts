import { Schema } from 'mongoose';
import { RequestContext } from './request-context';

// Multi-tenancy plugin. Applied to every user-owned schema, it:
//   • adds a required `userId` field,
//   • injects `{ userId }` into every query filter,
//   • stamps `userId` on inserts,
// all sourced from the per-request AsyncLocalStorage context.
//
// It FAILS CLOSED: if a query runs without a user in context (and not in an
// explicit bypass), it throws rather than returning another tenant's data.

const QUERY_HOOKS = [
  'count', 'countDocuments', 'find', 'findOne', 'findOneAndUpdate',
  'findOneAndDelete', 'findOneAndReplace', 'updateOne', 'updateMany',
  'deleteOne', 'deleteMany', 'replaceOne', 'distinct',
] as const;

function requireUserId(): string | null {
  if (RequestContext.isBypass()) return null;            // system op — no scoping
  const userId = RequestContext.getUserId();
  if (!userId) throw new Error('Tenant context missing: data access without an authenticated user');
  return userId;
}

export function tenantPlugin(schema: Schema) {
  schema.add({ userId: { type: String, required: true, index: true } });

  for (const hook of QUERY_HOOKS) {
    schema.pre(hook as any, function (this: any) {
      const userId = requireUserId();
      if (!userId) return;                                // bypass
      const cond = this.getQuery();
      if (cond.userId === undefined) this.setQuery({ ...cond, userId });
    });
  }

  // Stamp userId before validation (so the required check passes).
  schema.pre('validate', function (this: any) {
    const userId = requireUserId();
    if (userId && this.userId === undefined) this.userId = userId;
  });

  // Mongoose 9: insertMany pre hook receives (docs) as first arg — no next().
  (schema.pre as any)('insertMany', function (this: any, docs: any[]) {
    const userId = requireUserId();
    if (userId) for (const d of docs) if (d.userId === undefined) d.userId = userId;
  });

  schema.pre('aggregate', function (this: any) {
    const userId = requireUserId();
    if (userId) this.pipeline().unshift({ $match: { userId } });
  });

  // Never expose userId in API responses.
  const existing = schema.get('toJSON') ?? {};
  schema.set('toJSON', {
    ...existing,
    transform(doc: any, ret: any, opts: any) {
      const prevTransform = (existing as any).transform;
      if (typeof prevTransform === 'function') prevTransform(doc, ret, opts);
      delete ret.userId;
      return ret;
    },
  });
}
