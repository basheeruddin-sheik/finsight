import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import moment from 'moment';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Config, ConfigDocument } from '../schemas/config.schema';

const round = (n: number) => Math.round(n * 100) / 100;
const toISO = (epoch: number | null | undefined) =>
  epoch != null ? moment(epoch).toISOString() : null;

// A borrow is a BORROW_GIVEN (behavior LEND) transaction. Repayments
// (RECEIVE_BACK) and interest payments (INCOME) reference it via borrowId.
// Everything below is DERIVED from transactions — no separate borrow store.

@Injectable()
export class BorrowsService {
  constructor(
    @InjectModel(Transaction.name) private txn: Model<TransactionDocument>,
    @InjectModel(Config.name)      private config: Model<ConfigDocument>,
  ) {}

  private async behaviorMap() {
    const types = await this.config.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }

  // Build every derived borrow (optionally filtered to one person).
  private async derive(personId?: string) {
    const beh = await this.behaviorMap();
    const all = await this.txn.find().populate('personId').sort({ date: 1 });

    const isLend = (t: any) => beh.get(t.type) === 'LEND';

    // index children (repayments / interest) by their borrowId
    const childrenOf: Record<string, any[]> = {};
    for (const t of all) {
      if (t.borrowId) (childrenOf[t.borrowId.toString()] ??= []).push(t);
    }

    const lends = all.filter(isLend).filter(l => {
      if (!personId) return true;
      const pid = (l.personId as any)?._id?.toString() ?? l.personId?.toString();
      return pid === personId;
    });

    return lends.map(l => {
      const j = l.toJSON() as any;
      const id = j.id ?? l._id.toString();
      const person = j.personId && j.personId.name
        ? { id: j.personId._id?.toString() ?? j.personId.id, name: j.personId.name, type: j.personId.type }
        : null;
      const kids = (childrenOf[id] ?? []).map((c: any) => c.toJSON());

      const repayments = kids.filter((c: any) => beh.get(c.type) === 'RECEIVE_BACK');
      const interests  = kids.filter((c: any) => beh.get(c.type) === 'INCOME');
      const writeoffs  = kids.filter((c: any) => beh.get(c.type) === 'WRITEOFF');
      const principalPaid    = round(repayments.reduce((s: number, c: any) => s + c.amount, 0));
      const interestPaid     = round(interests.reduce((s: number, c: any) => s + c.amount, 0));
      const writeoffTotal    = round(writeoffs.reduce((s: number, c: any) => s + c.amount, 0));
      const interestExpected = j.interestExpected ?? 0;

      // A write-off closes the remaining principal (you've decided not to collect it).
      const rawOutstanding  = round(j.amount - principalPaid - writeoffTotal);
      const interestPending = round(interestExpected - interestPaid);
      const status = j.settled || writeoffTotal > 0 || rawOutstanding <= 0
        ? 'SETTLED'
        : (principalPaid > 0 || interestPaid > 0 ? 'PARTIALLY_RETURNED' : 'ACTIVE');

      // Audit entries: epoch numbers → ISO strings for the API.
      const toAudit = (c: any, kind: string) => ({
        id: c.id, kind, amount: c.amount,
        date: toISO(c.date), createdAt: toISO(c.createdAt), note: c.note ?? null,
      });
      const audit = [
        toAudit({ id, ...j }, 'given'),
        ...repayments.map((c: any) => toAudit(c, 'repaid')),
        ...interests.map((c: any)  => toAudit(c, 'interest')),
        ...writeoffs.map((c: any)  => toAudit(c, 'writeoff')),
      ].sort((a, b) => (b.createdAt ?? b.date ?? '').localeCompare(a.createdAt ?? a.date ?? ''));

      // Written off = explicit write-off entries, plus legacy flag-only settles.
      const writtenOff = round(writeoffTotal + (j.settled && rawOutstanding > 0 ? rawOutstanding : 0));

      return {
        id, personId: person?.id ?? null, person,
        principal: j.amount, date: toISO(j.date), note: j.note ?? null,
        interestExpected, settledFlag: !!j.settled,
        principalPaid, interestPaid, interestPending,
        outstanding: Math.max(rawOutstanding, 0),
        overReturned: rawOutstanding < 0 ? round(-rawOutstanding) : 0,
        writtenOff,
        status, audit,
      };
    });
  }

