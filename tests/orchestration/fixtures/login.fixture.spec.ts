import { expect, test } from '@playwright/test';

// 1 test, deliberately untagged -- so `--grep @smoke` has something to exclude.
test('signs in with valid credentials', async () => {
  expect('ok').toBe('ok');
});
