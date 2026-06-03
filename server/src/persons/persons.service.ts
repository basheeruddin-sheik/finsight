import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';

@Injectable()
export class PersonsService {
  constructor(private prisma: PrismaService) {}

  findAll(type?: string) {
    return this.prisma.person.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreatePersonDto) {
    return this.prisma.person.create({ data: dto });
  }

  async delete(id: number) {
    const [txCount, borrowCount] = await Promise.all([
      this.prisma.transaction.count({ where: { personId: id } }),
      this.prisma.borrow.count({ where: { personId: id } }),
    ]);

    if (txCount > 0 || borrowCount > 0) {
      throw new BadRequestException(
        'Cannot delete person with linked transactions or borrows.',
      );
    }

    await this.prisma.splitBalance.deleteMany({ where: { personId: id } });
    return this.prisma.person.delete({ where: { id } });
  }
}
