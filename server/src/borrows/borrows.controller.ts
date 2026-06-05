import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
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
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.service.addPayment(id, dto);
  }

  @Put(':id/settle')
  settle(@Param('id') id: string) {
    return this.service.settle(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
