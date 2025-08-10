import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthController } from 'src/controllers/oauth.controller';
import { TokenStorageService } from 'src/services/token-storage.service';
import { TokenService } from 'src/services/token.service';
@Module({
  imports: [HttpModule],
  controllers: [OAuthController],
  providers: [TokenService, TokenStorageService, ConfigService],
})
export class OAuthModule {}