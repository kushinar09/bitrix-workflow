import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { LeadsModule } from './modules/leads.module';
import { OAuthModule } from './modules/oauth.module';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from './modules/webhook.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as redisStore from 'cache-manager-ioredis';
import { AnalyticsModule } from './modules/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      ttl: 0
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LeadsModule,
    WebhookModule,
    AnalyticsModule,
    OAuthModule
  ],
})
export class AppModule { }
