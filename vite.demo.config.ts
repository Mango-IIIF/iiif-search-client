import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  resolve: {
    alias: {
      '@mango-iiif/iiif-search-client': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  server: {
    open: true,
  },
});
