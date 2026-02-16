import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { JournalCryptoService } from './journal-crypto.service';

@Module({
  imports: [AuthModule],
  controllers: [JournalController],
  providers: [JournalService, JournalCryptoService],
  exports: [JournalCryptoService],
})
export class JournalModule {}
