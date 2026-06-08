import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type ConfigDocument = HydratedDocument<Config>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Config {
  @Prop({ required: true }) configType: string;
  @Prop({ required: true }) key: string;
  @Prop({ required: true }) label: string;
  @Prop({ required: true }) icon: string;
  @Prop({ default: '' })    color: string;
  @Prop({ default: '' })    behavior: string;
  @Prop({ default: false }) hasCategories: boolean;
  @Prop({ default: false }) requiresPerson: boolean;
  @Prop({ default: 'ANY' }) personType: string;
  @Prop({ default: false }) isBuiltin: boolean;
  @Prop({ default: false }) archived: boolean;
  @Prop({ default: 0 })     order: number;
}

export const ConfigSchema = SchemaFactory.createForClass(Config);
ConfigSchema.plugin(tenantPlugin);
ConfigSchema.plugin(epochTimestampsPlugin);
ConfigSchema.index({ userId: 1, configType: 1, key: 1 }, { unique: true });
