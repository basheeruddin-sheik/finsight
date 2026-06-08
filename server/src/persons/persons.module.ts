import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from '../schemas/person.schema';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { SplitBalance, SplitBalanceSchema } from '../schemas/split-balance.schema';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';
import { BorrowsModule } from '../borrows/borrows.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: SplitBalance.name, schema: SplitBalanceSchema },
    ]),
    BorrowsModule,
  ],
  controllers: [PersonsController],
  providers: [PersonsService],
})
export class PersonsModule {}
