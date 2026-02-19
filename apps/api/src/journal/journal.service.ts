import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalCryptoService } from './journal-crypto.service';

export interface JournalEntryDto {
  id: string;
  date: string;
  title: string;
  description: string;
  timestamp: number;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class JournalService {
  constructor(
    private prisma: PrismaService,
    private crypto: JournalCryptoService,
  ) {}

  async getAllByUser(googleId: string): Promise<JournalEntryDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return [];

    const rows = await this.prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => {
      const plain = this.crypto.decrypt(row.ciphertext);
      return {
        id: row.id,
        date: plain.date,
        title: plain.title,
        description: plain.description,
        timestamp: row.timestamp,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  async create(
    googleId: string,
    data: { date: string; title: string; description: string },
  ): Promise<JournalEntryDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { googleId },
    });

    const ciphertext = this.crypto.encrypt({
      date: data.date,
      title: data.title,
      description: data.description,
    });

    const row = await this.prisma.journalEntry.create({
      data: {
        userId: user.id,
        ciphertext,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });

    return {
      id: row.id,
      date: data.date,
      title: data.title,
      description: data.description,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async update(
    googleId: string,
    entryId: string,
    data: Partial<{ date: string; title: string; description: string }>,
  ): Promise<JournalEntryDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return null;

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, userId: user.id },
    });
    if (!entry) return null;

    // Decrypt current values, merge with updates, re-encrypt
    const current = this.crypto.decrypt(entry.ciphertext);
    const merged = {
      date: data.date ?? current.date,
      title: data.title ?? current.title,
      description: data.description ?? current.description,
    };

    const ciphertext = this.crypto.encrypt(merged);

    const row = await this.prisma.journalEntry.update({
      where: { id: entryId },
      data: { ciphertext },
    });

    return {
      id: row.id,
      date: merged.date,
      title: merged.title,
      description: merged.description,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async delete(googleId: string, entryId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return false;

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, userId: user.id },
    });
    if (!entry) return false;

    await this.prisma.journalEntry.delete({ where: { id: entryId } });
    return true;
  }
}
