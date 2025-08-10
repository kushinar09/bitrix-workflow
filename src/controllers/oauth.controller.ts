import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { BitrixOAuthResponse } from 'src/dtos/bitrix-oauth-response.dto';
import { TokenStorageService } from 'src/services/token-storage.service';
import { TokenService } from 'src/services/token.service';

@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly tokenStorage: TokenStorageService,
    private readonly configService: ConfigService,
  ) {}

  @Post('install')
  handleInstall(
    @Query('AUTH_ID') accessToken: string,
    @Query('REFRESH_ID') refreshToken: string,
    @Query('AUTH_EXPIRES') expiresIn: number,
    @Query('member_id') userId: string
  ): string {
    console.log(
      `Received install request: AUTH_ID=${accessToken}, REFRESH_ID=${refreshToken}, expiresIn=${expiresIn}`,
    );

    const token: BitrixOAuthResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number(expiresIn),
      domain: this.configService.get<string>('BITRIX_DOMAIN'),
      user_id: userId,
    };

    this.tokenService.saveToken(token);
    return 'App installed successfully!';
  }

  @Get('handle')
  async handleOAuthRedirect(
    @Query('code') code: string,
    @Query('domain') domain: string,
    @Query('member_id') memberId: string,
    @Res() res: Response,
  ) {
    console.log(
      `Received OAuth redirect: code=${code}, domain=${domain}, member_id=${memberId}`,
    );
    try {
      const token = await this.tokenService.exchangeAuthCode(code);
      this.tokenService.saveToken(token);

      const frontendUrl = this.configService.get<string>('FE-URL');
      const html = `<div>App installed successfully via link.</div><a href="${frontendUrl}">Click here to continue</a>`;
      res.status(HttpStatus.OK).send(html);
    } catch (error) {
      console.error('OAuth redirect error:', error);
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'Error during token exchange: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
