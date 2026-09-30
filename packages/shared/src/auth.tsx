import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  signIn(token: string): Promise<void>;
  signOut(): Promise<void>;
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
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    storage.get().then((stored) => {
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

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl,
        getToken: () => tokenRef.current,
        onUnauthorized: () => void signOut(), // expired or revoked token
      }),
    [baseUrl, signOut],
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
