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
    // Listen on all interfaces so devices on the same network can open the app.
    host: true,
    port: 5173,
    // Vite rejects unknown Host headers; allow ngrok tunnels (see README).
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev'],
    // Same-origin API calls in dev: no CORS, and the web client can use baseUrl ''.
    proxy: { '/api': 'http://0.0.0.0:3000' },
  },
});
