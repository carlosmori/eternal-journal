import { Module } from '@nestjs/common';
import { JournalModule } from './journal/journal.module';

@Module({
  imports: [JournalModule],
})
export class AppModule {}
