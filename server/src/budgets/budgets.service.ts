import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 1);

    const budgets = await this.prisma.budget.findMany({ where: { month } });

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: from, lt: to }, type: 'EXPENSE' },
    });

    const spentByCategory: Record<string, number> = {};
    for (const t of transactions) {
      const cat = t.category ?? 'OTHER';
      spentByCategory[cat] = (spentByCategory[cat] ?? 0) + t.amount;
    }

    return budgets.map(b => {
      const spent = Math.round((spentByCategory[b.category] ?? 0) * 100) / 100;
      const percentUsed = Math.round((spent / b.monthlyLimit) * 100);
      return {
        ...b,
        spent,
        percentUsed,
        overBudget: percentUsed > 100,
      };
    });
  }

  create(dto: CreateBudgetDto) {
    return this.prisma.budget.upsert({
      where: { category_month: { category: dto.category, month: dto.month } },
      update: { monthlyLimit: dto.monthlyLimit },
      create: { category: dto.category, monthlyLimit: dto.monthlyLimit, month: dto.month },
    });
  }

  update(id: number, dto: UpdateBudgetDto) {
    return this.prisma.budget.update({
      where: { id },
      data: { monthlyLimit: dto.monthlyLimit },
    });
  }

  delete(id: number) {
    return this.prisma.budget.delete({ where: { id } });
  }
}
