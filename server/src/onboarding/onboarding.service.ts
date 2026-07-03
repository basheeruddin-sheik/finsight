import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash } from 'crypto';
import moment from 'moment';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Person, PersonDocument } from '../schemas/person.schema';
import { Budget, BudgetDocument } from '../schemas/budget.schema';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';
import { SplitEntry, SplitEntryDocument } from '../schemas/split-entry.schema';
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
    @InjectModel(SplitEntry.name)   private splitEntry: Model<SplitEntryDocument>,
  ) {}

  // Rebuild indexes so the userId-compound unique indexes replace the old ones.
  async onApplicationBootstrap() {
    await this.migrateToEpoch();
    await this.migrateOpeningBalanceDates();
    await this.migrateSplitBalancesToEntries();
    await this.migrateSplitEntriesToTransactions();
    for (const m of [this.config, this.txn, this.person, this.budget, this.split, this.splitEntry]) {
      try { await m.syncIndexes(); }
      catch (e) { this.logger.warn(`syncIndexes(${m.modelName}) failed: ${(e as Error).message}`); }
    }
  }

  // Idempotent: converts the SplitEntry ledger into split transactions so splits
  // live in the transaction feed (and cash flow) like borrows. Each friend's net
  // balance becomes one transaction: SPLIT_PAID if they owe you, SPLIT_OWED if you
  // owe them. Skips any (user, person) that already has a split transaction.
  private async migrateSplitEntriesToTransactions() {
    const SPLIT_TYPES = ['SPLIT_PAID', 'SPLIT_COLLECTED', 'SPLIT_OWED', 'SPLIT_REPAID'];
    const entries = await this.splitEntry.collection.find({}).toArray();
    // Aggregate net balance per (userId, personId).
    const nets = new Map<string, { userId: any; personId: any; balance: number }>();
    for (const e of entries as any[]) {
      const key = `${e.userId}|${e.personId}`;
      const cur = nets.get(key) ?? { userId: e.userId, personId: e.personId, balance: 0 };
      cur.balance += e.amount ?? 0;
      nets.set(key, cur);
    }
    let created = 0;
    for (const { userId, personId, balance } of nets.values()) {
      if (Math.abs(balance) < 0.01) continue;
      // Skip if the user already has any non-migration split activity for this person.
      const userSplit = await this.txn.collection.findOne({
        userId, personId, type: { $in: SPLIT_TYPES }, note: { $ne: 'Opening split balance' },
      } as any);
      if (userSplit) continue;
      // Idempotent: clear any prior migration output for this person, then re-create one.
      const now = Date.now();
      // Dated to the opening epoch so it establishes a pre-existing balance without
      // draining cash (same treatment as opening investments / loans).
      const OPENING_EPOCH = moment.utc('2000-01-01', 'YYYY-MM-DD').valueOf();
      // Deterministic _id keyed on (user, person) so concurrent/repeat runs collide
      // on the unique index instead of inserting duplicates (race-safe).
      const _id = new Types.ObjectId(
        createHash('md5').update(`splitopen|${userId}|${personId}`).digest('hex').slice(0, 24),
      );
      try {
        await this.txn.collection.insertOne({
          _id,
          userId,
          personId,
          type: balance > 0 ? 'SPLIT_PAID' : 'SPLIT_OWED',
          amount: Math.abs(Math.round(balance * 100) / 100),
          date: OPENING_EPOCH,
          paymentMethod: 'CASH',
          note: 'Opening split balance',
          interestExpected: 0,
          settled: false,
          costBasis: 0,
          splitGroupId: null,
          createdAt: now,
          updatedAt: now,
        } as any);
        created++;
      } catch (e: any) {
        if (e?.code !== 11000) throw e;  // ignore duplicate-key (already migrated)
      }
    }
    if (created > 0) this.logger.log(`Migrated ${created} split balance(s) to transactions`);
  }

  // Idempotent: seeds the new SplitEntry ledger from legacy SplitBalance rows.
  // Each non-zero balance becomes one OPENING entry. Skips any person who
  // already has ledger entries, so it never double-counts on re-runs.
  private async migrateSplitBalancesToEntries() {
    const balances = await this.split.collection.find({}).toArray();
    let created = 0;
    for (const b of balances as any[]) {
      if (!b.balance || Math.abs(b.balance) < 0.01) continue;
      const exists = await this.splitEntry.collection.findOne({ userId: b.userId, personId: b.personId });
      if (exists) continue;
      await this.splitEntry.collection.insertOne({
        userId: b.userId,
        personId: b.personId,
        amount: b.balance,
        date: Date.now(),
        note: 'Opening balance',
        kind: 'OPENING',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);
      created++;
    }
    if (created > 0) this.logger.log(`Seeded ${created} split ledger entr(ies) from legacy balances`);
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
    await this.seedForUser(userId);
    this.ready.add(userId);
  }

  // Force re-seed a user, bypassing the in-memory ready cache.
  // Used by the admin reseed endpoint to fix users who never got seeded.
  async reseedUser(userId: string): Promise<void> {
    this.ready.delete(userId);
    await this.seedForUser(userId);
    this.ready.add(userId);
  }

  private async seedForUser(userId: string): Promise<void> {
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
