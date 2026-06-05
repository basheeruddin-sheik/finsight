import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
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
  constructor(@InjectModel(Transaction.name) private model: Model<TransactionDocument>) {}

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
    if (dto.date)     update.date = new Date(dto.date);
    if (dto.personId !== undefined) update.personId = dto.personId ? new Types.ObjectId(dto.personId) : null;
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
    const txns = await this.model.find({ date: { $gte: from, $lt: to } });

    let income = 0, expenses = 0, familyTransfers = 0, borrowsGiven = 0, borrowRecoveries = 0;
    for (const t of txns) {
      switch (t.type) {
        case 'INCOME':           income           += t.amount; break;
        case 'EXPENSE':          expenses         += t.amount; break;
        case 'FAMILY_TRANSFER':  familyTransfers  += t.amount; break;
        case 'BORROW_GIVEN':     borrowsGiven     += t.amount; break;
        case 'BORROW_RECEIVED':  borrowRecoveries += t.amount; break;
      }
    }
    const realSavings = income - expenses - familyTransfers + borrowRecoveries - borrowsGiven;
    const savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;
    return { income, expenses, familyTransfers, borrowsGiven, borrowRecoveries, realSavings, savingsRate };
  }
}
