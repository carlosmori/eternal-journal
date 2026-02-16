import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteCryptoService } from './quote-crypto.service';
import { Prisma } from '@prisma/client';

export interface SharedQuoteDto {
  id: string;
  text: string;
  createdAt: Date;
}

@Injectable()
export class SharedQuotesService {
  constructor(
    private prisma: PrismaService,
    private crypto: QuoteCryptoService,
  ) {}

  async share(
    googleId: string,
    data: { text: string; sourceEntryId?: string },
  ): Promise<{ id: string; status: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { googleId },
    });

    const ciphertext = this.crypto.encrypt(data.text);

    try {
      const quote = await this.prisma.sharedQuote.create({
        data: {
          userId: user.id,
          ciphertext,
          sourceEntryId: data.sourceEntryId ?? null,
          status: 'PENDING',
        },
      });

      return { id: quote.id, status: quote.status };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This entry has already been shared with the community.',
        );
      }
      throw error;
    }
  }

  async unshare(googleId: string, quoteId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return false;

    const quote = await this.prisma.sharedQuote.findFirst({
      where: { id: quoteId, userId: user.id },
    });
    if (!quote) return false;

    await this.prisma.sharedQuote.delete({ where: { id: quoteId } });
    return true;
  }

  async getSharedByUser(
    googleId: string,
  ): Promise<{ sourceEntryId: string; quoteId: string }[]> {
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (!user) return [];

    const quotes = await this.prisma.sharedQuote.findMany({
      where: { userId: user.id },
      select: { id: true, sourceEntryId: true },
    });

    return quotes
      .filter((q): q is { id: string; sourceEntryId: string } => q.sourceEntryId !== null)
      .map((q) => ({ sourceEntryId: q.sourceEntryId, quoteId: q.id }));
  }

  async getRandomBatch(
    count: number,
    excludeIds: string[],
  ): Promise<{ id: string; text: string }[]> {
    const safeCount = Math.min(Math.max(count, 1), 20);

    // Use raw query for random ordering (PostgreSQL)
    const rows = await this.prisma.$queryRaw<
      { id: string; ciphertext: string }[]
    >`
      SELECT id, ciphertext FROM "SharedQuote"
      WHERE status = 'APPROVED'
      ${excludeIds.length > 0 ? Prisma.sql`AND id NOT IN (${Prisma.join(excludeIds)})` : Prisma.empty}
      ORDER BY random()
      LIMIT ${safeCount}
    `;

    return rows.map((row) => ({
      id: row.id,
      text: this.crypto.decrypt(row.ciphertext),
    }));
  }

  async getPending(): Promise<SharedQuoteDto[]> {
    const rows = await this.prisma.sharedQuote.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      text: this.crypto.decrypt(row.ciphertext),
      createdAt: row.createdAt,
    }));
  }

  async getAllForAdmin(
    status?: string,
  ): Promise<(SharedQuoteDto & { status: string })[]> {
    const where = status ? { status } : {};
    const rows = await this.prisma.sharedQuote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      text: this.crypto.decrypt(row.ciphertext),
      status: row.status,
      createdAt: row.createdAt,
    }));
  }

  async review(
    quoteId: string,
    status: 'APPROVED' | 'REJECTED',
  ): Promise<{ id: string; status: string }> {
    const quote = await this.prisma.sharedQuote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    const updated = await this.prisma.sharedQuote.update({
      where: { id: quoteId },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    return { id: updated.id, status: updated.status };
  }
}
