import { defineConfig, devices } from '@playwright/test';

// E2E runs against a SEPARATE database (asfit_test) and port, so personal data is never touched.
const PORT = 3100;
const TEST_DB = process.env.E2E_DATABASE_URL ?? 'postgres://asfit:asfit_local@localhost:5433/asfit_test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', // system browser, no download
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: `pnpm exec tsx tests/e2e/prepare-db.ts && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { DATABASE_URL: TEST_DB },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
