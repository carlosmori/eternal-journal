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
import { ShareQuoteDto } from './dto/share-quote.dto';
import { ReviewQuoteDto } from './dto/review-quote.dto';
import { GetBatchQueryDto } from './dto/get-batch-query.dto';

@Controller('shared-quotes')
export class SharedQuotesController {
  constructor(private readonly sharedQuotesService: SharedQuotesService) {}

  @Get('batch')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async getRandomBatch(@Query() query: GetBatchQueryDto) {
    const parsedCount = query.count ? parseInt(query.count, 10) : 5;
    const excludeIds = query.exclude ? query.exclude.split(',').filter(Boolean) : [];
    const quotes = await this.sharedQuotesService.getRandomBatch(parsedCount, excludeIds);
    return { quotes };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async share(@Req() req: Request, @Body() dto: ShareQuoteDto) {
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
    const shared = await this.sharedQuotesService.getSharedByUser(user.userId);
    return { shared };
  }
}

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
  async review(@Param('id') id: string, @Body() dto: ReviewQuoteDto) {
    return this.sharedQuotesService.review(id, dto.status);
  }
}
