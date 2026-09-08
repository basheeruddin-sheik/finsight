import { Controller, Get } from '@nestjs/common';
import { InvestmentsService } from './investments.service';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @Get('summary')
  getSummary() { return this.service.getSummary(); }

  @Get()
  findAll() { return this.service.findAll(); }
}
