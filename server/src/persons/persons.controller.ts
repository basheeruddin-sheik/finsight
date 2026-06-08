import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';

@Controller('persons')
export class PersonsController {
  constructor(private readonly service: PersonsService) {}

  @Get()
  findAll(@Query('type') type?: string, @Query('archived') archived?: string) {
    return this.service.findAll(type, archived === 'true');
  }

  @Post()
  create(@Body() dto: CreatePersonDto) {
    return this.service.create(dto);
  }

  @Put(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.setArchived(id, true);
  }

  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.setArchived(id, false);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreatePersonDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
