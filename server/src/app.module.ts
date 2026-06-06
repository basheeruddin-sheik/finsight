import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsModule } from './transactions/transactions.module';
import { PersonsModule } from './persons/persons.module';
import { BorrowsModule } from './borrows/borrows.module';
import { SplitsModule } from './splits/splits.module';
import { ReportsModule } from './reports/reports.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/finsight'),
    ConfigModule,
    TransactionsModule,
    PersonsModule,
    BorrowsModule,
    SplitsModule,
    ReportsModule,
    BudgetsModule,
  ],
})
export class AppModule {}
