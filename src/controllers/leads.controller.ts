import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { LeadDto } from "src/dtos/lead.dto";
import { LeadQueryDto } from "src/dtos/lead-query.dto";
import { LeadsService } from "src/services/lead.service";

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) { }

  @Get()
  findAll(@Query() query: LeadQueryDto) {
    // console.log('Query:', query);
    return this.leadsService.getLeads(query);
  }

  @Post()
  create(@Body() dto: LeadDto) {
    // console.log('Create Lead DTO:', dto);
    return this.leadsService.createLead(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: LeadDto) {
    // console.log('Update Lead ID:', id, 'DTO:', dto);
    return this.leadsService.updateLead(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // console.log('Delete Lead ID:', id);
    return this.leadsService.deleteLead(+id);
  }

  @Get(':id/tasks')
  async getTasksForLead(@Param('id') id: string) {
    return this.leadsService.getRelatedTasks(Number(id));
  }

  @Get(':id/deals')
  async getDealsForLead(@Param('id') id: string) {
    return this.leadsService.getRelatedDeals(Number(id));
  }


  // @Get(':id/tasks')
  // getTasks(@Param('id') id: string) {
  //   return this.leadsService.getTasks(+id);
  // }

  // @Get(':id/deals')
  // getDeals(@Param('id') id: string) {
  //   return this.leadsService.getDeals(+id);
  // }
}