import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type BorrowPaymentDocument = HydratedDocument<BorrowPayment>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class BorrowPayment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Borrow', required: true }) borrowId: Types.ObjectId;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) date: Date;
  @Prop({ default: null }) note: string;
}

export const BorrowPaymentSchema = SchemaFactory.createForClass(BorrowPayment);
