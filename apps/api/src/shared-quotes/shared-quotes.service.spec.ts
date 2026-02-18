import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SharedQuotesService } from './shared-quotes.service';
import { QuoteCryptoService } from './quote-crypto.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = { id: 'user-1', googleId: 'g-123' };

function makeMocks() {
  const crypto = {
    encrypt: jest.fn().mockReturnValue('encrypted'),
    decrypt: jest.fn().mockReturnValue('decrypted text'),
  } as unknown as QuoteCryptoService;

  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockUser),
      findUnique: jest.fn().mockResolvedValue(mockUser),
    },
    sharedQuote: {
      create: jest.fn().mockResolvedValue({ id: 'q-1', status: 'PENDING' }),
      findFirst: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;

  return { crypto, prisma };
}

describe('SharedQuotesService', () => {
  it('share throws ConflictException on duplicate sourceEntryId', async () => {
    const { crypto, prisma } = makeMocks();
    const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '6.0.0',
    });
    (prisma.sharedQuote.create as jest.Mock).mockRejectedValue(uniqueError);

    const svc = new SharedQuotesService(prisma, crypto);

    await expect(
      svc.share('g-123', { text: 'hello', sourceEntryId: 'entry-1' }),
    ).rejects.toThrow(ConflictException);
  });
});
