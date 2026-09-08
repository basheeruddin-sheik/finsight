import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';

const round = (n: number) => Math.round(n * 100) / 100;

// An investment position is tracked per category (the "type" of investment —
// Stocks, Mutual Funds, Gold, Fixed Deposit, …). INVESTMENT (behavior INVEST)
// transactions add to a category; INVESTMENT_RETURN (behavior DIVEST) draw it
// down by their costBasis. This is DERIVED from transactions — no separate
// store — and matches exactly how net-worth aggregates investments.
@Injectable()
export class InvestmentsService {
  constructor(
    @InjectModel(Transaction.name) private txn: Model<TransactionDocument>,
    @InjectModel(Config.name)      private config: Model<ConfigDocument>,
  ) {}

  private async behaviorMap() {
    const types = await this.config.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }

  // Per-category position: how much is still invested in each type.
  private async derive() {
    const beh = await this.behaviorMap();
    const all = await this.txn.find();

    const byCat: Record<string, { invested: number; returned: number; proceeds: number }> = {};
    for (const t of all) {
      const b = beh.get(t.type);
      const cat = t.category ?? 'OTHER';
      if (b === 'INVEST') {
        (byCat[cat] ??= { invested: 0, returned: 0, proceeds: 0 }).invested += t.amount;
      } else if (b === 'DIVEST') {
        const e = (byCat[cat] ??= { invested: 0, returned: 0, proceeds: 0 });
        e.returned += t.costBasis ?? 0;
        e.proceeds += t.amount;
      }
    }

    return Object.entries(byCat)
      .map(([category, { invested, returned, proceeds }]) => {
        const remaining = round(invested - returned);
        return {
          category,
          invested: round(invested),
          returned: round(returned),
          proceeds: round(proceeds),
          remaining: Math.max(remaining, 0),
          realizedGains: round(proceeds - returned),
          status: remaining <= 0.01 ? 'CLOSED' : (returned > 0 ? 'PARTIAL' : 'OPEN'),
        };
      })
      // Something still invested first (highest first), then closed positions.
      .sort((a, b) => b.remaining - a.remaining || b.invested - a.invested);
  }

  async findAll() {
    return this.derive();
  }

  async getSummary() {
    const positions = await this.derive();
    let invested = 0, current = 0, realizedGains = 0, openCount = 0;
    for (const p of positions) {
      invested += p.invested;
      current  += p.remaining;
      realizedGains += p.realizedGains;
      if (p.status !== 'CLOSED') openCount++;
    }
    return {
      totalInvested: round(invested),
      currentValue: round(current),
      realizedGains: round(realizedGains),
      openCount,
    };
  }
}
