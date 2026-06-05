import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type SplitBalanceDocument = HydratedDocument<SplitBalance>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class SplitBalance {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Person', required: true, unique: true }) personId: Types.ObjectId;
  @Prop({ required: true }) balance: number;
  @Prop({ default: 'MANUAL' }) source: string;
  @Prop({ default: null }) lastSyncedAt: Date;
}

export const SplitBalanceSchema = SchemaFactory.createForClass(SplitBalance);
