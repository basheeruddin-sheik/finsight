import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PersonsModule } from './persons/persons.module';
import { BorrowsModule } from './borrows/borrows.module';
import { SplitsModule } from './splits/splits.module';
import { ReportsModule } from './reports/reports.module';
import { BudgetsModule } from './budgets/budgets.module';

@Module({
  imports: [PrismaModule, TransactionsModule, PersonsModule, BorrowsModule, SplitsModule, ReportsModule, BudgetsModule],
})
export class AppModule {}
