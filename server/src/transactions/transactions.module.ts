import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Config, ConfigSchema } from '../schemas/config.schema';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Transaction.name, schema: TransactionSchema },
    { name: Config.name, schema: ConfigSchema },
  ])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
