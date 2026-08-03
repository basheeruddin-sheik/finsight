import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { SplitsService } from './splits.service';

@Controller('splits')
export class SplitsController {
  constructor(private readonly service: SplitsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('person/:personId')
  findByPerson(@Param('personId') personId: string) {
    return this.service.findByPerson(personId);
  }

  // Create the legs of a shared bill.
  @Post('group')
  createGroup(@Body() body: { iPaid: boolean; legs: { personId: string; amount: number }[]; note?: string; date?: string; myShare?: number; myShareCategory?: string }) {
    return this.service.createGroup(body);
  }

  @Post('settle')
  settle(@Body() body: { personId: string; amount?: number }) {
    return this.service.settle(body.personId, body.amount);
  }

  @Delete('entry/:id')
  deleteEntry(@Param('id') id: string) {
    return this.service.deleteEntry(id);
  }

  @Delete('group/:groupId')
  deleteGroup(@Param('groupId') groupId: string) {
    return this.service.deleteGroup(groupId);
  }
}
