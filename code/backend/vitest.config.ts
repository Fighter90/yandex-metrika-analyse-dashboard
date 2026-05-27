import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      // Bootstrap/entry files (listen/exit, CLI) are excluded from coverage by design.
      exclude: [
        'src/server.ts',
        'src/db/cli-migrate.ts',
        'src/db/cli-seed.ts',
        'src/metrika/cli-sync.ts',
        'src/metrika/cli-auth.ts',
        'src/setup/cli-init.ts',
        'src/metrika/production-sync.ts',
        'src/report/production-report.ts',
        'src/report/pdf/renderer.ts',
        // Server-side chart rendering (Puppeteer + ECharts) — launches a real browser, e2e/manual only.
        'src/report/chart-renderer.ts',
        // AI integration files — require external API, tested via e2e:
        'src/report/ai-insights.ts',
        'src/report/ai-hypotheses.ts',
        'src/utils/logger.ts',
        '**/*.test.ts',
      ],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
