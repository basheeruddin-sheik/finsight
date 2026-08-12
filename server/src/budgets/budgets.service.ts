import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment';
import { Budget, BudgetDocument } from '../schemas/budget.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

function round(n: number) { return Math.round(n * 100) / 100; }

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(Budget.name)      private budgetModel: Model<BudgetDocument>,
    @InjectModel(Transaction.name) private txnModel: Model<TransactionDocument>,
  ) {}

  async findAll(month: string) {
    // UTC — `date` is stored as UTC midnight; a server-local boundary would
    // shift the window by the server's timezone offset.
    const from = moment.utc(month, 'YYYY-MM').startOf('month').valueOf();
    const to   = moment.utc(month, 'YYYY-MM').add(1, 'month').startOf('month').valueOf();

    const [budgets, txns] = await Promise.all([
      this.budgetModel.find({ month }),
      this.txnModel.find({ date: { $gte: from, $lt: to }, type: 'EXPENSE' }),
    ]);

    const spent: Record<string, number> = {};
    for (const t of txns) {
      const cat = t.category ?? 'OTHER';
      spent[cat] = (spent[cat] ?? 0) + t.amount;
    }

    return budgets.map(b => {
      const s = round(spent[b.category] ?? 0);
      const pct = Math.round((s / b.monthlyLimit) * 100);
      return {
        id: (b._id as any).toString(),
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        month: b.month,
        spent: s,
        percentUsed: pct,
        overBudget: pct > 100,
      };
    });
  }

  async create(dto: CreateBudgetDto) {
    await this.budgetModel.findOneAndUpdate(
      { category: dto.category, month: dto.month },
      { monthlyLimit: dto.monthlyLimit },
      { upsert: true, returnDocument: 'after' },
    );
    const all = await this.findAll(dto.month);
    return all.find(b => b.category === dto.category) ?? null;
  }

  async update(id: string, dto: UpdateBudgetDto) {
    const b = await this.budgetModel.findByIdAndUpdate(id, { monthlyLimit: dto.monthlyLimit }, { returnDocument: 'after' });
    if (!b) return null;
    const all = await this.findAll(b.month);
    return all.find(item => item.id === id) ?? null;
  }

  async delete(id: string) {
    await this.budgetModel.findByIdAndDelete(id);
    return { deleted: true };
  }
}
