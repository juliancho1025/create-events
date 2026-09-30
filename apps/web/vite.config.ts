import { tamaguiPlugin } from '@tamagui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    // Aliases react-native -> react-native-web and loads tamagui.build.ts.
    tamaguiPlugin(),
  ],
  server: {
    port: 5173,
    // Same-origin API calls in dev: no CORS, and the web client can use baseUrl ''.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
