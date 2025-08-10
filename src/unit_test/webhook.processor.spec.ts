/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";
import { LeadsService } from "./../services/lead.service";
import { WebhookProcessor } from "./../webhook/webhook.processor";

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let leadsService: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        {
          provide: LeadsService,
          useValue: {
            handleNewLead: jest.fn(),
            handleConvertedLead: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<WebhookProcessor>(WebhookProcessor);
    leadsService = module.get<LeadsService>(LeadsService);
  });

  it('should call handleNewLead when event is ONCRMLEADADD', async () => {
    const job = { data: { event: 'ONCRMLEADADD', leadId: 123 } } as Job;
    await processor.handle(job);
    expect(leadsService.handleNewLead).toHaveBeenCalledWith(123);
  });

  it('should call handleConvertedLead when event is ONCRMLEADUPDATE and status is CONVERTED', async () => {
    const job = { data: { event: 'ONCRMLEADUPDATE', leadId: 456, statusId: 'CONVERTED' } } as Job;
    await processor.handle(job);
    expect(leadsService.handleConvertedLead).toHaveBeenCalledWith(456);
  });

  it('should not call any service if leadId is missing', async () => {
    const job = { data: { event: 'ONCRMLEADADD' } } as Job;
    await processor.handle(job);
    expect(leadsService.handleNewLead).not.toHaveBeenCalled();
    expect(leadsService.handleConvertedLead).not.toHaveBeenCalled();
  });
});
