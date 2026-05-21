import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types/**', '**/*.test.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
