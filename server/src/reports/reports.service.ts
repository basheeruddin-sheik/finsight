import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { BorrowsService } from '../borrows/borrows.service';

function round(n: number) { return Math.round(n * 100) / 100; }
const monthEpoch = (m: moment.Moment) => ({ from: m.clone().startOf('month').valueOf(), to: m.clone().add(1,'month').startOf('month').valueOf() });

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name)   private txnModel: Model<TransactionDocument>,
    @InjectModel(SplitBalance.name)  private splitModel: Model<SplitBalanceDocument>,
    @InjectModel(Config.name)        private configModel: Model<ConfigDocument>,
    private borrows: BorrowsService,
  ) {}

  private async getBehaviorMap(): Promise<Map<string, string>> {
    const types = await this.configModel.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }

  private async getExpenseTypeKeys(): Promise<string[]> {
    const types = await this.configModel.find({ configType: 'type', behavior: 'EXPENSE' });
    return types.map(t => t.key);
  }

  async getMonthlyBreakdown(month: string) {
    const { from, to } = monthEpoch(moment(month, 'YYYY-MM'));
    const expenseKeys = await this.getExpenseTypeKeys();
    const txns = await this.txnModel.find({ date: { $gte: from, $lt: to }, type: { $in: expenseKeys } });

    const byCategory: Record<string, number> = {};
    const byPayment:  Record<string, number> = {};
    for (const t of txns) {
      const cat = t.category ?? 'OTHER';
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
      byPayment[t.paymentMethod] = (byPayment[t.paymentMethod] ?? 0) + t.amount;
    }

    const categories = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total: round(total) }))
      .sort((a, b) => b.total - a.total);
    const paymentMethods = Object.entries(byPayment)
      .map(([method, total]) => ({ method, total: round(total) }))
      .sort((a, b) => b.total - a.total);

    return { categories, paymentMethods, topCategories: categories.slice(0, 3) };
  }

  async getCategoryTrend(category: string) {
    const months: { month: string; total: number }[] = [];
    const expenseKeys = await this.getExpenseTypeKeys();
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, 'months');
      const { from, to } = monthEpoch(m);
      const label = m.format('YYYY-MM');
      const txns = await this.txnModel.find({ date: { $gte: from, $lt: to }, type: { $in: expenseKeys }, category });
      months.push({ month: label, total: round(txns.reduce((s, t) => s + t.amount, 0)) });
    }
    return { category, months };
  }

  async getSavingsRateTrend(monthsCount: number) {
    const result: any[] = [];
    const behaviorMap = await this.getBehaviorMap();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const m = moment().subtract(i, 'months');
      const { from, to } = monthEpoch(m);
      const label = m.format('YYYY-MM');
      const txns = await this.txnModel.find({ date: { $gte: from, $lt: to } });

      const totals: Record<string, number> = {};
      for (const t of txns) {
        const beh = behaviorMap.get(t.type) ?? 'EXPENSE';
        totals[beh] = (totals[beh] ?? 0) + t.amount;
      }

      const income    = totals['INCOME']       ?? 0;
      const expenses  = totals['EXPENSE']      ?? 0;
      const transfers = totals['TRANSFER']     ?? 0;
      const lent      = totals['LEND']         ?? 0;
      const received  = totals['RECEIVE_BACK'] ?? 0;
      const realSavings = income - expenses - transfers + received - lent;
      const savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;

      result.push({ month: label, income: round(income), expenses: round(expenses), familyTransfers: round(transfers), realSavings: round(realSavings), savingsRate });
    }
    return result;
  }

  async getMoneyOutside() {
    const { totalOutstanding: borrowsOutstanding, interestPending } = await this.borrows.getSummary();

    const splits = await this.splitModel.find();
    const splitsOwed = splits.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);

    return {
      borrowsOutstanding: round(borrowsOutstanding + interestPending),
      splitsOwed: round(splitsOwed),
      grandTotal: round(borrowsOutstanding + interestPending + splitsOwed),
    };
  }
}
