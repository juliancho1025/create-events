import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from './api-client';

/**
 * Where the JWT is persisted. Async so it can be backed by localStorage on the
 * web and expo-secure-store (Keychain/Keystore) in React Native.
 */
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  remove(): Promise<void>;
}

interface ApiContextValue {
  api: ApiClient;
  token: string | null;
  /** False until the stored token has been read. */
  ready: boolean;
  // Function properties (not methods) so they can be destructured safely.
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const ApiContext = createContext<ApiContextValue | null>(null);

/** Must be rendered inside a QueryClientProvider. */
export function ApiProvider({
  baseUrl,
  storage,
  children,
}: {
  baseUrl: string;
  storage: TokenStorage;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void storage
      .get()
      .catch(() => null) // unreadable storage = logged out
      .then((stored) => {
        setToken(stored);
        setReady(true);
      });
  }, [storage]);

  const signOut = useCallback(async () => {
    await storage.remove();
    setToken(null);
    queryClient.clear();
  }, [storage, queryClient]);

  const signIn = useCallback(
    async (newToken: string) => {
      await storage.set(newToken);
      queryClient.clear();
      setToken(newToken);
    },
    [storage, queryClient],
  );

  // Rebuilt when the token changes (cheap: it's a bag of closures).
  const api = useMemo(
    () =>
      createApiClient({
        baseUrl,
        getToken: () => token,
        onUnauthorized: () => void signOut(), // expired or revoked token
      }),
    [baseUrl, token, signOut],
  );

  const value = useMemo(() => ({ api, token, ready, signIn, signOut }), [api, token, ready, signIn, signOut]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApiContext must be used inside <ApiProvider>');
  return ctx;
}

export const useApi = () => useApiContext().api;
