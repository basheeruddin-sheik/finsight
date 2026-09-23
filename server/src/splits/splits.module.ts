import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Config, ConfigSchema } from '../schemas/config.schema';
import { SplitsController } from './splits.controller';
import { SplitsService } from './splits.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Config.name,      schema: ConfigSchema },
    ]),
    StorageModule,
  ],
  controllers: [SplitsController],
  providers: [SplitsService],
  exports: [SplitsService],
})
export class SplitsModule {}
