import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Borrow, BorrowDocument } from '../schemas/borrow.schema';
import { BorrowPayment, BorrowPaymentDocument } from '../schemas/borrow-payment.schema';
import { CreateBorrowDto } from './dto/create-borrow.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

function calcInterest(principal: number, rate: number, startDate: Date): number {
  const days = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return principal * (rate / 100) * (days / 365);
}

function round(n: number) { return Math.round(n * 100) / 100; }

function toRes(borrow: any) {
  const b = borrow.toJSON ? borrow.toJSON() : borrow;
  const payments = (b.payments ?? []).map((p: any) => ({
    id: p.id ?? p._id?.toString(),
    borrowId: b.id,
    amount: p.amount,
    date: p.date,
    note: p.note ?? null,
  }));
  const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
  const interestOwed = calcInterest(b.principal, b.interestRate, new Date(b.startDate));
  const totalOwed = b.principal + interestOwed - totalPaid;
  const person = b.personId && typeof b.personId === 'object' && b.personId.name
    ? { id: b.personId._id?.toString() ?? b.personId.id, name: b.personId.name, type: b.personId.type }
    : null;
  return {
    id: b.id ?? b._id?.toString(),
    personId: person ? person.id : b.personId?.toString(),
    principal: b.principal,
    interestRate: b.interestRate,
    startDate: b.startDate,
    status: b.status,
    createdAt: b.createdAt,
    person,
    payments,
    totalPaid: round(totalPaid),
    interestOwed: round(interestOwed),
    totalOwed: round(totalOwed),
  };
}

@Injectable()
export class BorrowsService {
  constructor(
    @InjectModel(Borrow.name)        private borrowModel: Model<BorrowDocument>,
    @InjectModel(BorrowPayment.name) private paymentModel: Model<BorrowPaymentDocument>,
  ) {}

  async findAll(status?: string) {
    const where = status ? { status } : {};
    const docs = await this.borrowModel.find(where)
      .populate('personId')
      .populate({ path: 'payments', options: { sort: { date: -1 } } })
      .sort({ startDate: 1 });
    return docs.map(toRes);
  }

  async create(dto: CreateBorrowDto) {
    const doc = await this.borrowModel.create({
      personId: new Types.ObjectId(dto.personId),
      principal: dto.principal,
      interestRate: dto.interestRate ?? 0,
      startDate: new Date(dto.startDate),
      status: 'ACTIVE',
    });
    const populated = await doc.populate(['personId', 'payments']);
    return toRes(populated);
  }

  async addPayment(id: string, dto: CreatePaymentDto) {
    const borrow = await this.borrowModel.findById(id);
    if (!borrow) throw new NotFoundException('Borrow not found');
    if (borrow.status === 'SETTLED') throw new BadRequestException('Cannot add payment to a settled borrow');

    await this.paymentModel.create({
      borrowId: new Types.ObjectId(id),
      amount: dto.amount,
      date: new Date(dto.date),
      note: dto.note ?? undefined,
    });

    const payments = await this.paymentModel.find({ borrowId: new Types.ObjectId(id) });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalOwed = borrow.principal + calcInterest(borrow.principal, borrow.interestRate, new Date(borrow.startDate)) - totalPaid;
    const newStatus = totalOwed <= 0 ? 'SETTLED' : 'PARTIALLY_RETURNED';

    await this.borrowModel.findByIdAndUpdate(id, { status: newStatus });
    const final = await this.borrowModel.findById(id)
      .populate('personId')
      .populate({ path: 'payments', options: { sort: { date: -1 } } });
    return toRes(final!);
  }

  async settle(id: string) {
    const borrow = await this.borrowModel.findById(id);
    if (!borrow) throw new NotFoundException('Borrow not found');
    await this.borrowModel.findByIdAndUpdate(id, { status: 'SETTLED' });
    const final = await this.borrowModel.findById(id)
      .populate('personId')
      .populate({ path: 'payments', options: { sort: { date: -1 } } });
    return toRes(final!);
  }

  async delete(id: string) {
    const borrow = await this.borrowModel.findById(id);
    if (!borrow) throw new NotFoundException('Borrow not found');
    await this.paymentModel.deleteMany({ borrowId: new Types.ObjectId(id) });
    await this.borrowModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async getSummary() {
    const borrows = await this.borrowModel.find();
    const allPayments = await this.paymentModel.find();

    let totalLent = 0, totalRecovered = 0, totalOutstanding = 0, activeCount = 0;
    for (const b of borrows) {
      totalLent += b.principal;
      const paid = allPayments.filter(p => p.borrowId.equals(b._id)).reduce((s, p) => s + p.amount, 0);
      totalRecovered += paid;
      if (b.status !== 'SETTLED') {
        totalOutstanding += b.principal + calcInterest(b.principal, b.interestRate, new Date(b.startDate)) - paid;
        activeCount++;
      }
    }
    return {
      totalLent: round(totalLent),
      totalRecovered: round(totalRecovered),
      totalOutstanding: round(totalOutstanding),
      activeCount,
    };
  }
}
