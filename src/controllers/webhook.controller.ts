/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  OnModuleInit
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { LeadsService } from 'src/services/lead.service';
import { WebhookLog } from 'src/webhook/entities/webhook-log.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('webhook')
export class WebhookController implements OnModuleInit {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectQueue('webhook') private readonly webhookQueue: Queue,
    @InjectRepository(WebhookLog)
    private readonly webhookRepo: Repository<WebhookLog>,
  ) { }

  async onModuleInit() {
    const domain = this.configService.get<string>('BITRIX_WEBHOOK_DOMAIN');
    const url = `${domain}/event.bind`;
    const handlerUrl = this.configService.get<string>('WEBHOOK_HANDLER_URL');

    const events = ['ONCRMLEADADD', 'ONCRMLEADUPDATE'];

    for (const event of events) {
      try {
        const res = await firstValueFrom(
          this.httpService.post(url, {
            event,
            handler: `${handlerUrl}/webhook/lead`,
          }),
        );
        console.log(`Registered webhook for ${event}:`, res.data);
      } catch (err) {
        console.error(`Failed to register ${event}:`, err?.response?.data ?? err.message);
      }
    }
  }

  @Post('lead')
  async handleLeadWebhook(@Body() body: any) {
    const event = body.event;
    const leadId = Number(body?.data?.FIELDS?.ID);
    const statusId = body?.data?.FIELDS?.STATUS_ID;
    const auth = body?.auth;

    if (!['ONCRMLEADADD', 'ONCRMLEADUPDATE'].includes(event)) return { success: false };
    if (!auth?.application_token) return { success: false };

    const log = new WebhookLog();
    log.event = event;
    log.leadId = leadId;
    log.payload = JSON.stringify(body);
    await this.webhookRepo.save(log);

    await this.webhookQueue.add('processWebhook', { event, leadId, statusId });
    return { success: true };
  }
}