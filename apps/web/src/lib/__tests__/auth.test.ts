import { getStoredTokens, storeTokens, clearTokens, getGoogleLoginUrl } from '../auth';

const mockStorage: Record<string, string> = {};

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
    },
    writable: true,
  });
});

beforeEach(() => {
  for (const k in mockStorage) delete mockStorage[k];
});

describe('auth utils', () => {
  it('storeTokens then getStoredTokens returns the same tokens', () => {
    storeTokens('access-123', 'refresh-456');
    const { accessToken, refreshToken } = getStoredTokens();

    expect(accessToken).toBe('access-123');
    expect(refreshToken).toBe('refresh-456');
  });

  it('clearTokens removes both tokens', () => {
    storeTokens('access-123', 'refresh-456');
    clearTokens();
    const { accessToken, refreshToken } = getStoredTokens();

    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  it('getGoogleLoginUrl returns the proxy path', () => {
    const url = getGoogleLoginUrl();
    expect(url).toContain('/api/backend/auth/google');
  });
});
