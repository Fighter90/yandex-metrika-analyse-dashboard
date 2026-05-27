import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT) || 5173;
const BASE_URL = `http://localhost:${PORT}`;

// E2E runs against the real frontend; backend calls are mocked at the network
// layer per-test so the suite is deterministic and needs no OAuth token.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // Desktop runs every spec except the mobile-only one.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    // Mobile (iPhone 14, 390×844) runs only the dedicated mobile spec.
    {
      name: 'mobile-iphone-14',
      use: { ...devices['iPhone 14'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm --filter @pca/frontend dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
