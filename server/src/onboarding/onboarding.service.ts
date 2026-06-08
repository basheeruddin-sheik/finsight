import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Person, PersonDocument } from '../schemas/person.schema';
import { Budget, BudgetDocument } from '../schemas/budget.schema';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';
import { RequestContext } from '../context/request-context';
import { DEFAULT_TYPES, DEFAULT_CATEGORIES } from '../config/config.defaults';

@Injectable()
export class OnboardingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly ready = new Set<string>();

  constructor(
    @InjectModel(Config.name)       private config: Model<ConfigDocument>,
    @InjectModel(Transaction.name)  private txn: Model<TransactionDocument>,
    @InjectModel(Person.name)       private person: Model<PersonDocument>,
    @InjectModel(Budget.name)       private budget: Model<BudgetDocument>,
    @InjectModel(SplitBalance.name) private split: Model<SplitBalanceDocument>,
  ) {}

  // Rebuild indexes so the userId-compound unique indexes replace the old ones.
  async onApplicationBootstrap() {
    await this.migrateToEpoch();
    await this.migrateOpeningBalanceDates();
    for (const m of [this.config, this.txn, this.person, this.budget, this.split]) {
      try { await m.syncIndexes(); }
      catch (e) { this.logger.warn(`syncIndexes(${m.modelName}) failed: ${(e as Error).message}`); }
    }
  }

  // One-time idempotent migration: converts any BSON Date values to epoch ms
  // Numbers. Safe to run on every boot — the $type:'date' filter is a no-op
  // once all records are already Numbers.
  private async migrateToEpoch() {
    const dateFields = ['date', 'createdAt', 'updatedAt', 'lastSyncedAt'];
    const models = [this.txn, this.person, this.config, this.budget, this.split];
    for (const model of models) {
      for (const field of dateFields) {
        const result = await model.collection.updateMany(
          { [field]: { $type: 'date' } } as any,
          [{ $set: { [field]: { $toLong: `$${field}` } } }],
        );
        if (result.modifiedCount > 0) {
          this.logger.log(`Migrated ${result.modifiedCount} ${model.modelName}.${field} Date → epoch`);
        }
      }
    }

    // Normalize BORROW_WRITEOFF dates to UTC midnight — write-offs created before
    // the fix used new Date() (full timestamp). Floor to midnight so they sort
    // correctly within their day alongside other midnight-dated transactions.
    // $subtract date by (date % 86400000) = round down to UTC midnight.
    const normalized = await this.txn.collection.updateMany(
      { type: 'BORROW_WRITEOFF', date: { $not: { $eq: null } } } as any,
      [{ $set: { date: { $subtract: ['$date', { $mod: ['$date', 86400000] }] } } }],
    );
    if (normalized.modifiedCount > 0) {
      this.logger.log(`Normalized ${normalized.modifiedCount} BORROW_WRITEOFF dates to UTC midnight`);
    }
  }

  // Idempotent: moves any OPENING_BALANCE / "Opening balance" investment or borrow
  // transactions to epoch date 2000-01-01 so they never appear in monthly reports.
  private async migrateOpeningBalanceDates() {
    const target = moment.utc('2000-01-01', 'YYYY-MM-DD').valueOf(); // 946684800000

    const fixes = await Promise.all([
      // Any OPENING_BALANCE transaction not already dated to 2000-01-01
      this.txn.collection.updateMany(
        { type: 'OPENING_BALANCE', date: { $ne: target } } as any,
        { $set: { date: target } },
      ),
      // INVESTMENT transactions created as opening balances
      this.txn.collection.updateMany(
        { type: 'INVESTMENT', note: /Opening balance/i, date: { $ne: target } } as any,
        { $set: { date: target } },
      ),
      // BORROW_GIVEN transactions created as opening balances
      this.txn.collection.updateMany(
        { type: 'BORROW_GIVEN', note: /Opening balance/i, date: { $ne: target } } as any,
        { $set: { date: target } },
      ),
    ]);

    const total = fixes.reduce((s, r) => s + r.modifiedCount, 0);
    if (total > 0) this.logger.log(`Backdated ${total} opening balance transaction(s) to 2000-01-01`);
  }

  // Called once per user per server boot (memoized in `ready`).
  // Always upserts missing built-in types/categories so newly introduced
  // built-ins (e.g. INVESTMENT) automatically appear for existing users.
  async ensureUser(userId: string): Promise<void> {
    if (this.ready.has(userId)) return;
    await RequestContext.runBypass(async () => {
      const hasConfig = await this.config.exists({ userId });
      if (!hasConfig) {
        const legacyExists = await this.config.exists({ userId: { $exists: false } });
        if (legacyExists) await this.claimLegacy(userId);
        else await this.seedDefaults(userId);
      } else {
        // Existing user — upsert any built-ins added since their account was created.
        await this.upsertMissingBuiltins(userId);
      }
    });
    this.ready.add(userId);
  }

  // Insert any DEFAULT_TYPES / DEFAULT_CATEGORIES the user doesn't have yet.
  // $setOnInsert means existing rows are never overwritten (preserving user customisations).
  private async upsertMissingBuiltins(userId: string): Promise<void> {
    const all = [...DEFAULT_TYPES, ...DEFAULT_CATEGORIES];
    await Promise.all(all.map(d =>
      this.config.updateOne(
        { userId, configType: d.configType, key: d.key },
        { $setOnInsert: { ...d, userId } },
        { upsert: true },
      )
    ));
  }

  // One-time transfer: assign every pre-auth document (no userId) to this user.
  private async claimLegacy(userId: string): Promise<void> {
    const filter = { userId: { $exists: false } } as any;
    const set = { $set: { userId } };
    await Promise.all([
      this.txn.updateMany(filter, set),
      this.person.updateMany(filter, set),
      this.config.updateMany(filter, set),
      this.budget.updateMany(filter, set),
      this.split.updateMany(filter, set),
    ]);
    this.logger.log(`Claimed all legacy (pre-auth) data for user ${userId}`);
  }

  private async seedDefaults(userId: string): Promise<void> {
    await this.config.insertMany(
      [...DEFAULT_TYPES, ...DEFAULT_CATEGORIES].map(d => ({ ...d, userId })),
    );
    this.logger.log(`Seeded default config for new user ${userId}`);
  }
}
