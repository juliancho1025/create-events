import { defaultConfig } from '@tamagui/config/v5';
// Resolves to CSS animations on the web and React Native animations on mobile
// (v5-css.native.ts), so this same config works in an Expo app.
import { animations } from '@tamagui/config/v5-css';
import { createTamagui } from 'tamagui';

export const config = createTamagui({
  ...defaultConfig,
  animations,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
