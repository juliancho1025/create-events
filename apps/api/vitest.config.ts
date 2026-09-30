import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // e2e tests boot an in-memory MongoDB, give them time
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
