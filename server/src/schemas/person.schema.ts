import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type PersonDocument = HydratedDocument<Person>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Person {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, enum: ['FRIEND', 'FAMILY'] }) type: string;
  @Prop({ default: null }) phone: string;
  @Prop({ default: false }) archived: boolean;
}

export const PersonSchema = SchemaFactory.createForClass(Person);
PersonSchema.plugin(tenantPlugin);
PersonSchema.plugin(epochTimestampsPlugin);
