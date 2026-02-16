import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  SharedQuotesController,
  AdminSharedQuotesController,
} from './shared-quotes.controller';
import { SharedQuotesService } from './shared-quotes.service';
import { QuoteCryptoService } from './quote-crypto.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [SharedQuotesController, AdminSharedQuotesController],
  providers: [SharedQuotesService, QuoteCryptoService, AdminGuard],
  exports: [SharedQuotesService],
})
export class SharedQuotesModule {}
