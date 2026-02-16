import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SharedQuotesService } from './shared-quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { Throttle } from '@nestjs/throttler';

// --- Public endpoints ---

@Controller('shared-quotes')
export class SharedQuotesController {
  constructor(private readonly sharedQuotesService: SharedQuotesService) {}

  @Get('batch')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async getRandomBatch(
    @Query('count') count?: string,
    @Query('exclude') exclude?: string,
  ) {
    const parsedCount = count ? parseInt(count, 10) : 5;
    const excludeIds = exclude
      ? exclude.split(',').filter(Boolean)
      : [];
    const quotes =
      await this.sharedQuotesService.getRandomBatch(parsedCount, excludeIds);
    return { quotes };
  }

  // --- Authenticated user endpoints ---

  @Post()
  @UseGuards(JwtAuthGuard)
  async share(
    @Req() req: Request,
    @Body() dto: { text: string; sourceEntryId?: string },
  ) {
    const user = req.user as { userId: string };
    return this.sharedQuotesService.share(user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async unshare(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { userId: string };
    return { deleted: await this.sharedQuotesService.unshare(user.userId, id) };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyShared(@Req() req: Request) {
    const user = req.user as { userId: string };
    const shared =
      await this.sharedQuotesService.getSharedByUser(user.userId);
    return { shared };
  }
}

// --- Admin endpoints ---

@Controller('admin/shared-quotes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSharedQuotesController {
  constructor(private readonly sharedQuotesService: SharedQuotesService) {}

  @Get()
  async getPending(@Query('status') status?: string) {
    if (status) {
      return this.sharedQuotesService.getAllForAdmin(status);
    }
    return this.sharedQuotesService.getPending();
  }

  @Patch(':id')
  async review(
    @Param('id') id: string,
    @Body() dto: { status: 'APPROVED' | 'REJECTED' },
  ) {
    return this.sharedQuotesService.review(id, dto.status);
  }
}
