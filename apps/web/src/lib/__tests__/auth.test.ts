import { getStoredTokens, storeTokens, clearTokens, getGoogleLoginUrl } from '../auth';

beforeEach(() => {
  localStorage.clear();
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
