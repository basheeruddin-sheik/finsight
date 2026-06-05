import { Controller, Get, Post, Body } from '@nestjs/common';
import { SplitsService } from './splits.service';

@Controller('splits')
export class SplitsController {
  constructor(private readonly service: SplitsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('manual')
  setManual(@Body() body: { personId: string; balance: number }) {
    return this.service.setManual(body.personId, body.balance);
  }
}
