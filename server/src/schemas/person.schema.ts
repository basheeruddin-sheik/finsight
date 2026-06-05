import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PersonDocument = HydratedDocument<Person>;

@Schema({ timestamps: true, toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Person {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, enum: ['FRIEND', 'FAMILY'] }) type: string;
  @Prop({ default: null }) phone: string;
}

export const PersonSchema = SchemaFactory.createForClass(Person);
