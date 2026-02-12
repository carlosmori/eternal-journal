import { Injectable } from '@nestjs/common';

export interface JournalEntry {
  id: number;
  quote: string;
}

@Injectable()
export class JournalService {
  private entries: JournalEntry[] = [];

  getAll(): JournalEntry[] {
    return [...this.entries];
  }

  create(quote: string): JournalEntry {
    const entry: JournalEntry = {
      id: Date.now(),
      quote,
    };
    this.entries.unshift(entry);
    return entry;
  }
}
