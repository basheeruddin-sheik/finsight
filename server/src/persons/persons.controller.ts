import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';

@Controller('persons')
export class PersonsController {
  constructor(private readonly service: PersonsService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.service.findAll(type);
  }

  @Post()
  create(@Body() dto: CreatePersonDto) {
    return this.service.create(dto);
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
