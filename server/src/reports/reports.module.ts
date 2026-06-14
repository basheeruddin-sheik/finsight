import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Config, ConfigSchema } from '../schemas/config.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { BorrowsModule } from '../borrows/borrows.module';
import { SplitsModule } from '../splits/splits.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Config.name, schema: ConfigSchema },
    ]),
    BorrowsModule,
    SplitsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
