import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Borrow, BorrowSchema } from '../schemas/borrow.schema';
import { BorrowPayment, BorrowPaymentSchema } from '../schemas/borrow-payment.schema';
import { BorrowsController } from './borrows.controller';
import { BorrowsService } from './borrows.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Borrow.name, schema: BorrowSchema },
    { name: BorrowPayment.name, schema: BorrowPaymentSchema },
  ])],
  controllers: [BorrowsController],
  providers: [BorrowsService],
})
export class BorrowsModule {}
