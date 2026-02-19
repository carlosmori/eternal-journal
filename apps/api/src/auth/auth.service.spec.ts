import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  googleId: 'g-123',
  email: 'test@test.com',
  name: 'Test',
  picture: null,
  createdAt: new Date(),
};

function makeMocks() {
  const jwt = {
    sign: jest.fn().mockReturnValue('token'),
    verify: jest.fn().mockReturnValue({ sub: 'g-123', email: 'test@test.com', name: 'Test' }),
  } as unknown as JwtService;

  const prisma = {
    user: {
      upsert: jest.fn().mockResolvedValue(mockUser),
      findUnique: jest.fn().mockResolvedValue(mockUser),
    },
  } as unknown as PrismaService;

  return { jwt, prisma };
}

describe('AuthService', () => {
  it('generateTokens calls sign with correct expiry for access and refresh', () => {
    const { jwt, prisma } = makeMocks();
    const svc = new AuthService(prisma, jwt);

    const result = svc.generateTokens(mockUser as any);

    expect(jwt.sign).toHaveBeenCalledTimes(2);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'g-123', email: 'test@test.com' }),
      { expiresIn: '1h' },
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'g-123', email: 'test@test.com' }),
      { expiresIn: '7d' },
    );
    expect(result).toEqual({ accessToken: 'token', refreshToken: 'token' });
  });

  it('refreshAccessToken throws when user not found', async () => {
    const { jwt, prisma } = makeMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AuthService(prisma, jwt);

    await expect(svc.refreshAccessToken('some-token')).rejects.toThrow('User not found');
  });
});
