import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import moment from 'moment';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

// Epoch numbers in DB → ISO strings in API so the frontend stays unchanged.
const toISO = (epoch: number | null | undefined) =>
  epoch != null ? moment(epoch).toISOString() : null;

function toRes(doc: any) {
  const t = doc.toJSON ? doc.toJSON() : doc;
  const person = t.personId && typeof t.personId === 'object' && t.personId.name
    ? { id: t.personId._id?.toString() ?? t.personId.id, name: t.personId.name, type: t.personId.type }
    : null;
  return {
    id: t.id ?? t._id?.toString(),
    type: t.type,
    amount: t.amount,
    date: toISO(t.date),
    category: t.category ?? null,
    paymentMethod: t.paymentMethod,
    personId: person ? person.id : (t.personId?.toString() ?? null),
    person,
    note: t.note ?? null,
    createdAt: toISO(t.createdAt),
    borrowId: t.borrowId?.toString() ?? null,
    interestExpected: t.interestExpected ?? 0,
    settled: t.settled ?? false,
    costBasis: t.costBasis ?? 0,
    splitGroupId: t.splitGroupId ?? null,
    accountId: t.accountId?.toString() ?? null,
    toAccountId: t.toAccountId?.toString() ?? null,
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private model: Model<TransactionDocument>,
    @InjectModel(Config.name)      private configModel: Model<ConfigDocument>,
  ) {}

  async findAll(filters: { type?: string; category?: string; from?: string; to?: string; search?: string }) {
    const where: any = {};
    if (filters.type)     where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.search)   where.note = { $regex: filters.search, $options: 'i' };
    if (filters.from || filters.to) {
      where.date = {};
      // UTC, not server-local time — `date` is stored as UTC midnight, so a
      // local-time boundary (e.g. the server running in IST, UTC+5:30) would
      // shift the window by the server's offset, wrongly pulling in records
      // from the adjacent day/month or excluding the tail end of the range.
      if (filters.from) where.date.$gte = moment.utc(filters.from).startOf('day').valueOf();
      if (filters.to)   where.date.$lte = moment.utc(filters.to).endOf('day').valueOf();
    }
    // date is stored day-only (midnight), so same-day rows tie on date —
    // break the tie by createdAt ascending, so entries appear in the order
    // you actually added them (oldest first), not "most recently added on
    // top" — which put backdated batch entries above same-day activity that
    // was entered earlier in real time.
    const docs = await this.model.find(where).populate('personId').sort({ date: -1, createdAt: 1 });
    return docs.map(toRes);
  }

  async create(dto: CreateTransactionDto) {
    if (!dto.accountId) throw new BadRequestException('Select an account');
    const created = await this.model.create({
      ...dto,
      date: moment.utc(dto.date, 'YYYY-MM-DD').valueOf(),  // UTC midnight epoch ms — consistent across timezones
      personId: dto.personId ? new Types.ObjectId(dto.personId) : undefined,
      borrowId: dto.borrowId ? new Types.ObjectId(dto.borrowId) : undefined,
      interestExpected: dto.interestExpected ?? 0,
      costBasis: dto.costBasis ?? 0,
      accountId: new Types.ObjectId(dto.accountId),
    });
    const doc = await this.model.findById(created._id).populate('personId');
    return toRes(doc!);
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const update: any = { ...dto };
    if (dto.date)                    update.date = moment.utc(dto.date, 'YYYY-MM-DD').valueOf();
    if (dto.personId !== undefined)  update.personId = dto.personId ? new Types.ObjectId(dto.personId) : null;
    if (dto.borrowId !== undefined)  update.borrowId = dto.borrowId ? new Types.ObjectId(dto.borrowId) : null;
    if (dto.accountId !== undefined) update.accountId = dto.accountId ? new Types.ObjectId(dto.accountId) : null;
    const doc = await this.model.findByIdAndUpdate(id, update, { returnDocument: 'after' }).populate('personId');
    return toRes(doc!);
  }

  // Deleting a borrow (the lend txn) also removes its repayment/interest entries.
  async delete(id: string) {
    await this.model.deleteMany({ borrowId: new Types.ObjectId(id) });
    await this.model.findByIdAndDelete(id);
    return { deleted: true };
  }

  async getSummary(month: string) {
    // UTC — see findAll() for why: a local-time boundary shifts by the
    // server's offset from `date`'s actual UTC-midnight storage.
    const from = moment.utc(month, 'YYYY-MM').startOf('month').valueOf();
    const to   = moment.utc(month, 'YYYY-MM').add(1, 'month').startOf('month').valueOf();

    const [txns, typeConfigs] = await Promise.all([
      this.model.find({ date: { $gte: from, $lt: to } }),
      this.configModel.find({ configType: 'type' }),
    ]);

    // Build behavior map: typeKey → behavior
    const behaviorMap = new Map(typeConfigs.map(t => [t.key, t.behavior]));

    // Accumulate by behavior
    const totals: Record<string, number> = {};
    let costBasisReturned = 0;
    for (const t of txns) {
      const beh = behaviorMap.get(t.type) ?? 'EXPENSE';
      totals[beh] = (totals[beh] ?? 0) + t.amount;
      if (beh === 'DIVEST') costBasisReturned += t.costBasis ?? 0;
    }

    const income      = totals['INCOME']       ?? 0;
    const expenses    = totals['EXPENSE']      ?? 0;
    const transfers   = totals['TRANSFER']     ?? 0;
    const lent        = totals['LEND']         ?? 0;
    const received    = totals['RECEIVE_BACK'] ?? 0;
    const invested    = totals['INVEST']       ?? 0;
    const divested    = totals['DIVEST']       ?? 0;
    // Splits, cash-flow basis (mirrors LEND/RECEIVE_BACK for borrows):
    //   SPLIT_LEND    — you paid a friend's share, cash left your pocket now
    //   SPLIT_COLLECT — a friend paid you back, cash returned
    //   SPLIT_REPAY   — you paid back what you owed, cash left your pocket now
    //   SPLIT_OWE is excluded — a friend covering your share moves no cash of
    //   yours; only SPLIT_REPAY (when you actually settle it) does.
    const splitLent    = totals['SPLIT_LEND']    ?? 0;
    const splitCollect = totals['SPLIT_COLLECT'] ?? 0;
    const splitRepay   = totals['SPLIT_REPAY']   ?? 0;

    const realSavings = income - expenses - transfers + received - lent - invested + divested
      - splitLent + splitCollect - splitRepay;
    const savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;

    return {
      income,
      expenses,
      familyTransfers:   transfers,
      borrowsGiven:      lent,
      borrowRecoveries:  received,
      investments:       invested,
      investmentReturns: divested,
      splitLent,
      splitCollected:    splitCollect,
      splitRepaid:       splitRepay,
      costBasisReturned,
      realSavings,
      savingsRate,
      // Per-type breakdown for detailed insights
      byType: Object.fromEntries(
        typeConfigs.map(t => [t.key, txns.filter(x => x.type === t.key).reduce((s, x) => s + x.amount, 0)])
      ),
    };
  }
}
