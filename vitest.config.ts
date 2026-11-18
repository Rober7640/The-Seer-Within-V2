import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // same JSX runtime as the app (vite's react plugin), so .tsx under test needs no React import
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/l10n/**/*.test.tsx', 'server/**/*.test.ts', 'shared/*.schema.test.ts', 'client/**/*.test.ts'],
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
