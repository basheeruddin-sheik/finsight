import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type BorrowDocument = HydratedDocument<Borrow>;

@Schema({ timestamps: true, toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Borrow {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Person', required: true }) personId: Types.ObjectId;
  @Prop({ required: true }) principal: number;
  @Prop({ default: 0 }) interestRate: number;
  @Prop({ required: true }) startDate: Date;
  @Prop({ required: true, default: 'ACTIVE' }) status: string;
}

export const BorrowSchema = SchemaFactory.createForClass(Borrow);

BorrowSchema.virtual('payments', {
  ref: 'BorrowPayment',
  localField: '_id',
  foreignField: 'borrowId',
  options: { sort: { date: -1 } },
});
