import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    // This computer only. To test on a phone, run `npm run dev -- --host` on a trusted network:
    // the dev server is not meant to be reachable from public Wi-Fi.
    port: 5173,
  },
});
