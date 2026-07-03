import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Config, ConfigSchema } from '../schemas/config.schema';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Person, PersonSchema } from '../schemas/person.schema';
import { Budget, BudgetSchema } from '../schemas/budget.schema';
import { SplitBalance, SplitBalanceSchema } from '../schemas/split-balance.schema';
import { SplitEntry, SplitEntrySchema } from '../schemas/split-entry.schema';
import { OnboardingService } from './onboarding.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Config.name,       schema: ConfigSchema },
      { name: Transaction.name,  schema: TransactionSchema },
      { name: Person.name,       schema: PersonSchema },
      { name: Budget.name,       schema: BudgetSchema },
      { name: SplitBalance.name, schema: SplitBalanceSchema },
      { name: SplitEntry.name,   schema: SplitEntrySchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
