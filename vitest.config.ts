import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'server/**/*.test.ts', 'shared/*.schema.test.ts'],
    exclude: ['tests/**/*.spec.ts', 'node_modules', 'dist', 'build'],
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
