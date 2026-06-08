import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type BudgetDocument = HydratedDocument<Budget>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Budget {
  @Prop({ required: true }) category: string;
  @Prop({ required: true }) monthlyLimit: number;
  @Prop({ required: true }) month: string;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
BudgetSchema.plugin(tenantPlugin);
BudgetSchema.plugin(epochTimestampsPlugin);
BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
