import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PersonsModule } from './persons/persons.module';
import { BorrowsModule } from './borrows/borrows.module';
import { SplitsModule } from './splits/splits.module';

@Module({
  imports: [PrismaModule, TransactionsModule, PersonsModule, BorrowsModule, SplitsModule],
})
export class AppModule {}