  // Per-person groups for the overview list.
  async findAll() {
    const borrows = await this.derive();
    const groups: Record<string, any> = {};
    for (const b of borrows) {
      if (!b.person) continue;
      const g = (groups[b.person.id] ??= {
        person: b.person, borrows: [] as any[],
        totalGiven: 0, totalRepaid: 0, interestPaid: 0, outstanding: 0, interestPending: 0,
      });
      g.borrows.push(b);
      g.totalGiven      += b.principal;
      g.totalRepaid     += b.principalPaid;
      g.interestPaid    += b.interestPaid;
      // Settled borrows (incl. manual settle / write-off) are closed — exclude
      // their leftover from the live position, matching the summary card.
      if (b.status !== 'SETTLED') {
        g.outstanding     += b.outstanding;
        g.interestPending += Math.max(b.interestPending, 0);
      }
    }
    return Object.values(groups)
      .map((g: any) => ({
        ...g,
        totalGiven: round(g.totalGiven), totalRepaid: round(g.totalRepaid),
        interestPaid: round(g.interestPaid), outstanding: round(g.outstanding),
        interestPending: round(g.interestPending),
      }))
      .sort((a: any, b: any) => b.outstanding - a.outstanding);
  }

  async findByPerson(personId: string) {
    return this.derive(personId);
  }

  async getSummary() {
    const borrows = await this.derive();
    let totalLent = 0, totalRecovered = 0, totalOutstanding = 0, interestPending = 0, activeCount = 0;
    for (const b of borrows) {
      totalLent += b.principal;
      totalRecovered += b.principalPaid;
      if (b.status !== 'SETTLED') { totalOutstanding += b.outstanding; interestPending += Math.max(b.interestPending, 0); activeCount++; }
    }
    return {
      totalLent: round(totalLent), totalRecovered: round(totalRecovered),
      totalOutstanding: round(totalOutstanding), interestPending: round(interestPending), activeCount,
    };
  }

  // Used by the person-archive guard.
  async hasOpenBorrows(personId: string) {
    const borrows = await this.derive(personId);
    return borrows.some(b => b.status !== 'SETTLED');
  }

  // Settling a loan that still has money out records a write-off transaction
  // for the unpaid amount (a loss, NOT a recovery) so it shows in the history.
  async settle(id: string) {
    const lend = await this.txn.findById(id);
    if (!lend) throw new NotFoundException('Borrow not found');

    const beh  = await this.behaviorMap();
    const kids = await this.txn.find({ borrowId: id });
    const paidOrWritten = kids
      .filter(c => beh.get(c.type) === 'RECEIVE_BACK' || beh.get(c.type) === 'WRITEOFF')
      .reduce((s, c) => s + c.amount, 0);
    const outstanding = round((lend as any).amount - paidOrWritten);

    if (outstanding > 0) {
      await this.txn.create({
        type: 'BORROW_WRITEOFF',
        amount: outstanding,
        date: moment.utc().startOf('day').valueOf(),  // UTC midnight, consistent with all other txns
        paymentMethod: '—',
        personId: (lend as any).personId ?? null,
        borrowId: lend._id,
        note: 'Settled by myself — written off',
      });
    }
    await this.txn.findByIdAndUpdate(id, { settled: true });
    return { settled: true, writtenOff: Math.max(outstanding, 0) };
  }

  // Reopening removes any write-off entries and clears the flag.
  async unsettle(id: string) {
    const doc = await this.txn.findByIdAndUpdate(id, { settled: false });
    if (!doc) throw new NotFoundException('Borrow not found');
    await this.txn.deleteMany({ borrowId: id, type: 'BORROW_WRITEOFF' });
    return { settled: false };
  }
}
