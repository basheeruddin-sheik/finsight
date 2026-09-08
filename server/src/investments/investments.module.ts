import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Config, ConfigSchema } from '../schemas/config.schema';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Transaction.name, schema: TransactionSchema },
    { name: Config.name, schema: ConfigSchema },
  ])],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
