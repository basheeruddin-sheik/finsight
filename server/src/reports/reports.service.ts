import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Borrow, BorrowDocument } from '../schemas/borrow.schema';
import { BorrowPayment, BorrowPaymentDocument } from '../schemas/borrow-payment.schema';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';

function round(n: number) { return Math.round(n * 100) / 100; }

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name)   private txnModel: Model<TransactionDocument>,
    @InjectModel(Borrow.name)        private borrowModel: Model<BorrowDocument>,
    @InjectModel(BorrowPayment.name) private paymentModel: Model<BorrowPaymentDocument>,
    @InjectModel(SplitBalance.name)  private splitModel: Model<SplitBalanceDocument>,
  ) {}

  async getMonthlyBreakdown(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to   = new Date(year, mon, 1);
    const txns = await this.txnModel.find({ date: { $gte: from, $lt: to }, type: 'EXPENSE' });

    const byCategory: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
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
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txns = await this.txnModel.find({ date: { $gte: from, $lt: to }, type: 'EXPENSE', category });
      const total = txns.reduce((s, t) => s + t.amount, 0);
      months.push({ month: label, total: round(total) });
    }
    return { category, months };
  }

  async getSavingsRateTrend(monthsCount: number) {
    const result: any[] = [];
    const now = new Date();
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txns = await this.txnModel.find({ date: { $gte: from, $lt: to } });

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
      result.push({ month: label, income: round(income), expenses: round(expenses), familyTransfers: round(familyTransfers), realSavings: round(realSavings), savingsRate });
    }
    return result;
  }

  async getMoneyOutside() {
    const borrows = await this.borrowModel.find({ status: { $in: ['ACTIVE', 'PARTIALLY_RETURNED'] } });
    const allPayments = await this.paymentModel.find();

    let borrowsOutstanding = 0;
    for (const b of borrows) {
      const paid = allPayments.filter(p => p.borrowId.equals(b._id as Types.ObjectId)).reduce((s, p) => s + p.amount, 0);
      const days = (Date.now() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24);
      const interest = b.principal * (b.interestRate / 100) * (days / 365);
      borrowsOutstanding += b.principal + interest - paid;
    }

    const splits = await this.splitModel.find();
    const splitsOwed = splits.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);

    return {
      borrowsOutstanding: round(borrowsOutstanding),
      splitsOwed: round(splitsOwed),
      grandTotal: round(borrowsOutstanding + splitsOwed),
    };
  }
}
