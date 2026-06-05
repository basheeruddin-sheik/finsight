import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from '../schemas/person.schema';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Borrow, BorrowSchema } from '../schemas/borrow.schema';
import { SplitBalance, SplitBalanceSchema } from '../schemas/split-balance.schema';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Person.name, schema: PersonSchema },
    { name: Transaction.name, schema: TransactionSchema },
    { name: Borrow.name, schema: BorrowSchema },
    { name: SplitBalance.name, schema: SplitBalanceSchema },
  ])],
  controllers: [PersonsController],
  providers: [PersonsService],
})
export class PersonsModule {}
