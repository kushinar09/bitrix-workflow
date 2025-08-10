import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { LeadsController } from 'src/controllers/leads.controller';
import { LeadsService } from 'src/services/lead.service';
import { TokenStorageService } from 'src/services/token-storage.service';
import { TokenService } from 'src/services/token.service';
@Module({
  imports: [
    HttpModule,
    CacheModule.register()
  ],
  controllers: [LeadsController],
  providers: [LeadsService, TokenService, TokenStorageService],
  exports: [LeadsService]
})
export class LeadsModule { }