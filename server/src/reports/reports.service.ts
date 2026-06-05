import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyBreakdown(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: from, lt: to }, type: 'EXPENSE' },
    });

    const byCategory: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};

    for (const t of transactions) {
      const cat = t.category ?? 'OTHER';
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
      byPaymentMethod[t.paymentMethod] = (byPaymentMethod[t.paymentMethod] ?? 0) + t.amount;
    }

    const categories = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    const paymentMethods = Object.entries(byPaymentMethod)
      .map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    return {
      categories,
      paymentMethods,
      topCategories: categories.slice(0, 3),
    };
  }

  async getCategoryTrend(category: string) {
    const months: { month: string; total: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const transactions = await this.prisma.transaction.findMany({
        where: { date: { gte: from, lt: to }, type: 'EXPENSE', category },
      });

      const total = transactions.reduce((s, t) => s + t.amount, 0);
      months.push({ month: label, total: Math.round(total * 100) / 100 });
    }

    return { category, months };
  }

  async getSavingsRateTrend(monthsCount: number) {
    const result: {
      month: string;
      income: number;
      expenses: number;
      familyTransfers: number;
      realSavings: number;
      savingsRate: number;
    }[] = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const transactions = await this.prisma.transaction.findMany({
        where: { date: { gte: from, lt: to } },
      });

      let income = 0, expenses = 0, familyTransfers = 0, borrowsGiven = 0, borrowRecoveries = 0;
      for (const t of transactions) {
        switch (t.type) {
          case 'INCOME':           income += t.amount; break;
          case 'EXPENSE':          expenses += t.amount; break;
          case 'FAMILY_TRANSFER':  familyTransfers += t.amount; break;
          case 'BORROW_GIVEN':     borrowsGiven += t.amount; break;
          case 'BORROW_RECEIVED':  borrowRecoveries += t.amount; break;
        }
      }

      const realSavings = income - expenses - familyTransfers + borrowRecoveries - borrowsGiven;
      const savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;

      result.push({
        month: label,
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        familyTransfers: Math.round(familyTransfers * 100) / 100,
        realSavings: Math.round(realSavings * 100) / 100,
        savingsRate,
      });
    }

    return result;
  }

  async getMoneyOutside() {
    const borrows = await this.prisma.borrow.findMany({
      where: { status: { in: ['ACTIVE', 'PARTIALLY_RETURNED'] } },
      include: { payments: true },
    });

    let borrowsOutstanding = 0;
    for (const b of borrows) {
      const paid = b.payments.reduce((s, p) => s + p.amount, 0);
      const days = (Date.now() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24);
      const interest = b.principal * (b.interestRate / 100) * (days / 365);
      borrowsOutstanding += b.principal + interest - paid;
    }

    const splits = await this.prisma.splitBalance.findMany();
    const splitsOwed = splits
      .filter(s => s.balance > 0)
      .reduce((sum, s) => sum + s.balance, 0);

    return {
      borrowsOutstanding: Math.round(borrowsOutstanding * 100) / 100,
      splitsOwed: Math.round(splitsOwed * 100) / 100,
      grandTotal: Math.round((borrowsOutstanding + splitsOwed) * 100) / 100,
    };
  }
}
