import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Budget, BudgetSchema } from '../schemas/budget.schema';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Budget.name, schema: BudgetSchema },
    { name: Transaction.name, schema: TransactionSchema },
  ])],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
