import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails: string[];

  constructor(config: ConfigService) {
    const raw = config.get<string>('ADMIN_EMAILS', '');
    this.adminEmails = raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { email?: string } | undefined;

    if (!user?.email) {
      throw new ForbiddenException('Authentication required');
    }

    if (!this.adminEmails.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
