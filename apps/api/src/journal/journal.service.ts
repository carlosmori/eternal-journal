import { Injectable } from '@nestjs/common';

export interface JournalEntry {
  id: number;
  date: string;
  title: string;
  description: string;
  timestamp: number;
}

@Injectable()
export class JournalService {
  private store = new Map<string, JournalEntry[]>();

  getAllByUser(userId: string): JournalEntry[] {
    return [...(this.store.get(userId) ?? [])];
  }

  create(
    userId: string,
    data: { date: string; title: string; description: string },
  ): JournalEntry {
    const entries = this.store.get(userId) ?? [];
    const entry: JournalEntry = {
      id: Date.now(),
      date: data.date,
      title: data.title,
      description: data.description,
      timestamp: Math.floor(Date.now() / 1000),
    };
    entries.unshift(entry);
    this.store.set(userId, entries);
    return entry;
  }

  update(
    userId: string,
    entryId: number,
    data: Partial<{ date: string; title: string; description: string }>,
  ): JournalEntry | null {
    const entries = this.store.get(userId);
    if (!entries) return null;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return null;
    if (data.date !== undefined) entry.date = data.date;
    if (data.title !== undefined) entry.title = data.title;
    if (data.description !== undefined) entry.description = data.description;
    return { ...entry };
  }

  delete(userId: string, entryId: number): boolean {
    const entries = this.store.get(userId);
    if (!entries) return false;
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return false;
    entries.splice(idx, 1);
    return true;
  }
}
