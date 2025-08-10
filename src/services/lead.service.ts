/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Bottleneck from 'bottleneck';
import { firstValueFrom } from 'rxjs';
import { LeadQueryDto } from 'src/dtos/lead-query.dto';
import { TokenStorageService } from './token-storage.service';
import { TokenService } from './token.service';
import { LeadDto } from 'src/dtos/lead.dto';

@Injectable()
export class LeadsService {
  private limiter: Bottleneck;

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly storageService: TokenStorageService,
    private readonly tokenService: TokenService,
  ) {
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 500, // 500ms between requests
    });
  }

  /**
   * Generic method to call Bitrix24 REST API
   */
  async call<T = any>(method: string, data: any = {}, isRetry = false): Promise<T> {
    const token = this.storageService.loadToken();
    const url = `${token?.domain}/rest/${method}?auth=${token?.access_token}`;

    try {
      return await this.limiter.schedule(() =>
        firstValueFrom(this.httpService.post<T>(url, data)).then(res => res.data),
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const isUnauthorized = status === 401 || status === 403;

      if (!isRetry && isUnauthorized) {
        const newToken = await this.tokenService.refreshToken();
        const retryUrl = `${newToken?.domain}/rest/${method}?auth=${newToken?.access_token}`;
        return this.limiter.schedule(() =>
          firstValueFrom(this.httpService.post<T>(retryUrl, data)).then(res => res.data),
        );
      }

      throw error;
    }
  }

  /**
   * Batch API call with optional caching
   */
  async callBatch(
    commands: [string, any][],
    cacheKey?: string,
  ): Promise<any> {
    if (cacheKey) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const cmdObject = Object.fromEntries(
      commands.map(([cmd, params], i) => [
        `cmd${i}`,
        `${cmd}?${new URLSearchParams(params).toString()}`,
      ]),
    );

    const response = await this.call('batch', { cmd: cmdObject });

    if (cacheKey) await this.cache.set(cacheKey, response, 600);
    return response;
  }

  /**
   * Get list of leads
   */
  async getLeads(query: LeadQueryDto): Promise<any> {
    const cacheKey = `leads:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const filter: Record<string, any> = {};

    if (query.status) {
      if (query.status.startsWith('!')) {
        filter['!STATUS_ID'] = query.status.substring(1);
      } else {
        filter.STATUS_ID = query.status;
      }
    }

    if (query.search) {
      filter['%TITLE'] = query.search;
    }

    if (query.date) {
      filter['>=DATE_CREATE'] = query.date;
    }

    if (query.source) {
      if (query.source.startsWith('!')) {
        filter['!SOURCE_ID'] = query.source.substring(1);
      } else {
        filter.SOURCE_ID = query.source;
      }
    }


    const order = query.sort ? { [query.sort]: 'DESC' } : { DATE_CREATE: 'DESC' };

    const response = this.call('crm.lead.list', {
      order,
      filter,
      select: ['ID', 'TITLE', 'NAME', 'LAST_NAME', 'STATUS_ID', 'SOURCE_ID', 'PHONE', 'EMAIL'],
    });

    await this.cache.set(cacheKey, response, 600);
    return response;
  }


  /**
   * Create a new lead
   */
  async createLead(data: Record<string, any>): Promise<any> {
    return this.call('crm.lead.add', {
      fields: data,
    });
  }

  /**
   * Update an existing lead
   */
  async updateLead(id: number | string, data: Record<string, any>): Promise<any> {
    return this.call('crm.lead.update', {
      id,
      fields: data,
    });
  }

  /**
   * Delete a lead by ID
   */
  async deleteLead(id: number | string): Promise<any> {
    return this.call('crm.lead.delete', { id });
  }

  /**
   * Get a lead by ID
   */
  async getLeadById(id: number | string): Promise<LeadDto | null> {
    return this.call('crm.lead.get', { id });
  }

  async handleNewLead(leadId: number): Promise<void> {
    const lead = await this.getLeadById(leadId);
    if (!lead) return;

    const usersRes = await this.call('user.get', {});
    const users = usersRes?.result || [];

    const assignedUser = await this.getRoundRobinUser(users);
    const taskTitle = `Lead ${leadId} - Follow up Lead: ${lead.title}`;
    const taskDescription = `Phone: ${lead.phone?.[0]?.value ?? 'N/A'}\nEmail: ${lead.email?.[0]?.value ?? 'N/A'}\nSource: ${lead.sourceId}`;

    await this.call('tasks.task.add', {
      fields: {
        TITLE: taskTitle,
        DESCRIPTION: taskDescription,
        CREATED_BY: assignedUser.ID,
        RESPONSIBLE_ID: assignedUser.ID,
      },
    });

    await this.call('im.notify.system.add', {
      USER_ID: assignedUser.ID,
      MESSAGE: `\uD83D\uDD14 New Lead Assigned: ${lead.title}`,
    });
  }

  /** Round-robin selection helper */
  private async getRoundRobinUser(users: any[]): Promise<any> {
    const index = (await this.cache.get<number>('roundRobinIndex')) ?? 0;
    const nextUser = users[index % users.length];
    await this.cache.set('roundRobinIndex', (index + 1) % users.length);
    return nextUser;
  }

  /** Get the next responsible user ID */
  async getNextResponsibleId(): Promise<number> {
    const usersRes = await this.call('user.get', { ACTIVE: true });
    const users = usersRes?.result || [];
    if (!users.length) throw new Error('No users found for round-robin');

    const nextUser = await this.getRoundRobinUser(users);
    return Number(nextUser?.ID);
  }


  /** Handle lead conversion */
  async handleConvertedLead(leadId: number): Promise<void> {
    const lead = await this.getLeadById(leadId);
    if (!lead) return;

    const deal = {
      TITLE: `Deal from Lead: ${lead.title}`,
      LEAD_ID: leadId,
      STAGE_ID: 'NEW',
    };

    await this.call('crm.deal.add', { fields: deal });
  }

  async getRelatedTasks(leadId: number): Promise<any[]> {
    const tasksRes = await this.call('tasks.task.list', {
      filter: {
        '%TITLE': `Lead ${leadId} -`,
      },
    });
    return tasksRes?.result?.tasks || [];
  }

  async getRelatedDeals(leadId: number): Promise<any[]> {
    const dealsRes = await this.call('crm.deal.list', {
      filter: {
        LEAD_ID: leadId,
      },
    });
    return dealsRes?.result || [];
  }

}
