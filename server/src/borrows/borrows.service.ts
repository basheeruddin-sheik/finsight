import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBorrowDto } from './dto/create-borrow.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

function calcInterest(principal: number, rate: number, startDate: Date): number {
  const days = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return principal * (rate / 100) * (days / 365);
}

function calcTotalOwed(principal: number, rate: number, startDate: Date, totalPaid: number): number {
  return principal + calcInterest(principal, rate, startDate) - totalPaid;
}

function enrichBorrow(borrow: any) {
  const totalPaid = borrow.payments?.reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
  const interestOwed = calcInterest(borrow.principal, borrow.interestRate, new Date(borrow.startDate));
  const totalOwed = borrow.principal + interestOwed - totalPaid;
  return { ...borrow, totalPaid, interestOwed: Math.round(interestOwed * 100) / 100, totalOwed: Math.round(totalOwed * 100) / 100 };
}

@Injectable()
export class BorrowsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const borrows = await this.prisma.borrow.findMany({
      where: status ? { status } : undefined,
      include: { person: true, payments: { orderBy: { date: 'desc' } } },
      orderBy: { startDate: 'asc' },
    });
    return borrows.map(enrichBorrow);
  }

  async create(dto: CreateBorrowDto) {
    const person = await this.prisma.person.findUnique({ where: { id: dto.personId } });
    if (!person) throw new BadRequestException('Person not found');

    const borrow = await this.prisma.borrow.create({
      data: {
        personId: dto.personId,
        principal: dto.principal,
        interestRate: dto.interestRate,
        startDate: new Date(dto.startDate),
        status: 'ACTIVE',
      },
      include: { person: true, payments: true },
    });
    return enrichBorrow(borrow);
  }

  async addPayment(id: number, dto: CreatePaymentDto) {
    const borrow = await this.prisma.borrow.findUnique({ where: { id } });
    if (!borrow) throw new NotFoundException('Borrow not found');
    if (borrow.status === 'SETTLED') throw new BadRequestException('Cannot add payment to a settled borrow');

    await this.prisma.borrowPayment.create({
      data: { borrowId: id, amount: dto.amount, date: new Date(dto.date), note: dto.note },
    });

    const updated = await this.prisma.borrow.findUnique({
      where: { id },
      include: { payments: true },
    });

    const totalPaid = updated!.payments.reduce((s, p) => s + p.amount, 0);
    const totalOwed = calcTotalOwed(updated!.principal, updated!.interestRate, new Date(updated!.startDate), totalPaid);
    const newStatus = totalOwed <= 0 ? 'SETTLED' : 'PARTIALLY_RETURNED';

    const final = await this.prisma.borrow.update({
      where: { id },
      data: { status: newStatus },
      include: { person: true, payments: { orderBy: { date: 'desc' } } },
    });
    return enrichBorrow(final);
  }

  async settle(id: number) {
    const borrow = await this.prisma.borrow.findUnique({ where: { id } });
    if (!borrow) throw new NotFoundException('Borrow not found');

    const updated = await this.prisma.borrow.update({
      where: { id },
      data: { status: 'SETTLED' },
      include: { person: true, payments: { orderBy: { date: 'desc' } } },
    });
    return enrichBorrow(updated);
  }

  async delete(id: number) {
    const borrow = await this.prisma.borrow.findUnique({ where: { id } });
    if (!borrow) throw new NotFoundException('Borrow not found');

    await this.prisma.borrowPayment.deleteMany({ where: { borrowId: id } });
    await this.prisma.borrow.delete({ where: { id } });
  }

  async getSummary() {
    const borrows = await this.prisma.borrow.findMany({
      include: { payments: true },
    });

    let totalLent = 0;
    let totalRecovered = 0;
    let totalOutstanding = 0;
    let activeCount = 0;

    for (const b of borrows) {
      totalLent += b.principal;
      const paid = b.payments.reduce((s, p) => s + p.amount, 0);
      totalRecovered += paid;
      if (b.status !== 'SETTLED') {
        totalOutstanding += calcTotalOwed(b.principal, b.interestRate, new Date(b.startDate), paid);
        activeCount++;
      }
    }

    return {
      totalLent: Math.round(totalLent * 100) / 100,
      totalRecovered: Math.round(totalRecovered * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      activeCount,
    };
  }
}
