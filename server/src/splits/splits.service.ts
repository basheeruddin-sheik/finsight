import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';

@Injectable()
export class SplitsService {
  constructor(@InjectModel(SplitBalance.name) private model: Model<SplitBalanceDocument>) {}

  async findAll() {
    const docs = await this.model.find().populate('personId').sort({ 'personId.name': 1 });
    return docs.map(s => {
      const person = s.personId && typeof s.personId === 'object' ? (s.personId as any) : null;
      return {
        id: (s._id as any).toString(),
        personId: person ? person._id.toString() : s.personId.toString(),
        name: person?.name ?? 'Unknown',
        balance: s.balance,
        source: s.source,
        lastSyncedAt: s.lastSyncedAt ?? null,
      };
    });
  }

  async setManual(personId: string, balance: number) {
    const oid = new Types.ObjectId(personId);
    await this.model.findOneAndUpdate(
      { personId: oid },
      { balance, source: 'MANUAL', lastSyncedAt: new Date() },
      { upsert: true, new: true },
    );
    const all = await this.findAll();
    return all.find(s => s.personId === personId) ?? null;
  }
}
