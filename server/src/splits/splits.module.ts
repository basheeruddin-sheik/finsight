import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SplitBalance, SplitBalanceSchema } from '../schemas/split-balance.schema';
import { SplitsController } from './splits.controller';
import { SplitsService } from './splits.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: SplitBalance.name, schema: SplitBalanceSchema }])],
  controllers: [SplitsController],
  providers: [SplitsService],
})
export class SplitsModule {}
