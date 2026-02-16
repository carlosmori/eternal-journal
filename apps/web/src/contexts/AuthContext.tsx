'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAccount } from 'wagmi';
import {
  type Web2User,
  getStoredTokens,
  storeTokens,
  clearTokens,
  fetchMe,
  refreshTokens,
  getGoogleLoginUrl,
} from '@/lib/auth';

interface AuthContextValue {
  web2User: Web2User | null;
  jwt: string | null;
  isWeb2Loading: boolean;
  isConnected: boolean;
  address: string | undefined;
  loginWithGoogle: () => void;
  logoutWeb2: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isConnected, address } = useAccount();
  const [web2User, setWeb2User] = useState<Web2User | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isWeb2Loading, setIsWeb2Loading] = useState(false);

  // On mount: check for stored JWT tokens
  useEffect(() => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (accessToken) {
      setIsWeb2Loading(true);
      fetchMe(accessToken)
        .then((user) => {
          setWeb2User(user);
          setJwt(accessToken);
        })
        .catch(async () => {
          if (refreshToken) {
            try {
              const tokens = await refreshTokens(refreshToken);
              storeTokens(tokens.accessToken, tokens.refreshToken);
              const user = await fetchMe(tokens.accessToken);
              setWeb2User(user);
              setJwt(tokens.accessToken);
            } catch {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        })
        .finally(() => setIsWeb2Loading(false));
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = getGoogleLoginUrl();
  }, []);

  const logoutWeb2 = useCallback(() => {
    clearTokens();
    setWeb2User(null);
    setJwt(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        web2User,
        jwt,
        isWeb2Loading,
        isConnected,
        address,
        loginWithGoogle,
        logoutWeb2,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
