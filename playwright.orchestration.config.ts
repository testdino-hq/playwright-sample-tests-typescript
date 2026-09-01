import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

/**
 * Config for the orchestration FIXTURE suite only -- the known-answer suite the
 * L0 discover-contract tests list against.
 *
 * Deliberately minimal and self-contained:
 *  - no dotenv: anything printed to stdout corrupts `--list --reporter=json`,
 *    which is exactly the output the discover transform parses.
 *  - no TestDino reporter: listing must not open a network connection.
 *  - two projects, so the hand-computed 3 tests x 2 projects = 6 holds.
 *  - integer `workers`: discover reads W from the config and cannot resolve a
 *    percentage at discovery time.
 *
 * These fixtures are listed, never executed. The main playwright.config.ts
 * carries a matching testIgnore so a normal run never picks them up.
 */
const config: PlaywrightTestConfig = {
  testDir: './tests/orchestration/fixtures',
  fullyParallel: true,
  workers: 2,
  timeout: 30 * 1000,
  reporter: [['list']],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
};

export default config;
