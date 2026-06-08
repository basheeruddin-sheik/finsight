import { Controller, Get, Put, Param } from '@nestjs/common';
import { BorrowsService } from './borrows.service';

@Controller('borrows')
export class BorrowsController {
  constructor(private readonly service: BorrowsService) {}

  @Get('summary')
  getSummary() { return this.service.getSummary(); }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('person/:personId')
  findByPerson(@Param('personId') personId: string) { return this.service.findByPerson(personId); }

  @Put(':id/settle')
  settle(@Param('id') id: string) { return this.service.settle(id); }

  @Put(':id/unsettle')
  unsettle(@Param('id') id: string) { return this.service.unsettle(id); }
}
