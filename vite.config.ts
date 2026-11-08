import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'index.html'),
        report: resolve(import.meta.dirname, 'report/index.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
