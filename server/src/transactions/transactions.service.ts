import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

function toRes(doc: any) {
  const t = doc.toJSON ? doc.toJSON() : doc;
  const person = t.personId && typeof t.personId === 'object' && t.personId.name
    ? { id: t.personId._id?.toString() ?? t.personId.id, name: t.personId.name, type: t.personId.type }
    : null;
  return {
    id: t.id ?? t._id?.toString(),
    type: t.type,
    amount: t.amount,
    date: t.date,
    category: t.category ?? null,
    paymentMethod: t.paymentMethod,
    personId: person ? person.id : (t.personId?.toString() ?? null),
    person,
    note: t.note ?? null,
    createdAt: t.createdAt,
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private model: Model<TransactionDocument>,
    @InjectModel(Config.name)      private configModel: Model<ConfigDocument>,
  ) {}

  async findAll(filters: { type?: string; category?: string; from?: string; to?: string; search?: string }) {
    const where: any = {};
    if (filters.type)     where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.search)   where.note = { $regex: filters.search, $options: 'i' };
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.$gte = new Date(filters.from);
      if (filters.to)   where.date.$lte = new Date(filters.to);
    }
    const docs = await this.model.find(where).populate('personId').sort({ date: -1 });
    return docs.map(toRes);
  }

  async create(dto: CreateTransactionDto) {
    const created = await this.model.create({
      ...dto,
      date: new Date(dto.date),
      personId: dto.personId ? new Types.ObjectId(dto.personId) : undefined,
    });
    const doc = await this.model.findById(created._id).populate('personId');
    return toRes(doc!);
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const update: any = { ...dto };
    if (dto.date)                    update.date = new Date(dto.date);
    if (dto.personId !== undefined)  update.personId = dto.personId ? new Types.ObjectId(dto.personId) : null;
    const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).populate('personId');
    return toRes(doc!);
  }

  async delete(id: string) {
    await this.model.findByIdAndDelete(id);
    return { deleted: true };
  }

  async getSummary(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to   = new Date(year, mon, 1);

    const [txns, typeConfigs] = await Promise.all([
      this.model.find({ date: { $gte: from, $lt: to } }),
      this.configModel.find({ configType: 'type' }),
    ]);

    // Build behavior map: typeKey → behavior
    const behaviorMap = new Map(typeConfigs.map(t => [t.key, t.behavior]));

    // Accumulate by behavior
    const totals: Record<string, number> = {};
    for (const t of txns) {
      const beh = behaviorMap.get(t.type) ?? 'EXPENSE';
      totals[beh] = (totals[beh] ?? 0) + t.amount;
    }

    const income      = totals['INCOME']       ?? 0;
    const expenses    = totals['EXPENSE']      ?? 0;
    const transfers   = totals['TRANSFER']     ?? 0;
    const lent        = totals['LEND']         ?? 0;
    const received    = totals['RECEIVE_BACK'] ?? 0;

    const realSavings = income - expenses - transfers + received - lent;
    const savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;

    return {
      income,
      expenses,
      familyTransfers: transfers,
      borrowsGiven:    lent,
      borrowRecoveries: received,
      realSavings,
      savingsRate,
      // Per-type breakdown for detailed insights
      byType: Object.fromEntries(
        typeConfigs.map(t => [t.key, txns.filter(x => x.type === t.key).reduce((s, x) => s + x.amount, 0)])
      ),
    };
  }
}
