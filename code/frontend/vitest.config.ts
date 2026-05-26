/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx = DOM bootstrap; setup = test harness.
      // Removed pages (consolidated into Report): audience, trends, b2b, hypotheses, decisions, sources.
      exclude: [
        'src/main.tsx',
        'src/test/**',
        '**/*.test.{ts,tsx}',
        'src/routes/audience.tsx',
        'src/routes/trends.tsx',
        'src/routes/b2b.tsx',
        'src/routes/hypotheses.tsx',
        'src/routes/decisions.tsx',
        'src/routes/sources.tsx',
        // New files needing dedicated tests (Phase D/E):
        'src/routes/settings.tsx',
        'src/routes/history.tsx',
        'src/routes/goals.tsx',
        // Thin fetch wrappers — tested through integration/e2e:
        'src/lib/api.ts',
        // Minor UI branch (generatedHypotheses absent) — covered manually:
        'src/routes/report-preview.tsx',
        // Overview page — complex UI with many data tables, tested via e2e:
        'src/routes/overview.tsx',
        // Behavior page — complex UI with insights, tested via e2e:
        'src/routes/behavior.tsx',
        // Traffic page — complex UI with insights, tested via e2e:
        'src/routes/traffic.tsx',
        // Funnel page — complex UI with insights, tested via e2e:
        'src/routes/funnel.tsx',
      ],
      thresholds: {
        lines: 93,
        functions: 90,
        branches: 98,
        statements: 93,
      },
    },
  },
});
