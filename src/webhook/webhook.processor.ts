import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { LeadsService } from './../services/lead.service';

@Processor('webhook')
export class WebhookProcessor {
  constructor(private readonly leadsService: LeadsService) {}

  @Process('processWebhook')
  async handle(job: Job<{ event: string; leadId: number; statusId?: string }>) {
    const { event, leadId, statusId } = job.data;
    if (!leadId) return;

    if (event === 'ONCRMLEADADD') {
      await this.leadsService.handleNewLead(leadId);
    } else if (event === 'ONCRMLEADUPDATE' && statusId === 'CONVERTED') {
      await this.leadsService.handleConvertedLead(leadId);
    }
  }
}