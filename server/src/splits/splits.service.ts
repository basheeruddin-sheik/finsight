import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SplitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const balances = await this.prisma.splitBalance.findMany({
      include: { person: true },
      orderBy: { person: { name: 'asc' } },
    });
    return balances.map(b => ({
      id: b.id,
      personId: b.personId,
      name: b.person.name,
      balance: b.balance,
      source: b.source,
      lastSyncedAt: b.lastSyncedAt,
    }));
  }

  async setManual(personId: number, balance: number) {
    return this.prisma.splitBalance.upsert({
      where: { personId },
      update: { balance, source: 'MANUAL', lastSyncedAt: new Date() },
      create: { personId, balance, source: 'MANUAL', lastSyncedAt: new Date() },
    });
  }
}
