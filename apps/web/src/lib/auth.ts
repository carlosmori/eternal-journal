export type AuthMode = 'guest' | 'web2' | 'web3';

const API_URL = '/api/backend';

const TOKEN_KEY = 'eternal-journal-jwt';
const REFRESH_KEY = 'eternal-journal-refresh';

export interface Web2User {
  userId: string;
  email: string;
  name: string;
}

export function getStoredTokens() {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getGoogleLoginUrl() {
  const base = `${API_URL}/auth/google`;
  if (typeof window !== 'undefined') {
    const redirectUri = encodeURIComponent(window.location.origin);
    return `${base}?redirect_uri=${redirectUri}`;
  }
  return base;
}

export async function fetchMe(accessToken: string): Promise<Web2User> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}
