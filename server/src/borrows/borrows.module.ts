import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Config, ConfigSchema } from '../schemas/config.schema';
import { BorrowsController } from './borrows.controller';
import { BorrowsService } from './borrows.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Transaction.name, schema: TransactionSchema },
    { name: Config.name, schema: ConfigSchema },
  ])],
  controllers: [BorrowsController],
  providers: [BorrowsService],
  exports: [BorrowsService],
})
export class BorrowsModule {}
