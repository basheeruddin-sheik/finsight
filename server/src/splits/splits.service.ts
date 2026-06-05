import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SplitwiseFriend {
  id: number;
  first_name: string;
  last_name: string | null;
  balance: Array<{ currency_code: string; amount: string }>;
}

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

  async syncSplitwise() {
    const apiKey = process.env.SPLITWISE_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('SPLITWISE_API_KEY is not set');
    }

    const res = await fetch('https://secure.splitwise.com/api/v3.0/get_friends', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Splitwise API error: ${res.status}`);
    }

    const data = (await res.json()) as { friends: SplitwiseFriend[] };
    const friends = data.friends ?? [];

    const persons = await this.prisma.person.findMany({ where: { type: 'FRIEND' } });
    const personByName = new Map(persons.map(p => [p.name.toLowerCase().trim(), p]));

    let synced = 0;

    for (const friend of friends) {
      const fullName = [friend.first_name, friend.last_name].filter(Boolean).join(' ').trim();
      const person = personByName.get(fullName.toLowerCase());
      if (!person) continue;

      // Use INR balance if available, otherwise first currency
      const balanceEntry =
        friend.balance.find(b => b.currency_code === 'INR') ?? friend.balance[0];
      if (!balanceEntry) continue;

      const balance = parseFloat(balanceEntry.amount);
      if (isNaN(balance)) continue;

      await this.prisma.splitBalance.upsert({
        where: { personId: person.id },
        update: { balance, source: 'SPLITWISE', lastSyncedAt: new Date() },
        create: { personId: person.id, balance, source: 'SPLITWISE', lastSyncedAt: new Date() },
      });
      synced++;
    }

    return { synced, total: friends.length };
  }
}
