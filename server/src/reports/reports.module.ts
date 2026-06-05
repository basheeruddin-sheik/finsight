import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Borrow, BorrowSchema } from '../schemas/borrow.schema';
import { BorrowPayment, BorrowPaymentSchema } from '../schemas/borrow-payment.schema';
import { SplitBalance, SplitBalanceSchema } from '../schemas/split-balance.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Transaction.name, schema: TransactionSchema },
    { name: Borrow.name, schema: BorrowSchema },
    { name: BorrowPayment.name, schema: BorrowPaymentSchema },
    { name: SplitBalance.name, schema: SplitBalanceSchema },
  ])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
