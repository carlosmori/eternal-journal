import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return {
      status: 'ok',
      version: process.env.APP_VERSION || 'unknown',
    };
  }
}
