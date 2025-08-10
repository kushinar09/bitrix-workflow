import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';
import { TokenStorageService } from "./token-storage.service";
import { ConfigService } from "@nestjs/config";
import { BitrixOAuthResponse } from "src/dtos/bitrix-oauth-response.dto";
import { URLSearchParams } from "url";
import { lastValueFrom } from "rxjs";
import * as fs from 'fs';

@Injectable()
export class TokenService {
  private readonly baseUrl = 'https://oauth.bitrix.info/oauth/token/';

  constructor(
    private readonly http: HttpService,
    private readonly storageService: TokenStorageService,
    private readonly configService: ConfigService,
  ) {
    console.log(`Initializing TokenService with domain: ${this.configService.get('BITRIX_DOMAIN')}`);
  }

  async exchangeAuthCode(code: string): Promise<BitrixOAuthResponse> {
    const data = new URLSearchParams([
      ['grant_type', 'authorization_code'],
      ['client_id', this.configService.get<string>('BITRIX_CLIENT_ID') ?? ''],
      ['client_secret', this.configService.get<string>('BITRIX_CLIENT_SECRET') ?? ''],
      ['code', code],
    ]);

    console.log(`Attempting token exchange with code: ${code}`);
    console.log(`Form data: ${data.toString()}`);

    try {
      const response = await lastValueFrom(
        this.http.post<BitrixOAuthResponse>(this.baseUrl, data.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const token = response.data;
      token.domain = this.configService.get<string>('BITRIX_DOMAIN');
      return token;
    } catch (error) {
      console.error('Token exchange failed:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error('Token exchange failed: ' + error?.message);
    }
  }

  async refreshToken(): Promise<BitrixOAuthResponse | null> {
    const currentToken = this.storageService.loadToken();
    const refreshToken = currentToken?.refresh_token;

    const data = new URLSearchParams([
      ['grant_type', 'refresh_token'],
      ['client_id', this.configService.get<string>('BITRIX_CLIENT_ID') ?? ''],
      ['client_secret', this.configService.get<string>('BITRIX_CLIENT_SECRET') ?? ''],
      ['refresh_token', refreshToken ?? ''],
    ]);

    try {
      const response = await lastValueFrom(
        this.http.post<BitrixOAuthResponse>(this.baseUrl, data.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const newToken = response.data;
      newToken.domain = this.configService.get<string>('BITRIX_DOMAIN');
      this.saveToken(newToken);
      console.log('Token refreshed successfully:', newToken);
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.saveToken(null);
      return null;
    }
  }

  saveToken(token: BitrixOAuthResponse | null): void {
    this.storageService.saveToken(token);
  }

  @Cron('*/10 * * * *') // Every 10 minutes
  async refreshIfNeeded(): Promise<void> {
    const token = this.storageService.loadToken();
    if (!token) return;

    const stat = fs.statSync('bitrix_token.json');
    const lastModified = stat.mtime.getTime();
    const now = Date.now();

    if (now - lastModified > 55 * 60 * 1000) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        console.log('Token refreshed successfully');
      }
    }
  }
}
