import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Person, PersonDocument } from '../schemas/person.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { Borrow, BorrowDocument } from '../schemas/borrow.schema';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';
import { CreatePersonDto } from './dto/create-person.dto';

@Injectable()
export class PersonsService {
  constructor(
    @InjectModel(Person.name)        private personModel: Model<PersonDocument>,
    @InjectModel(Transaction.name)   private txnModel: Model<TransactionDocument>,
    @InjectModel(Borrow.name)        private borrowModel: Model<BorrowDocument>,
    @InjectModel(SplitBalance.name)  private splitModel: Model<SplitBalanceDocument>,
  ) {}

  async findAll(type?: string) {
    const where = type ? { type } : {};
    return this.personModel.find(where).sort({ name: 1 });
  }

  async create(dto: CreatePersonDto) {
    return this.personModel.create(dto);
  }

  async update(id: string, dto: Partial<CreatePersonDto>) {
    return this.personModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async delete(id: string) {
    const oid = new Types.ObjectId(id);
    const [txCount, borrowCount] = await Promise.all([
      this.txnModel.countDocuments({ personId: oid }),
      this.borrowModel.countDocuments({ personId: oid }),
    ]);
    if (txCount > 0 || borrowCount > 0) {
      throw new BadRequestException('Cannot delete person with linked transactions or borrows.');
    }
    await this.splitModel.deleteOne({ personId: oid });
    return this.personModel.findByIdAndDelete(id);
  }
}
