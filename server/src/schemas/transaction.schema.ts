import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true, toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Transaction {
  @Prop({ required: true }) type: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) date: Date;
  @Prop({ default: null }) category: string;
  @Prop({ required: true }) paymentMethod: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Person', default: null }) personId: Types.ObjectId;
  @Prop({ default: null }) note: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
