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
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.plugin(tenantPlugin);
TransactionSchema.plugin(epochTimestampsPlugin);
