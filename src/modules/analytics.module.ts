import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LeadsModule } from './leads.module';
import { AnalyticsController } from 'src/controllers/analytics.controller';
import { AnalyticsService } from 'src/services/analytics.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    HttpModule,
    LeadsModule,
    CacheModule.register()
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
