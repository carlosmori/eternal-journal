import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService, GoogleUser } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RedirectUriGuard, REDIRECT_COOKIE } from './guards/redirect-uri.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(RedirectUriGuard, GoogleAuthGuard)
  googleLogin() {
    // RedirectUriGuard stores redirect_uri from query; GoogleAuthGuard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUser;
    const user = await this.authService.findOrCreateUser(googleUser);
    const tokens = this.authService.generateTokens(user);

    const redirectBase =
      (req.cookies?.[REDIRECT_COOKIE] as string | undefined) ||
      this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    res.clearCookie(REDIRECT_COOKIE);

    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    res.redirect(`${redirectBase}/auth/callback?${params.toString()}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    try {
      return this.authService.refreshAccessToken(body.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
