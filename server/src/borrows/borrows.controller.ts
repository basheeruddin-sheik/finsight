import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { BorrowsService } from './borrows.service';
import { CreateBorrowDto } from './dto/create-borrow.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('borrows')
export class BorrowsController {
  constructor(private readonly service: BorrowsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Post()
  create(@Body() dto: CreateBorrowDto) {
    return this.service.create(dto);
  }

  @Post(':id/payment')
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePaymentDto) {
    return this.service.addPayment(id, dto);
  }

  @Put(':id/settle')
  settle(@Param('id', ParseIntPipe) id: number) {
    return this.service.settle(id);
  }
}
