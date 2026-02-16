import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Response } from 'express';

const REDIRECT_COOKIE = 'oauth_redirect_uri';
const COOKIE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class RedirectUriGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse<Response>();
    const redirectUri = request.query?.redirect_uri as string | undefined;

    if (redirectUri && typeof redirectUri === 'string') {
      res.cookie(REDIRECT_COOKIE, redirectUri, {
        maxAge: COOKIE_MAX_AGE_MS,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    return true;
  }
}

export { REDIRECT_COOKIE };
