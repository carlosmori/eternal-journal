import { Body, Controller, Get, Post } from '@nestjs/common';
import { JournalService } from './journal.service';

class CreateQuoteDto {
  quote: string;
}

@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  getQuotes() {
    return this.journalService.getAll();
  }

  @Post()
  createQuote(@Body() dto: CreateQuoteDto) {
    return this.journalService.create(dto.quote);
  }
}
