import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
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
  createGroup(@Body() body: { iPaid: boolean; legs: { personId: string; amount: number }[]; note?: string; date?: string; myShare?: number; myShareCategory?: string; category?: string; accountId?: string; attachments?: string[] }) {
    return this.service.createGroup(body);
  }

  @Post('settle')
  settle(@Body() body: { personId: string; amount?: number; accountId?: string; date?: string }) {
    return this.service.settle(body.personId, body.amount, body.accountId, body.date);
  }

  @Delete('entry/:id')
  deleteEntry(@Param('id') id: string) {
    return this.service.deleteEntry(id);
  }

  @Put('group/:groupId/attachments')
  setGroupAttachments(@Param('groupId') groupId: string, @Body() body: { attachments: string[] }) {
    return this.service.setGroupAttachments(groupId, body.attachments ?? []);
  }

  @Delete('group/:groupId')
  deleteGroup(@Param('groupId') groupId: string) {
    return this.service.deleteGroup(groupId);
  }
}
