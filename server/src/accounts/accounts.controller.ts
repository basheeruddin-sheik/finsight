import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  findAll(@Query('archived') archived?: string) {
    return this.service.findAll(archived === 'true');
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  @Post('transfer')
  transfer(@Body() body: { fromAccountId: string; toAccountId: string; amount: number; note?: string; date?: string }) {
    return this.service.transfer(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateAccountDto>) {
    return this.service.update(id, dto);
  }

  @Put(':id/default')
  setDefault(@Param('id') id: string) {
    return this.service.setDefault(id);
  }

  @Put(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.setArchived(id, true);
  }

  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.setArchived(id, false);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
