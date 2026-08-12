import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Transaction {
  @Prop({ required: true }) type: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true, type: Number }) date: number;   // epoch ms
  @Prop({ default: null }) category: string;
  @Prop({ required: true }) paymentMethod: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Person', default: null }) personId: Types.ObjectId;
  @Prop({ default: null }) note: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction', default: null }) borrowId: Types.ObjectId;
  @Prop({ default: 0 })     interestExpected: number;
  @Prop({ default: false }) settled: boolean;
  @Prop({ default: 0 })     costBasis: number;  // INVESTMENT_RETURN only: original amount invested being returned
  @Prop({ default: null })  splitGroupId: string;  // links the per-friend legs of one shared bill

  // Which bank/cash account this transaction moved money in/out of. Older
  // transactions predate this field and stay null — they're excluded from
  // per-account balances but otherwise unaffected.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Account', default: null }) accountId: Types.ObjectId;
  // ACCOUNT_TRANSFER only: the destination account (accountId is the source).
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Account', default: null }) toAccountId: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.plugin(tenantPlugin);
TransactionSchema.plugin(epochTimestampsPlugin);

// Compound indexes for the two hottest split queries: a friend's full split
// ledger (userId + personId + type) and a type-filtered scan across all
// friends (userId + type) — tenantPlugin injects userId into every query, so
// it leads both indexes. Keeps split balance lookups query-only instead of
// scanning the whole transaction collection as split volume grows.
TransactionSchema.index({ userId: 1, personId: 1, type: 1 });
TransactionSchema.index({ userId: 1, type: 1 });
