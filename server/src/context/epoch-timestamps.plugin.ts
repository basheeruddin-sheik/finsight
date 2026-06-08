import { Schema } from 'mongoose';

// Replaces Mongoose's built-in `timestamps: true` (which stores BSON Date) with
// epoch-millisecond Numbers for createdAt and updatedAt. This makes dates
// sortable as plain integers and unambiguous across timezones.
export function epochTimestampsPlugin(schema: Schema) {
  schema.add({
    createdAt: { type: Number, index: true },
    updatedAt: { type: Number },
  });

  // New document — stamp both fields (async style; no `next` in Mongoose 7+).
  schema.pre('save', async function (this: any) {
    const now = Date.now();
    if (this.createdAt == null) this.createdAt = now;
    this.updatedAt = now;
  });

  // insertMany — stamp each doc before insert.
  (schema.pre as any)('insertMany', async function (this: any, docs: any[]) {
    const now = Date.now();
    for (const d of docs) {
      if (d.createdAt == null) d.createdAt = now;
      d.updatedAt = now;
    }
  });

  // Update operations — always bump updatedAt.
  const UPDATE_OPS = [
    'updateOne', 'updateMany',
    'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
  ] as const;
  for (const op of UPDATE_OPS) {
    schema.pre(op as any, function (this: any) {
      this.set({ updatedAt: Date.now() });
    });
  }
}
