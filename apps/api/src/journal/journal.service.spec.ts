import { JournalService } from './journal.service';
import { JournalCryptoService } from './journal-crypto.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = { id: 'user-1', googleId: 'g-123', email: 'test@test.com', name: 'Test', picture: null, createdAt: new Date() };

const mockEntry = {
  id: 'entry-1',
  userId: 'user-1',
  ciphertext: 'encrypted-data',
  timestamp: 1700000000,
  createdAt: new Date(),
};

function makeMocks() {
  const crypto = {
    encrypt: jest.fn().mockReturnValue('encrypted-data'),
    decrypt: jest.fn().mockReturnValue({ date: '2026-01-01', title: 'Hello', description: 'World' }),
  } as unknown as JournalCryptoService;

  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockUser),
    },
    journalEntry: {
      findMany: jest.fn().mockResolvedValue([mockEntry]),
      findFirst: jest.fn().mockResolvedValue(mockEntry),
      create: jest.fn().mockResolvedValue(mockEntry),
      update: jest.fn().mockResolvedValue(mockEntry),
      delete: jest.fn().mockResolvedValue(mockEntry),
    },
  } as unknown as PrismaService;

  return { crypto, prisma };
}

describe('JournalService', () => {
  it('create encrypts data and persists entry', async () => {
    const { crypto, prisma } = makeMocks();
    const svc = new JournalService(prisma, crypto);

    const data = { date: '2026-01-01', title: 'Hello', description: 'World' };
    const result = await svc.create('g-123', data);

    expect(crypto.encrypt).toHaveBeenCalledWith(data);
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ciphertext: 'encrypted-data', userId: 'user-1' }) }),
    );
    expect(result).toMatchObject({ id: 'entry-1', title: 'Hello' });
  });

  it('update merges partial data with existing entry', async () => {
    const { crypto, prisma } = makeMocks();
    const svc = new JournalService(prisma, crypto);

    await svc.update('g-123', 'entry-1', { title: 'Updated title' });

    expect(crypto.decrypt).toHaveBeenCalledWith('encrypted-data');
    expect(crypto.encrypt).toHaveBeenCalledWith({
      date: '2026-01-01',
      title: 'Updated title',
      description: 'World',
    });
  });

  it('delete returns false when entry belongs to another user', async () => {
    const { crypto, prisma } = makeMocks();
    (prisma.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);
    const svc = new JournalService(prisma, crypto);

    const result = await svc.delete('g-123', 'entry-999');

    expect(result).toBe(false);
    expect(prisma.journalEntry.delete).not.toHaveBeenCalled();
  });
});
