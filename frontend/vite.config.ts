import path from 'node:path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE(step 11): a `base: '/<repo-name>/'` option will be added here for GitHub Pages deployment.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
