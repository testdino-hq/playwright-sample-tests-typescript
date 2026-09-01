import { expect, test } from '@playwright/test';

/**
 * N tests, N = TD_ORCH_FIXTURE_CASES (default 1).
 *
 * This is the test.each guard for AC-D7: changing N changes totalTests but
 * must NOT change suiteFingerprint, because the file set is identical. A
 * fingerprint that moved with the test count would fork the run every time a
 * data-driven case was added.
 */
const CASES = Math.max(1, Number.parseInt(process.env.TD_ORCH_FIXTURE_CASES ?? '1', 10) || 1);

for (let i = 0; i < CASES; i += 1) {
  test(`returns results for query ${i + 1}`, async () => {
    expect(i).toBeGreaterThanOrEqual(0);
  });
}
