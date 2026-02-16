import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

@Module({
  imports: [AuthModule],
  controllers: [JournalController],
  providers: [JournalService],
})
export class JournalModule {}
