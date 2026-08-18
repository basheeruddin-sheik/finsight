import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { tenantPlugin } from '../context/tenant.plugin';
import { epochTimestampsPlugin } from '../context/epoch-timestamps.plugin';

export type AccountDocument = HydratedDocument<Account>;

@Schema({ toJSON: { virtuals: true, transform: (_: any, r: any) => { r.id = r._id?.toString(); delete r._id; delete r.__v; } } })
export class Account {
  @Prop({ default: 'BANK' })         type: string;         // 'BANK' | 'WALLET' | 'CASH' | 'CREDIT_CARD'
  @Prop({ required: true })          bank: string;         // key into the frontend BANKS/WALLETS list, per `type`
  @Prop({ default: null })           last4: string;        // last 4 digits of the account number
  @Prop({ default: null })           customName: string;   // free-text label, only used when bank === 'OTHER' or type === 'CASH'
  @Prop({ default: 0 })              openingBalance: number; // BANK/WALLET/CASH: starting cash. CREDIT_CARD: starting amount already owed.
  @Prop({ default: 0 })              creditLimit: number;    // CREDIT_CARD only
  @Prop({ default: false })          isDefault: boolean;
  @Prop({ default: false })          archived: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.plugin(tenantPlugin);
AccountSchema.plugin(epochTimestampsPlugin);
