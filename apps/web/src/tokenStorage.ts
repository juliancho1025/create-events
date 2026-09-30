import type { TokenStorage } from '@events/shared';

const KEY = 'events.token';

/** Web adapter for the shared TokenStorage port (mobile would use expo-secure-store). */
export const localTokenStorage: TokenStorage = {
  async get() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  async set(token) {
    localStorage.setItem(KEY, token);
  },
  async remove() {
    localStorage.removeItem(KEY);
  },
};
