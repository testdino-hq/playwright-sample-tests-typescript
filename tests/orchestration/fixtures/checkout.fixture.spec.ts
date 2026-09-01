import { expect, test } from '@playwright/test';

// 1 test, tagged @smoke, inside a describe block.
// The describe matters: AC-D4 asserts the describe title lands between the
// project name and the test title in titlePath.
test.describe('Checkout', () => {
  test('completes an order', { tag: ['@smoke'] }, async () => {
    expect(1 + 1).toBe(2);
  });
});
