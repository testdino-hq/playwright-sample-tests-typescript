import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
import dotenv from 'dotenv';

// quiet: dotenv v17 prints an "injected env" notice to stdout, which
// corrupts `playwright test --list --reporter=json` -- the exact output
// `tdpw orchestrate discover` parses to build the master list.
dotenv.config({ quiet: true });

const isCI = !!process.env.CI;

const config: PlaywrightTestConfig = {
  testDir: './tests',
  // The orchestration fixtures are a known-answer suite for the L0 discover
  // contract: listed, never executed. Their counts are hand-computed, so a
  // normal run must not pick them up.
  testIgnore: '**/orchestration/fixtures/**',
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
    ['@testdino/playwright', {
      token: process.env.TESTDINO_TOKEN,
      serverUrl: process.env.TESTDINO_SERVER_URL,
    }],
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