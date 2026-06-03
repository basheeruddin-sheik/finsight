import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: {
    type?: string;
    category?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.search) where.note = { contains: filters.search };

    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    return this.prisma.transaction.findMany({
      where,
      include: { person: true },
      orderBy: { date: 'desc' },
    });
  }

  create(dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        date: new Date(dto.date),
      },
      include: { person: true },
    });
  }

  update(id: number, dto: UpdateTransactionDto) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
      include: { person: true },
    });
  }

  delete(id: number) {
    return this.prisma.transaction.delete({ where: { id } });
  }

  async getSummary(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: from, lt: to } },
    });

    let income = 0;
    let expenses = 0;
    let familyTransfers = 0;
    let borrowsGiven = 0;
    let borrowRecoveries = 0;

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

    return { income, expenses, familyTransfers, borrowsGiven, borrowRecoveries, realSavings, savingsRate };
  }
}
