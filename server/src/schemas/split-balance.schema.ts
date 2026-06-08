import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type SplitBalanceDocument = HydratedDocument<SplitBalance>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class SplitBalance {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Person', required: true }) personId: Types.ObjectId;
  @Prop({ required: true }) balance: number;
  @Prop({ default: 'MANUAL' }) source: string;
  @Prop({ type: Number, default: null }) lastSyncedAt: number | null;  // epoch ms
}

export const SplitBalanceSchema = SchemaFactory.createForClass(SplitBalance);
SplitBalanceSchema.plugin(tenantPlugin);
SplitBalanceSchema.plugin(epochTimestampsPlugin);
SplitBalanceSchema.index({ userId: 1, personId: 1 }, { unique: true });
