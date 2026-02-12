export interface JournalEntry {
    id: number;
    quote: string;
}
export declare class JournalService {
    private entries;
    getAll(): JournalEntry[];
    create(quote: string): JournalEntry;
}
