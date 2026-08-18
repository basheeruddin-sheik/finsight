import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { BorrowsService } from '../borrows/borrows.service';
import { SplitsService } from '../splits/splits.service';

function round(n: number) { return Math.round(n * 100) / 100; }
const monthEpoch = (m: moment.Moment) => ({ from: m.clone().startOf('month').valueOf(), to: m.clone().add(1,'month').startOf('month').valueOf() });

// All opening-balance transactions are stamped to this epoch (2000-01-01 UTC)
// by Setup + the onboarding migration, so they're trivially identifiable.
const OPENING_EPOCH = moment.utc('2000-01-01', 'YYYY-MM-DD').valueOf();

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name)   private txnModel: Model<TransactionDocument>,
    @InjectModel(Config.name)        private configModel: Model<ConfigDocument>,
    private borrows: BorrowsService,
    private splits: SplitsService,
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
    const { from, to } = monthEpoch(moment.utc(month, 'YYYY-MM'));
    const behaviorMap = await this.getBehaviorMap();
    const txns = await this.txnModel.find({ date: { $gte: from, $lt: to } });

    const byCategory: Record<string, number> = {};   // expenses
    const byPayment:  Record<string, number> = {};   // expense payment methods
    const byInvest:   Record<string, number> = {};   // net cash deployed per asset (INVEST − DIVEST)
    const byAccount:  Record<string, number> = {};   // expenses per account (used for credit-card spend)
    for (const t of txns) {
      const beh = behaviorMap.get(t.type) ?? 'EXPENSE';
      if (beh === 'EXPENSE') {
        const cat = t.category ?? 'OTHER';
        byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
        byPayment[t.paymentMethod] = (byPayment[t.paymentMethod] ?? 0) + t.amount;
        if (t.accountId) {
          const acc = t.accountId.toString();
          byAccount[acc] = (byAccount[acc] ?? 0) + t.amount;
        }
      } else if (beh === 'INVEST') {
        const cat = t.category ?? 'OTHER';
        byInvest[cat] = (byInvest[cat] ?? 0) + t.amount;
      } else if (beh === 'DIVEST') {
        const cat = t.category ?? 'OTHER';
        byInvest[cat] = (byInvest[cat] ?? 0) - t.amount;
      }
    }

    const categories = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total: round(total) }))
      .sort((a, b) => b.total - a.total);
    const paymentMethods = Object.entries(byPayment)
      .map(([method, total]) => ({ method, total: round(total) }))
      .sort((a, b) => b.total - a.total);
    const investments = Object.entries(byInvest)
      .map(([category, total]) => ({ category, total: round(total) }))
      .sort((a, b) => b.total - a.total);
    const accountSpend = Object.entries(byAccount)
      .map(([accountId, total]) => ({ accountId, total: round(total) }))
      .sort((a, b) => b.total - a.total);

    return { categories, paymentMethods, topCategories: categories.slice(0, 3), investments, accountSpend };
  }

  async getCategoryTrend(category: string) {
    const months: { month: string; total: number }[] = [];
    const expenseKeys = await this.getExpenseTypeKeys();
    for (let i = 5; i >= 0; i--) {
      const m = moment.utc().subtract(i, 'months');
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
      const m = moment.utc().subtract(i, 'months');
      const { from, to } = monthEpoch(m);
      const label = m.format('YYYY-MM');
      const txns = await this.txnModel.find({ date: { $gte: from, $lt: to } });

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
      const invested    = totals['INVEST']       ?? 0;
      // Same cash-flow treatment as transactions.service.ts getSummary(), so
      // this trend agrees with the Home page for the same month.
      const splitLent    = totals['SPLIT_LEND']    ?? 0;
      const splitCollect = totals['SPLIT_COLLECT'] ?? 0;
      const splitRepay   = totals['SPLIT_REPAY']   ?? 0;
      const realSavings = income - expenses - transfers + received - lent - splitLent + splitCollect - splitRepay;
      const savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;

      result.push({ month: label, income: round(income), expenses: round(expenses), familyTransfers: round(transfers), realSavings: round(realSavings), savingsRate, investments: round(invested) });
    }
    return result;
  }

  async getMoneyOutside() {
    const { totalOutstanding: borrowsOutstanding, interestPending } = await this.borrows.getSummary();
    const { owedToUser: splitsOwed } = await this.splits.getNetPosition();

    return {
      borrowsOutstanding: round(borrowsOutstanding + interestPending),
      splitsOwed: round(splitsOwed),
      grandTotal: round(borrowsOutstanding + interestPending + splitsOwed),
    };
  }

  // ── Net Worth statement ──────────────────────────────────────────────────
  // Single source of truth for the Portfolio tab. Every rupee the user has
  // ever recorded resolves into exactly one of four non-overlapping buckets,
  // so the buckets always sum to netWorth (no double-counting):
  //
  //   Net Worth = Cash + Investments(at cost) + Borrows outstanding + Splits owed
  //
  // Opening balances (dated 2000-01-01) are assets the user already held before
  // using the app, so they ESTABLISH a starting balance without ever flowing
  // through cash:
  //   • opening INCOME (cash on hand) → seeds Cash
  //   • opening INVEST                → seeds Investments, does NOT drain cash
  //   • opening LEND                  → seeds Borrows,     does NOT drain cash
  // Without this, opening investments/loans would carve a phantom hole in cash
  // (cash spent with no matching recorded income).
  async getNetWorth() {
    const [txns, behaviorMap, borrowSummary, splitPos] = await Promise.all([
      this.txnModel.find({}),
      this.getBehaviorMap(),
      this.borrows.getSummary(),
      this.splits.getNetPosition(),
    ]);

    // Accumulate transaction flows by behavior, and investments per category.
    const acc: Record<string, number> = {};
    let costReturned = 0;
    let openingInvest = 0;   // opening-dated INVEST — establishes assets, not a cash purchase
    let openingLent = 0;     // opening-dated LEND   — establishes receivable, not a cash outflow
    let openingSplitLent = 0; // opening-dated SPLIT_LEND — pre-existing split receivable
    const investByCat: Record<string, { invested: number; returned: number }> = {};

    for (const t of txns) {
      const beh = behaviorMap.get(t.type) ?? 'EXPENSE';
      acc[beh] = (acc[beh] ?? 0) + t.amount;
      const isOpening = t.date === OPENING_EPOCH;

      if (beh === 'INVEST') {
        const cat = t.category ?? 'OTHER';
        (investByCat[cat] ??= { invested: 0, returned: 0 }).invested += t.amount;
        if (isOpening) openingInvest += t.amount;
      }
      if (beh === 'DIVEST') {
        const cat = t.category ?? 'OTHER';
        (investByCat[cat] ??= { invested: 0, returned: 0 }).returned += t.costBasis ?? 0;
        costReturned += t.costBasis ?? 0;
      }
      if (beh === 'LEND' && isOpening) openingLent += t.amount;
      if (beh === 'SPLIT_LEND' && isOpening) openingSplitLent += t.amount;
    }

    const income   = acc['INCOME']       ?? 0;   // includes opening balances + interest
    const expenses = acc['EXPENSE']      ?? 0;
    const transfer = acc['TRANSFER']     ?? 0;
    const lent     = acc['LEND']         ?? 0;
    const received = acc['RECEIVE_BACK'] ?? 0;
    const invested = acc['INVEST']       ?? 0;
    const divested = acc['DIVEST']       ?? 0;
    // Split cash flows: you fronting a friend's share (−), collecting it back (+),
    // and paying a friend back (−). SPLIT_OWE accrues a debt without moving cash.
    const splitLent    = acc['SPLIT_LEND']    ?? 0;
    const splitCollect = acc['SPLIT_COLLECT'] ?? 0;
    const splitRepay   = acc['SPLIT_REPAY']   ?? 0;

    // Cash = liquid residual. Opening invest/loans are added back because they
    // were never spent from tracked cash — they were pre-existing holdings.
    const cash = income - expenses - transfer - lent + received - invested + divested
      + openingInvest + openingLent
      - splitLent + splitCollect - splitRepay
      + openingSplitLent;

    // Investments per vertical, net of redemptions (a fully-sold FD nets to 0).
    const investments = Object.entries(investByCat)
      .map(([category, { invested: inv, returned }]) => ({ category, amount: round(inv - returned) }))
      .filter(i => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const investmentsTotal = round(invested - costReturned);

    // Receivables — money owed back to the user. Splits are signed: friends may
    // owe the user (asset) or the user may owe friends (liability); the net of the
    // two is what moves net worth.
    const borrowsOutstanding = round(borrowSummary.totalOutstanding);
    const splitsOwed = splitPos.owedToUser;  // friends owe you (asset)
    const splitsOwe  = splitPos.userOwes;    // you owe friends (liability)
    const splitsNet  = splitPos.net;         // owedToUser − userOwes

    const netWorth = round(cash + investmentsTotal + borrowsOutstanding + splitsNet);

    // Realized gains — actual profit/loss booked on investments already sold.
    // proceeds (cash received on DIVEST) vs. original cost (costBasis). This is
    // P/L, distinct from cash flow: selling at a profit still reduces holdings.
    const salesProceeds = round(divested);
    const salesCost     = round(costReturned);
    const realizedGains = round(divested - costReturned);

    return {
      netWorth,
      cash: round(cash),
      investmentsTotal,
      investments,
      borrowsOutstanding,
      splitsOwed,
      splitsOwe,
      splitsNet,
      salesProceeds,
      salesCost,
      realizedGains,
    };
  }
}
