import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  getMonthlyBreakdown(@Query('month') month: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.reportsService.getMonthlyBreakdown(m);
  }

  @Get('category-trend')
  getCategoryTrend(@Query('category') category: string) {
    return this.reportsService.getCategoryTrend(category);
  }

  @Get('savings-rate')
  getSavingsRateTrend(@Query('months') months: string) {
    return this.reportsService.getSavingsRateTrend(Number(months) || 6);
  }

  @Get('money-outside')
  getMoneyOutside() {
    return this.reportsService.getMoneyOutside();
  }
}
