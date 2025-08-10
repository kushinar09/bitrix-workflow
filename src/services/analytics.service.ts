/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LeadsService } from './lead.service';
import { subDays } from 'date-fns';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL_SECONDS = 60 * 15; // 15 minutes

  constructor(
    private readonly leadsService: LeadsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) { }

  // Leads analytics: counts by status
  async getLeadsSummary(): Promise<any> {
    const cacheKey = 'analytics:leads:summary';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // get a list of leads (we only need status field)
    const res = await this.leadsService.call('crm.lead.list', {
      order: { DATE_CREATE: 'DESC' },
      filter: {},
      select: ['ID', 'STATUS_ID']
    });

    const items = res?.result || []; 
    const counts = items.reduce((acc, item) => {
      const s = item.STATUS_ID ?? 'UNKNOWN';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = { counts, total: items.length };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_SECONDS);
    return result;
  }

  // Deals analytics: conversion rate and expected revenue
  async getDealsSummary(): Promise<any> {
    const cacheKey = 'analytics:deals:summary';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Batch request: leads (to count) + deals (to compute revenue)
    const commands: [string, any][] = [
      ['crm.lead.list', { select: ['ID'], order: { DATE_CREATE: 'DESC' } }],
      ['crm.deal.list', { select: ['ID'], order: { DATE_CREATE: 'DESC' } }],
    ];

    const batchRes = await this.leadsService.callBatch(commands, 'analytics:batch:leads_deals');

    const leads = batchRes?.result?.result.cmd0 || [];
    const deals = batchRes?.result?.result.cmd1 || [];

    const totalLeads = Array.isArray(leads) ? leads.length : 0;
    const totalDeals = Array.isArray(deals) ? deals.length : 0;
    const conversionRate = computeConversionRate(totalDeals, totalLeads);

    // compute expected revenue sum (OPPORTUNITY may be string)
    const revenue = deals.reduce((sum, d) => {
      const v = Number(d.OPPORTUNITY ?? d.opportunity ?? 0) || 0;
      return sum + v;
    }, 0);

    const result = { totalLeads, totalDeals, conversionRate, expectedRevenue: revenue };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_SECONDS);
    return result;
  }

  // Tasks analytics: completed tasks per user
  async getTasksSummary(): Promise<any> {
    const inDays = 30; // last 30 days
    const cacheKey = 'analytics:tasks:summary';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Get tasks list
    const res = await this.leadsService.call('tasks.task.list', {
      filter: { '>=DEADLINE': subDays(new Date(), inDays).toISOString() },
      select: ['ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID'],
    });

    const tasks = res?.result?.tasks || res?.result || [];

    const perUser = tasks.reduce((acc, t) => {
      const uid = t.RESPONSIBLE_ID || t.responsible_id || 'unknown';
      const status = t.STATUS ?? t.status;
      if (!acc[uid]) acc[uid] = { total: 0, completed: 0 };
      acc[uid].total += 1;
      if (status === 5 || status === '5' || status === 'STATE_COMPLETED') acc[uid].completed += 1;
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    const result = { perUser, totalTasks: tasks.length };
    await this.cache.set(cacheKey, result, this.CACHE_TTL_SECONDS);
    return result;
  }
}

export function computeConversionRate(dealsCount: number, leadsCount: number): number {
  if (leadsCount === 0) return 0;
  return Number(((dealsCount / leadsCount) * 100).toFixed(2)); // percent with 2 decimals
}
