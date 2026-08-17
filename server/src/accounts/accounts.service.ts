import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import moment from 'moment';
import { Account, AccountDocument } from '../schemas/account.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { CreateAccountDto } from './dto/create-account.dto';

function round(n: number) { return Math.round(n * 100) / 100; }

const ACCOUNT_TYPES = new Set(['BANK', 'WALLET', 'CASH']);
const normalizeType = (t: string | undefined) => (t && ACCOUNT_TYPES.has(t) ? t : 'BANK');

// Same cash-flow direction as reports.service.ts getNetWorth()'s `cash`
// formula, applied per-account instead of in aggregate. WRITEOFF and
// SPLIT_OWE move no cash of the user's, so they're excluded entirely.
// ACCOUNT_TRANSFER is handled separately (it has two accounts, not one).
const INFLOW  = new Set(['INCOME', 'RECEIVE_BACK', 'DIVEST', 'SPLIT_COLLECT']);
const OUTFLOW = new Set(['EXPENSE', 'TRANSFER', 'LEND', 'INVEST', 'SPLIT_LEND', 'SPLIT_REPAY']);

function toRes(doc: any, balance: number) {
  const a = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: a.id ?? a._id?.toString(),
    type: a.type ?? 'BANK',
    bank: a.bank,
    last4: a.last4 ?? null,
    customName: a.customName ?? null,
    openingBalance: a.openingBalance ?? 0,
    isDefault: !!a.isDefault,
    archived: !!a.archived,
    balance: round(balance),
  };
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)     private model: Model<AccountDocument>,
    @InjectModel(Transaction.name) private txnModel: Model<TransactionDocument>,
    @InjectModel(Config.name)      private configModel: Model<ConfigDocument>,
  ) {}

  private async behaviorMap(): Promise<Map<string, string>> {
    const types = await this.configModel.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }

  // openingBalance + every signed transaction touching this account, for
  // every account at once (one pass over the account-tagged transactions).
  private async computeBalances(accounts: AccountDocument[]): Promise<Map<string, number>> {
    const balances = new Map<string, number>();
    for (const a of accounts) balances.set((a._id as any).toString(), a.openingBalance ?? 0);

    const [beh, txns] = await Promise.all([
      this.behaviorMap(),
      this.txnModel.find({ $or: [{ accountId: { $ne: null } }, { toAccountId: { $ne: null } }] }),
    ]);

    for (const t of txns) {
      const behavior = beh.get(t.type);
      if (behavior === 'ACCOUNT_TRANSFER') {
        const from = t.accountId?.toString();
        const to   = t.toAccountId?.toString();
        if (from && balances.has(from)) balances.set(from, balances.get(from)! - t.amount);
        if (to   && balances.has(to))   balances.set(to,   balances.get(to)!   + t.amount);
        continue;
      }
      const acc = t.accountId?.toString();
      if (!acc || !balances.has(acc)) continue;
      if (INFLOW.has(behavior!))       balances.set(acc, balances.get(acc)! + t.amount);
      else if (OUTFLOW.has(behavior!)) balances.set(acc, balances.get(acc)! - t.amount);
    }
    return balances;
  }

  async findAll(archived?: boolean) {
    const where: any = { archived: archived === true ? true : { $ne: true } };
    const accounts = await this.model.find(where).sort({ isDefault: -1, name: 1 });
    const balances = await this.computeBalances(accounts);
    return accounts.map(a => toRes(a, balances.get((a._id as any).toString()) ?? 0));
  }

  async create(dto: CreateAccountDto) {
    const type = normalizeType(dto.type);
    if (!dto.bank) throw new BadRequestException(type === 'WALLET' ? 'Select a wallet' : type === 'CASH' ? 'Select cash' : 'Select a bank');
    const isFirst = !(await this.model.exists({}));
    if (dto.isDefault || isFirst) {
      await this.model.updateMany({}, { isDefault: false });
    }
    const created = await this.model.create({
      type,
      bank: dto.bank,
      last4: dto.last4?.trim() || undefined,
      customName: (dto.bank === 'OTHER' || type === 'CASH') ? dto.customName?.trim() || undefined : undefined,
      openingBalance: dto.openingBalance ?? 0,
      isDefault: dto.isDefault || isFirst,
    });
    return toRes(created, created.openingBalance ?? 0);
  }

  async update(id: string, dto: Partial<CreateAccountDto>) {
    const update: any = {};
    if (dto.type !== undefined) update.type = normalizeType(dto.type);
    if (dto.bank !== undefined) update.bank = dto.bank;
    if (dto.last4 !== undefined) update.last4 = dto.last4?.trim() || null;
    if (dto.customName !== undefined) update.customName = dto.customName?.trim() || null;
    if (dto.openingBalance !== undefined) update.openingBalance = dto.openingBalance;
    const doc = await this.model.findByIdAndUpdate(id, update, { returnDocument: 'after' });
    if (!doc) throw new NotFoundException('Account not found');
    const balances = await this.computeBalances([doc]);
    return toRes(doc, balances.get(id) ?? 0);
  }

  async setDefault(id: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Account not found');
    if (doc.archived) throw new BadRequestException('Cannot set an archived account as default');
    await this.model.updateMany({}, { isDefault: false });
    await this.model.findByIdAndUpdate(id, { isDefault: true });
    return { defaulted: true };
  }

  async setArchived(id: string, archived: boolean) {
    if (archived) {
      const doc = await this.model.findById(id);
      if (!doc) throw new NotFoundException('Account not found');
      if (doc.isDefault) throw new BadRequestException('Cannot archive the default account — set another account as default first.');
      const activeCount = await this.model.countDocuments({ archived: { $ne: true } });
      if (activeCount <= 1) throw new BadRequestException('Cannot archive your only account — accounts are required on every transaction.');
    }
    const doc = await this.model.findByIdAndUpdate(id, { archived }, { returnDocument: 'after' });
    if (!doc) throw new NotFoundException('Account not found');
    const balances = await this.computeBalances([doc]);
    return toRes(doc, balances.get(id) ?? 0);
  }

  async delete(id: string) {
    const oid = new Types.ObjectId(id);
    const count = await this.txnModel.countDocuments({ $or: [{ accountId: oid }, { toAccountId: oid }] });
    if (count > 0) throw new BadRequestException('Cannot delete an account with linked transactions. Archive it instead.');
    const doc = await this.model.findById(id);
    if (doc?.isDefault) throw new BadRequestException('Cannot delete the default account — set another account as default first.');
    await this.model.findByIdAndDelete(id);
    return { deleted: true };
  }

  // Move money between two of the user's own accounts. Recorded as a single
  // ACCOUNT_TRANSFER transaction (accountId = source, toAccountId = dest) so
  // it nets to zero on net worth / income / expenses — only the two account
  // balances move.
  async transfer(body: { fromAccountId: string; toAccountId: string; amount: number; note?: string; date?: string }) {
    if (body.fromAccountId === body.toAccountId) throw new BadRequestException('Pick two different accounts');
    if (!body.amount || body.amount <= 0) throw new BadRequestException('Enter a valid amount');
    const [from, to] = await Promise.all([
      this.model.findById(body.fromAccountId),
      this.model.findById(body.toAccountId),
    ]);
    if (!from || !to) throw new NotFoundException('Account not found');

    const typeConf = await this.configModel.findOne({ configType: 'type', behavior: 'ACCOUNT_TRANSFER' });
    if (!typeConf) throw new BadRequestException('Account transfer type is not configured');

    await this.txnModel.create({
      type: typeConf.key,
      amount: round(body.amount),
      date: body.date ? moment.utc(body.date, 'YYYY-MM-DD').valueOf() : moment.utc().startOf('day').valueOf(),
      paymentMethod: '—',
      note: body.note ?? 'Account transfer',
      accountId: from._id,
      toAccountId: to._id,
    });
    return { transferred: true };
  }
}
