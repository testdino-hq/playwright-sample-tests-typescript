import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

const isCI = !!process.env.CI;

const config: PlaywrightTestConfig = {
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  ...(isCI ? { workers: 1 } : {}),

  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['json', { outputFile: './playwright-report/report.json' }],
  ],

  use: {
    baseURL: 'https://storedemo.testdino.com/',
    headless: true,
    actionTimeout: 30 * 1000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

export default config;