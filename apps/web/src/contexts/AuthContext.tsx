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
  type AuthMode,
  type Web2User,
  getStoredTokens,
  storeTokens,
  clearTokens,
  fetchMe,
  refreshTokens,
  getGoogleLoginUrl,
} from '@/lib/auth';

interface AuthContextValue {
  authMode: AuthMode;
  web2User: Web2User | null;
  jwt: string | null;
  isWeb2Loading: boolean;
  loginWithGoogle: () => void;
  logoutWeb2: () => void;
  setAuthMode: (mode: AuthMode) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const [authMode, setAuthModeRaw] = useState<AuthMode>('guest');
  const [web2User, setWeb2User] = useState<Web2User | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isWeb2Loading, setIsWeb2Loading] = useState(false);

  // Determine auth mode based on state
  const setAuthMode = useCallback((mode: AuthMode) => {
    setAuthModeRaw(mode);
  }, []);

  // On mount: check for stored JWT tokens
  useEffect(() => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (accessToken) {
      setIsWeb2Loading(true);
      fetchMe(accessToken)
        .then((user) => {
          setWeb2User(user);
          setJwt(accessToken);
          setAuthModeRaw('web2');
        })
        .catch(async () => {
          // Token expired, try refresh
          if (refreshToken) {
            try {
              const tokens = await refreshTokens(refreshToken);
              storeTokens(tokens.accessToken, tokens.refreshToken);
              const user = await fetchMe(tokens.accessToken);
              setWeb2User(user);
              setJwt(tokens.accessToken);
              setAuthModeRaw('web2');
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

  // Auto-detect Web3 mode when wallet connects
  useEffect(() => {
    if (isConnected && authMode === 'guest') {
      setAuthModeRaw('web3');
    }
    if (!isConnected && authMode === 'web3') {
      setAuthModeRaw(web2User ? 'web2' : 'guest');
    }
  }, [isConnected, authMode, web2User]);

  const loginWithGoogle = useCallback(() => {
    window.location.href = getGoogleLoginUrl();
  }, []);

  const logoutWeb2 = useCallback(() => {
    clearTokens();
    setWeb2User(null);
    setJwt(null);
    setAuthModeRaw(isConnected ? 'web3' : 'guest');
  }, [isConnected]);

  return (
    <AuthContext.Provider
      value={{
        authMode,
        web2User,
        jwt,
        isWeb2Loading,
        loginWithGoogle,
        logoutWeb2,
        setAuthMode,
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
