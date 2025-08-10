import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { BitrixOAuthResponse } from 'src/dtos/bitrix-oauth-response.dto';

@Injectable()
export class TokenStorageService {
  private readonly file = 'bitrix_token.json';

  saveToken(token: BitrixOAuthResponse | null): void {
    fs.writeFileSync(this.file, JSON.stringify(token ?? {}, null, 2));
  }

  loadToken(): BitrixOAuthResponse | null {
    if (!fs.existsSync(this.file)) return null;
    const content = fs.readFileSync(this.file, 'utf-8');
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
