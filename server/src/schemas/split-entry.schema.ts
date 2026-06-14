import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type SplitEntryDocument = HydratedDocument<SplitEntry>;

// A single shared-expense event between the user and a friend.
// `amount` is signed from the USER's perspective:
//   + → the friend owes the user (user paid, friend's share)
//   − → the user owes the friend (friend paid, user's share)
// A person's net balance is the running sum of their entries.
@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class SplitEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Person', required: true }) personId: Types.ObjectId;
  @Prop({ required: true }) amount: number;            // signed (see above)
  @Prop({ required: true, type: Number }) date: number; // epoch ms
  @Prop({ default: null }) note: string;
  @Prop({ default: 'SPLIT' }) kind: string;            // 'SPLIT' | 'SETTLE' | 'OPENING'
}

export const SplitEntrySchema = SchemaFactory.createForClass(SplitEntry);
SplitEntrySchema.plugin(tenantPlugin);
SplitEntrySchema.plugin(epochTimestampsPlugin);
SplitEntrySchema.index({ userId: 1, personId: 1 });
