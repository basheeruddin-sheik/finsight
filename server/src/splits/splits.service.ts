import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';

function round(n: number) { return Math.round(n * 100) / 100; }

// Split behaviours, from the "what this friend owes you" perspective:
//   SPLIT_LEND    +  (you paid their share → they owe you)
//   SPLIT_COLLECT −  (they repaid you)
//   SPLIT_OWE     −  (they paid your share → you owe them)
//   SPLIT_REPAY   +  (you paid them back)
const SIGN: Record<string, number> = {
  SPLIT_LEND: +1, SPLIT_COLLECT: -1, SPLIT_OWE: -1, SPLIT_REPAY: +1,
};
const SPLIT_BEHAVIORS = Object.keys(SIGN);

@Injectable()
export class SplitsService {
  constructor(
    @InjectModel(Transaction.name) private txnModel: Model<TransactionDocument>,
    @InjectModel(Config.name)      private configModel: Model<ConfigDocument>,
  ) {}

  private async behaviorMap() {
    const types = await this.configModel.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }

  // Type keys for each split behaviour (so we can create the right transaction type).
  private async typeForBehavior() {
    const types = await this.configModel.find({ configType: 'type', behavior: { $in: SPLIT_BEHAVIORS } });
    return new Map(types.map(t => [t.behavior, t.key]));
  }

  private async splitTxns() {
    const beh = await this.behaviorMap();
    const all = await this.txnModel.find().populate('personId').sort({ date: -1, createdAt: -1 });
    return all.filter(t => SPLIT_BEHAVIORS.includes(beh.get(t.type) ?? ''))
      .map(t => ({ doc: t, behavior: beh.get(t.type)! }));
  }

  // One balance row per friend with a non-zero net.
  async findAll() {
    const splits = await this.splitTxns();
    const byPerson = new Map<string, { name: string; balance: number; lastDate: number }>();
    for (const { doc, behavior } of splits) {
      const person = doc.personId && typeof doc.personId === 'object' ? (doc.personId as any) : null;
      const pid = person ? person._id.toString() : doc.personId?.toString();
      if (!pid) continue;
      const cur = byPerson.get(pid) ?? { name: person?.name ?? 'Unknown', balance: 0, lastDate: 0 };
      cur.balance += SIGN[behavior] * doc.amount;
      cur.lastDate = Math.max(cur.lastDate, doc.date ?? 0);
      byPerson.set(pid, cur);
    }
    return [...byPerson.entries()]
      .map(([personId, { name, balance, lastDate }]) => ({ personId, name, balance: round(balance), lastDate }))
      .filter(s => Math.abs(s.balance) >= 0.01)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Per-friend ledger + derived balance.
  async findByPerson(personId: string) {
    const beh = await this.behaviorMap();
    const oid = new Types.ObjectId(personId);
    const docs = await this.txnModel.find({ personId: oid }).sort({ date: -1, createdAt: -1 });
    const entries = docs
      .filter(d => SPLIT_BEHAVIORS.includes(beh.get(d.type) ?? ''))
      .map(d => {
        const behavior = beh.get(d.type)!;
        return {
          id: (d._id as any).toString(),
          type: d.type,
          behavior,
          amount: d.amount,
          signed: round(SIGN[behavior] * d.amount),
          date: d.date,
          note: d.note ?? null,
          splitGroupId: d.splitGroupId ?? null,
        };
      });
    const balance = round(entries.reduce((s, e) => s + e.signed, 0));
    return { personId, balance, entries };
  }

  // Create the legs of a shared bill.
  //   iPaid=true  → each leg is a friend who owes you their share (SPLIT_PAID)
  //   iPaid=false → each leg is a friend who paid your share, so you owe them (SPLIT_OWED)
  async createGroup(body: {
    iPaid: boolean;
    legs: { personId: string; amount: number }[];
    note?: string;
    date?: number;
  }) {
    const typeFor = await this.typeForBehavior();
    const typeKey = body.iPaid ? typeFor.get('SPLIT_LEND') : typeFor.get('SPLIT_OWE');
    if (!typeKey) throw new Error('Split types are not configured');

    const date = body.date ?? Date.now();
    const groupId = body.legs.length > 1 ? randomUUID() : undefined;
    const valid = body.legs.filter(l => l.personId && l.amount > 0);

    await Promise.all(valid.map(l => this.txnModel.create({
      type: typeKey,
      amount: round(l.amount),
      date,
      paymentMethod: 'CASH',
      personId: new Types.ObjectId(l.personId),
      note: body.note ?? undefined,
      splitGroupId: groupId,
    })));

    return { created: valid.length };
  }

  // Settle a friend — posts the matching cash transaction toward the balance.
  // Pass `amount` for a partial settlement; omit it to clear the full balance.
  async settle(personId: string, amount?: number) {
    const { balance } = await this.findByPerson(personId);
    const max = Math.abs(balance);
    if (max < 0.01) return this.findByPerson(personId);
    const amt = round(amount && amount > 0 ? Math.min(amount, max) : max);
    const typeFor = await this.typeForBehavior();
    // balance > 0: they owe you → you collect (SPLIT_COLLECT)
    // balance < 0: you owe them → you repay  (SPLIT_REPAY)
    const typeKey = balance > 0 ? typeFor.get('SPLIT_COLLECT') : typeFor.get('SPLIT_REPAY');
    if (!typeKey) throw new Error('Split types are not configured');
    await this.txnModel.create({
      type: typeKey,
      amount: amt,
      date: Date.now(),
      paymentMethod: 'CASH',
      personId: new Types.ObjectId(personId),
      note: amt < max ? 'Partial settle' : 'Settled up',
    });
    return this.findByPerson(personId);
  }

  async deleteEntry(id: string) {
    await this.txnModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async deleteGroup(splitGroupId: string) {
    const res = await this.txnModel.deleteMany({ splitGroupId });
    return { deleted: res.deletedCount ?? 0 };
  }

  // Net split position for net-worth / reports.
  async getNetPosition() {
    const balances = await this.findAll();
    let owedToUser = 0, userOwes = 0;
    for (const b of balances) {
      if (b.balance > 0) owedToUser += b.balance;
      else               userOwes  += -b.balance;
    }
    return { owedToUser: round(owedToUser), userOwes: round(userOwes), net: round(owedToUser - userOwes) };
  }
}
