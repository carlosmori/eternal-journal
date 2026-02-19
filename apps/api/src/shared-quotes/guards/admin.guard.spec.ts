import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from './admin.guard';

function makeGuard(adminEmails: string): AdminGuard {
  const config = { get: (_k: string, defaultVal?: string) => adminEmails ?? defaultVal } as unknown as ConfigService;
  return new AdminGuard(config);
}

function fakeContext(email?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: email ? { email } : undefined }),
    }),
  } as any;
}

describe('AdminGuard', () => {
  it('allows request from admin email', () => {
    const guard = makeGuard('admin@test.com, super@test.com');
    expect(guard.canActivate(fakeContext('admin@test.com'))).toBe(true);
  });

  it('rejects request from non-admin email', () => {
    const guard = makeGuard('admin@test.com');
    expect(() => guard.canActivate(fakeContext('random@test.com'))).toThrow(ForbiddenException);
  });

  it('rejects request without user', () => {
    const guard = makeGuard('admin@test.com');
    expect(() => guard.canActivate(fakeContext())).toThrow(ForbiddenException);
  });

  it('handles case-insensitive email comparison', () => {
    const guard = makeGuard('Admin@Test.com');
    expect(guard.canActivate(fakeContext('admin@test.com'))).toBe(true);
  });
});
