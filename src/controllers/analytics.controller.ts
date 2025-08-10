/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from 'src/services/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('leads')
  async leads() {
    return this.analyticsService.getLeadsSummary();
  }

  @Get('deals')
  async deals() {
    return this.analyticsService.getDealsSummary();
  }

  @Get('tasks')
  async tasks() {
    return this.analyticsService.getTasksSummary();
  }
}
