import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from 'src/controllers/webhook.controller';
import { WebhookLog } from 'src/webhook/entities/webhook-log.entity';
import { WebhookProcessor } from 'src/webhook/webhook.processor';
import { LeadsService } from 'src/services/lead.service';
import { CacheModule } from '@nestjs/cache-manager';
import { TokenStorageService } from 'src/services/token-storage.service';
import { TokenService } from 'src/services/token.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    CacheModule.register(),
    BullModule.registerQueue({
      name: 'webhook',
    }),
    TypeOrmModule.forFeature([WebhookLog]),
  ],
  controllers: [WebhookController],
  providers: [WebhookProcessor, LeadsService, TokenService, TokenStorageService],
})
export class WebhookModule {}