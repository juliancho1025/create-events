import type { TamaguiBuildOptions } from 'tamagui';

// Read by @tamagui/vite-plugin (and by Metro/Expo if a native app is added).
export default {
  config: '../../packages/ui/src/tamagui.config.ts',
  components: ['tamagui'],
  // Skip the optional optimizing compiler: Tamagui's runtime styling works on
  // every platform, and it keeps the build simple. Re-enable for perf later.
  disable: true,
} satisfies TamaguiBuildOptions;
