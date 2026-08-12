import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Person, PersonDocument } from '../schemas/person.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { SplitBalance, SplitBalanceDocument } from '../schemas/split-balance.schema';
import { CreatePersonDto } from './dto/create-person.dto';
import { BorrowsService } from '../borrows/borrows.service';

@Injectable()
export class PersonsService {
  constructor(
    @InjectModel(Person.name)        private personModel: Model<PersonDocument>,
    @InjectModel(Transaction.name)   private txnModel: Model<TransactionDocument>,
    @InjectModel(SplitBalance.name)  private splitModel: Model<SplitBalanceDocument>,
    private borrows: BorrowsService,
  ) {}

  async findAll(type?: string, archived?: boolean) {
    const where: any = { archived: archived === true ? true : { $ne: true } };
    if (type) where.type = type;
    return this.personModel.find(where).sort({ name: 1 });
  }

  async create(dto: CreatePersonDto) {
    // Case-insensitive uniqueness among active people of the same type — a
    // duplicate "Raju" would silently fragment their balance/history across
    // two separate person records instead of one.
    const name = dto.name.trim();
    const existing = await this.personModel.findOne({
      type: dto.type,
      archived: { $ne: true },
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (existing) {
      throw new BadRequestException(`${existing.name} already exists`);
    }
    return this.personModel.create({ ...dto, name });
  }

  async update(id: string, dto: Partial<CreatePersonDto>) {
    return this.personModel.findByIdAndUpdate(id, dto, { returnDocument: 'after' });
  }

  // Soft delete: hide from lists/pickers but keep all linked records intact.
  // Cannot archive while a borrow is still open (not fully returned).
  async setArchived(id: string, archived: boolean) {
    if (archived && await this.borrows.hasOpenBorrows(id)) {
      throw new BadRequestException('Cannot archive: this person has an active borrow. Settle it (full repayment) first.');
    }
    return this.personModel.findByIdAndUpdate(id, { archived }, { returnDocument: 'after' });
  }

  async delete(id: string) {
    const oid = new Types.ObjectId(id);
    const txCount = await this.txnModel.countDocuments({ personId: oid });
    if (txCount > 0) {
      throw new BadRequestException('Cannot delete person with linked transactions or borrows.');
    }
    await this.splitModel.deleteOne({ personId: oid });
    return this.personModel.findByIdAndDelete(id);
  }
}
