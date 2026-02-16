import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JournalEntry } from '@prisma/client';

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  async getAllByUser(googleId: string): Promise<JournalEntry[]> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return [];
    return this.prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    googleId: string,
    data: { date: string; title: string; description: string },
  ): Promise<JournalEntry> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { googleId },
    });
    return this.prisma.journalEntry.create({
      data: {
        userId: user.id,
        date: data.date,
        title: data.title,
        description: data.description,
        timestamp: Math.floor(Date.now() / 1000),
      },
    });
  }

  async update(
    googleId: string,
    entryId: string,
    data: Partial<{ date: string; title: string; description: string }>,
  ): Promise<JournalEntry | null> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return null;

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: entryId, userId: user.id },
    });
    if (!entry) return null;

    return this.prisma.journalEntry.update({
      where: { id: entryId },
      data,
    });
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
