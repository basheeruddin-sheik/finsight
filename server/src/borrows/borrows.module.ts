import { Module } from '@nestjs/common';
import { BorrowsController } from './borrows.controller';
import { BorrowsService } from './borrows.service';

@Module({
  controllers: [BorrowsController],
  providers: [BorrowsService],
})
export class BorrowsModule {}
