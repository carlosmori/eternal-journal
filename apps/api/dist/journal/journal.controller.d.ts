import { JournalService } from './journal.service';
declare class CreateQuoteDto {
    quote: string;
}
export declare class JournalController {
    private readonly journalService;
    constructor(journalService: JournalService);
    getQuotes(): import("./journal.service").JournalEntry[];
    createQuote(dto: CreateQuoteDto): import("./journal.service").JournalEntry;
}
export {};
