import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(@Query('month') month: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.budgetsService.findAll(m);
  }

  @Post()
  create(@Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(Number(id), dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.budgetsService.delete(Number(id));
  }
}
