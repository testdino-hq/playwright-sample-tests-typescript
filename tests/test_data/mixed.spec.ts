import { expect, test } from '@playwright/test';
import process from 'node:process';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

test.describe('Passed', {
  tag: ['@chromium', '@firefox', '@mixed', '@passed'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Passed' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2328' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  test('[Passed] Homepage displays the welcome heading', { tag: ['@medium', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.heading')).toHaveText('Welcome to the-internet');
  });

  test('[Passed] Homepage lists all available example links', { tag: ['@low', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('#content ul li a').count()).toBeGreaterThan(30);
  });

  test('[Passed] Checkboxes page loads exactly two checkboxes', { tag: ['@critical', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    await expect(page.locator('#checkboxes input[type="checkbox"]')).toHaveCount(2);
  });

  test('[Passed] Second checkbox is checked by default', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    await expect(page.locator('#checkboxes input[type="checkbox"]').nth(1)).toBeChecked();
  });

  test('[Passed] First checkbox can be toggled on', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    const first = page.locator('#checkboxes input[type="checkbox"]').nth(0);
    await first.check();
    await expect(first).toBeChecked();
  });

  test('[Passed] Dropdown selects Option 1', { tag: ['@low', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await page.locator('#dropdown').selectOption('1');
    await expect(page.locator('#dropdown')).toHaveValue('1');
  });

  test('[Passed] Dropdown selects Option 2', { tag: ['@critical', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await page.locator('#dropdown').selectOption('2');
    await expect(page.locator('#dropdown')).toHaveValue('2');
  });

  test('[Passed] User logs in with valid credentials', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
  });

  test('[Passed] Invalid username shows an error banner', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('not-a-real-user');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('Your username is invalid!');
  });

  test('[Passed] User logs out successfully', { tag: ['@low', '@general'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await page.locator('a[href="/logout"]').click();
    await expect(page.locator('#flash')).toContainText('You logged out of the secure area!');
  });

  test('[Passed] Add Element creates a delete button', { tag: ['@critical', '@general'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    await expect(page.locator('button.added-manually')).toHaveCount(1);
  });

  test('[Passed] Delete button removes the added element', { tag: ['@high', '@general'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    await page.locator('button.added-manually').click();
    await expect(page.locator('button.added-manually')).toHaveCount(0);
  });

  test('[Passed] Status code 200 page reports its code', { tag: ['@medium', '@network'] }, async ({ page }) => {
    await page.goto('/status_codes/200');
    await expect(page.locator('#content p').first()).toContainText('This page returned a 200 status code');
  });

  test('[Passed] Status code 404 page reports its code', { tag: ['@low', '@network'] }, async ({ page }) => {
    await page.goto('/status_codes/404');
    await expect(page.locator('#content p').first()).toContainText('This page returned a 404 status code');
  });

  test('[Passed] Data table renders the expected column headers', { tag: ['@critical', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await expect(page.locator('#table1 thead th')).toHaveText(['Last Name', 'First Name', 'Email', 'Due', 'Web Site', 'Action']);
  });

  test('[Passed] Data table sorts by last name ascending', { tag: ['@high', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Bach');
  });

  test('[Passed] Hovering the first avatar reveals its caption', { tag: ['@medium', '@interactions'] }, async ({ page }) => {
    await page.goto('/hovers');
    const figure = page.locator('.figure').nth(0);
    await figure.hover();
    await expect(figure.locator('.figcaption h5')).toHaveText('name: user1');
  });

  test('[Passed] JS alert is accepted and logged', { tag: ['@low', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Click for JS Alert' }).click();
    await expect(page.locator('#result')).toHaveText('You successfully clicked an alert');
  });

  test('[Passed] JS confirm dismissal is recorded as Cancel', { tag: ['@critical', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
    await expect(page.locator('#result')).toHaveText('You clicked: Cancel');
  });

  test('[Passed] JS prompt accepts typed text', { tag: ['@high', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.accept('mixed suite entry'));
    await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
    await expect(page.locator('#result')).toHaveText('You entered: mixed suite entry');
  });

  test('[Passed] Key press is echoed back to the result field', { tag: ['@medium', '@keyboard'] }, async ({ page }) => {
    await page.goto('/key_presses');
    await page.locator('#target').click();
    await page.locator('#target').press('a');
    await expect(page.locator('#result')).toHaveText('You entered: A');
  });

  test('[Passed] Number input accepts a positive value', { tag: ['@low', '@forms'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('42');
    await expect(input).toHaveValue('42');
  });

  test('[Passed] Dynamic loading reveals the hidden message', { tag: ['@critical', '@performance'] }, async ({ page }) => {
    await page.goto('/dynamic_loading/1');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 10000 });
  });

  test('[Passed] Large DOM renders fifty table rows', { tag: ['@high', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('tr[class^="row-"]')).toHaveCount(50);
  });

  test('[Passed] Challenging DOM renders ten data rows', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/challenging_dom');
    await expect(page.locator('table tbody tr')).toHaveCount(10);
  });
});

const failingUiCases = [
  { name: 'Cart summary panel is missing from the checkout page', path: '/', selector: '#cart-summary-panel', tags: ['@critical', '@checkout'] },
  { name: 'Product filter sidebar no longer renders', path: '/checkboxes', selector: '.filter-sidebar', tags: ['@high', '@visual'] },
  { name: 'Promo banner slot is absent on the catalog', path: '/dropdown', selector: '#promo-banner', tags: ['@medium', '@dialogs'] },
  { name: 'Order status badge is not present in the list', path: '/tables', selector: '.order-status-badge', tags: ['@low', '@checkout'] },
  { name: 'Profile completion widget is missing', path: '/login', selector: '#profile-completion', tags: ['@critical', '@general'] },
  { name: 'Stock indicator is absent from the product tile', path: '/inputs', selector: '.stock-indicator', tags: ['@high', '@catalog'] },
  { name: 'Quick view overlay never mounts', path: '/hovers', selector: '#quick-view-overlay', tags: ['@medium', '@general'] },
  { name: 'Saved for later section is missing', path: '/large', selector: '.saved-for-later', tags: ['@low', '@general'] },
];

test.describe('Failed - UI Error', {
  tag: ['@chromium', '@webkit', '@mixed', '@failed-ui-error'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'UI Error' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1562' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, path, selector, tags } of failingUiCases) {
    test(`[Failed/UI] ${name}`, {
      tag: tags,
      annotation: [
        { type: 'issue', description: `https://jira.example.com/browse/UI-${1000 + name.length * 7}` },
        { type: 'testdino:context', description: `Stale locator "${selector}" - the markup changed underneath this test.` },
      ],
    }, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator(selector),
        `locator "${selector}" did not match anything on ${path}`
      ).toBeVisible({ timeout: 3000 });
    });
  }
});

test.describe('Failed - Actual Bug', {
  tag: ['@chromium', '@android', '@mixed', '@failed-actual-bug'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Actual Bug' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1560' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  test('[Failed/Bug] Homepage heading does not match the required copy', { tag: ['@low', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.heading')).toHaveText('Welcome to The Internet!');
  });

  test('[Failed/Bug] Second checkbox should be unchecked by default', { tag: ['@critical', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    await expect(page.locator('#checkboxes input[type="checkbox"]').nth(1)).not.toBeChecked();
  });

  test('[Failed/Bug] Dropdown should preselect Option 1', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await expect(page.locator('#dropdown')).toHaveValue('1');
  });

  test('[Failed/Bug] Login banner copy does not match requirements', { tag: ['@medium', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('Login successful!');
  });

  test('[Failed/Bug] 404 page should show friendly Page Not Found copy', { tag: ['@low', '@general'] }, async ({ page }) => {
    await page.goto('/status_codes/404');
    await expect(page.locator('#content p').first()).toContainText('Page Not Found');
  });

  test('[Failed/Bug] Key press result should use the Key Pressed format', { tag: ['@critical', '@keyboard'] }, async ({ page }) => {
    await page.goto('/key_presses');
    await page.locator('#target').click();
    await page.locator('#target').press('a');
    await expect(page.locator('#result')).toHaveText('Key Pressed: A');
  });

  test('[Failed/Bug] Large DOM table is missing half of its rows', { tag: ['@high', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('tr[class^="row-"]')).toHaveCount(100);
  });

  test('[Failed/Bug] Broken images page should contain zero broken images', { tag: ['@medium', '@visual'] }, async ({ page }) => {
    await page.goto('/broken_images');
    const broken = await page.locator('#content img').evaluateAll((imgs: any[]) =>
      imgs.filter((img: any) => !img.complete || img.naturalWidth === 0).length
    );
    expect(broken).toBe(0);
  });

  test('[Failed/Bug] Sorted table shows the wrong due amount', { tag: ['@low', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').nth(3)).toHaveText('$100.00');
  });
});

test.describe('Failed - Miscellaneous', {
  tag: ['@chromium', '@ios', '@mixed', '@failed-miscellaneous'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Miscellaneous' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4584' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  test('[Failed/Misc] Throws an unexpected error during setup', { tag: ['@critical', '@data-table'] }, async () => {
    throw new Error('Simulated unexpected failure while preparing the fixture');
  });

  test('[Failed/Misc] Fails to parse a malformed JSON fixture', { tag: ['@high', '@forms'] }, async () => {
    JSON.parse('{ this is not valid json ');
  });

  test('[Failed/Misc] Rejected promise from the data layer', { tag: ['@medium', '@general'] }, async () => {
    await Promise.reject(new Error('Simulated data-layer rejection'));
  });

  test('[Failed/Misc] Navigates to a domain that does not resolve', { tag: ['@low', '@navigation'] }, async ({ page }) => {
    await page.goto('https://this-domain-does-not-exist.testdino-demo.invalid', { timeout: 8000 });
  });

  test('[Failed/Misc] API endpoint returns a non-2xx status', { tag: ['@critical', '@network'] }, async ({ request }) => {
    const response = await request.get('https://the-internet.herokuapp.com/status_codes/500');
    expect(response.ok()).toBeTruthy();
  });

  test('[Failed/Misc] Required environment variable is missing', { tag: ['@high', '@environment'] }, async () => {
    const token = process.env.NONEXISTENT_MIXED_SUITE_TOKEN;
    if (!token) {
      throw new Error('NONEXISTENT_MIXED_SUITE_TOKEN environment variable is not set');
    }
  });

  test('[Failed/Misc] Invalid CSS selector syntax', { tag: ['@medium', '@checkout'] }, async ({ page }) => {
    await page.goto('/');
    await page.locator(':::not-a-valid-selector:::').click();
  });

  test('[Failed/Misc] Simulated CI runner connection reset', { tag: ['@low', '@network'] }, async () => {
    const error = new Error('simulated ECONNRESET from the CI runner network');
    error.name = 'ECONNRESET';
    throw error;
  });
});

const flakyRaceCases = [
  { name: 'Dashboard widget asserted before it renders', path: '/', selector: 'h1.heading', ghost: '.widget-ready', tags: ['@critical', '@visual'] },
  { name: 'Checkbox group hydrates a frame late', path: '/checkboxes', selector: '#checkboxes', ghost: '.checkbox-hydrated', tags: ['@high', '@frames'] },
  { name: 'Dropdown options attach after the query', path: '/dropdown', selector: '#dropdown', ghost: '.options-populated', tags: ['@medium', '@forms'] },
  { name: 'Login field autofill fires after the assertion', path: '/login', selector: '#username', ghost: '.autofill-complete', tags: ['@low', '@auth'] },
  { name: 'Table sorter binds after the header check', path: '/tables', selector: '#table1', ghost: '.tablesorter-ready', tags: ['@critical', '@data-table'] },
  { name: 'Number input debounce delays the commit', path: '/inputs', selector: 'input[type="number"]', ghost: '.input-debounced', tags: ['@high', '@forms'] },
  { name: 'Hover caption transition races the lookup', path: '/hovers', selector: '.figure', ghost: '.hover-ready', tags: ['@medium', '@interactions'] },
];

test.describe('Flaky - Race Condition', {
  tag: ['@chromium', '@firefox', '@mixed', '@flaky-race-condition'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Race Condition' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5958' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, path, selector, ghost, tags } of flakyRaceCases) {
    test(`[Flaky/Race] ${name}`, {
      tag: tags,
      annotation: [{ type: 'testdino:flaky-reason', description: `Race condition: ${name}` }],
    }, async ({ page }, testInfo) => {
      await page.goto(path);
      if (testInfo.retry === 0) {
        await expect(
          page.locator(ghost),
          `element "${ghost}" had not rendered yet when the assertion ran`
        ).toBeVisible({ timeout: 1500 });
      }
      await expect(page.locator(selector).first()).toBeVisible();
    });
  }
});

const flakyNetworkCases = [
  { name: 'Homepage request times out on a cold connection', path: '/', selector: 'h1.heading', tags: ['@low', '@navigation'] },
  { name: 'Checkboxes page hits a transient gateway delay', path: '/checkboxes', selector: '#checkboxes', tags: ['@critical', '@forms'] },
  { name: 'Dropdown navigation exceeds the timeout budget', path: '/dropdown', selector: '#dropdown', tags: ['@high', '@forms'] },
  { name: 'Login page load is interrupted mid-flight', path: '/login', selector: '#username', tags: ['@medium', '@auth'] },
  { name: 'Tables assets are blocked by a slow font fetch', path: '/tables', selector: '#table1', tags: ['@low', '@data-table'] },
  { name: 'Inputs page is delayed by a slow upstream hop', path: '/inputs', selector: 'input[type="number"]', tags: ['@critical', '@forms'] },
];

test.describe('Flaky - Network Instability', {
  tag: ['@chromium', '@webkit', '@mixed', '@flaky-network-instability'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Network Instability' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3824' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, path, selector, tags } of flakyNetworkCases) {
    test(`[Flaky/Network] ${name}`, {
      tag: tags,
      annotation: [{ type: 'testdino:flaky-reason', description: `Network instability: ${name}` }],
    }, async ({ page }, testInfo) => {
      await page.goto(path, { timeout: testInfo.retry === 0 ? 1 : 30000 });
      await expect(page.locator(selector).first()).toBeVisible();
    });
  }
});

const flakyDataCases = [
  { name: 'Search index is still warming when results are read', path: '/', field: 'indexedDocuments', expected: 250, tags: ['@high', '@data-pipeline'] },
  { name: 'Preferences arrive from a late settings call', path: '/checkboxes', field: 'restoredPreferences', expected: 2, tags: ['@medium', '@general'] },
  { name: 'Catalog options arrive from a deferred fetch', path: '/dropdown', field: 'catalogOptions', expected: 2, tags: ['@low', '@catalog'] },
  { name: 'Session token refresh completes after first request', path: '/login', field: 'tokenTtlMinutes', expected: 30, tags: ['@critical', '@auth'] },
  { name: 'Sort comparators register after the table builds', path: '/tables', field: 'sortableColumns', expected: 6, tags: ['@high', '@data-table'] },
  { name: 'Validation rules compile after the input mounts', path: '/inputs', field: 'activeRules', expected: 4, tags: ['@medium', '@forms'] },
];

test.describe('Flaky - Async Data Sync', {
  tag: ['@chromium', '@android', '@mixed', '@flaky-async-data-sync'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Async Data Sync' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2107' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, path, field, expected, tags } of flakyDataCases) {
    test(`[Flaky/Data] ${name}`, {
      tag: tags,
      annotation: [{ type: 'testdino:flaky-reason', description: `Async data sync: ${field} lags the read` }],
    }, async ({ page }, testInfo) => {
      await page.goto(path);
      await expect(page.locator('#content').first()).toBeVisible();
      const actual = testInfo.retry === 0 ? 0 : expected;
      expect(actual, `"${field}" had not finished syncing on the first attempt`).toBe(expected);
    });
  }
});

const flakyEnvCases = [
  { name: 'CI runner drops the connection mid-run', path: '/', code: 'ECONNRESET', message: 'socket hang up while streaming the response', tags: ['@low', '@interactions'] },
  { name: 'Shared test account is locked by a parallel worker', path: '/checkboxes', code: 'AccountLockedError', message: 'account is held by another worker in this shard', tags: ['@critical', '@environment'] },
  { name: 'Catalog service cold start exceeds the budget', path: '/dropdown', code: 'ColdStartError', message: 'catalog service cold start exceeded the budget', tags: ['@high', '@catalog'] },
  { name: 'Auth session expires between shards', path: '/login', code: 'SessionExpiredError', message: 'shared auth session expired before this shard ran', tags: ['@medium', '@auth'] },
  { name: 'Timezone drift breaks the due-date column', path: '/tables', code: 'TimezoneDriftError', message: 'runner timezone drifted from the expected offset', tags: ['@low', '@data-table'] },
  { name: 'Locale data missing from the container image', path: '/inputs', code: 'LocaleMissingError', message: 'ICU locale data was absent from the runner image', tags: ['@critical', '@visual'] },
];

test.describe('Flaky - Environment Instability', {
  tag: ['@chromium', '@ios', '@mixed', '@flaky-environment-instability'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Environment Instability' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4821' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, path, code, message, tags } of flakyEnvCases) {
    test(`[Flaky/Env] ${name}`, {
      tag: tags,
      annotation: [{ type: 'testdino:flaky-reason', description: `${code}: ${message}` }],
    }, async ({ page }, testInfo) => {
      await page.goto(path);
      await expect(page.locator('#content').first()).toBeVisible();
      if (testInfo.retry === 0) {
        const error = new Error(`${message} (attempt ${testInfo.retry + 1})`);
        error.name = code;
        throw error;
      }
    });
  }
});

const skippedNotImplemented = [
  { name: 'Wishlist can be shared with another account', reason: 'Wishlist sharing is not built yet', tags: ['@high', '@catalog'] },
  { name: 'Order history exports as CSV', reason: 'CSV export endpoint is not implemented', tags: ['@medium', '@checkout'] },
  { name: 'Gift wrapping can be added at checkout', reason: 'Gift wrapping is not implemented', tags: ['@low', '@checkout'] },
  { name: 'Loyalty points can be redeemed at checkout', reason: 'Loyalty programme is not implemented', tags: ['@critical', '@checkout'] },
  { name: 'Two-factor authentication can be enabled', reason: '2FA is not implemented in this environment', tags: ['@high', '@auth'] },
  { name: 'Returns can be initiated from the order page', reason: 'Self-service returns are still in design', tags: ['@medium', '@checkout'] },
  { name: 'Checkout supports multiple discount codes', reason: 'Stacked discount codes are not supported yet', tags: ['@low', '@checkout'] },
];

test.describe('Skipped - Feature Not Implemented', {
  tag: ['@chromium', '@firefox', '@mixed', '@skipped-feature-not-implemented'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Feature Not Implemented' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5104' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, reason, tags } of skippedNotImplemented) {
    test.skip(
      `[Skipped/NotImplemented] ${name}`,
      { tag: tags, annotation: { type: 'testdino:context', description: reason } },
      async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1.heading')).toBeVisible();
      }
    );
  }
});

const skippedKnownBug = [
  { name: 'Cart total recalculates after removing the last item', ticket: 'STORE-1042', tags: ['@critical', '@checkout'] },
  { name: 'Address form retains state after a validation error', ticket: 'STORE-1108', tags: ['@high', '@forms'] },
  { name: 'Order list pagination keeps the selected filter', ticket: 'STORE-1173', tags: ['@medium', '@checkout'] },
  { name: 'Password change invalidates other active sessions', ticket: 'STORE-1219', tags: ['@low', '@auth'] },
  { name: 'Coupon field clears after a successful order', ticket: 'STORE-1347', tags: ['@critical', '@checkout'] },
  { name: 'Currency switcher updates all displayed prices', ticket: 'STORE-1671', tags: ['@high', '@catalog'] },
];

test.describe('Skipped - Blocked by Known Bug', {
  tag: ['@chromium', '@webkit', '@mixed', '@skipped-blocked-by-known-bug'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Blocked by Known Bug' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5957' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, ticket, tags } of skippedKnownBug) {
    test(`[Skipped/KnownBug] ${name}`, {
      tag: tags,
      annotation: [{ type: 'issue', description: `https://jira.example.com/browse/${ticket}` }],
    }, async ({ page }) => {
      test.skip(true, `Blocked by open defect ${ticket} - re-enable once the fix ships`);
      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });
  }
});

const skippedEnvironment = [
  { name: 'Safari-only date picker renders the native control', requires: 'webkit', tags: ['@medium', '@visual'] },
  { name: 'Firefox-only print stylesheet applies to the invoice', requires: 'firefox', tags: ['@low', '@checkout'] },
  { name: 'WebKit back-forward cache restores the cart state', requires: 'webkit', tags: ['@critical', '@checkout'] },
  { name: 'Firefox tracking protection blocks the pixel request', requires: 'firefox', tags: ['@high', '@network'] },
  { name: 'Safari autofill populates the billing address', requires: 'webkit', tags: ['@medium', '@checkout'] },
  { name: 'Firefox reader mode strips the promotional banner', requires: 'firefox', tags: ['@low', '@dialogs'] },
];

test.describe('Skipped - Environment Not Supported', {
  tag: ['@chromium', '@android', '@mixed', '@skipped-environment-not-supported'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Environment Not Supported' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1097' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, requires, tags } of skippedEnvironment) {
    test(`[Skipped/Environment] ${name}`, { tag: tags }, async ({ page, browserName }) => {
      test.skip(browserName !== requires, `Requires ${requires} - current browser is ${browserName}`);
      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });
  }
});

const skippedQuarantined = [
  { name: 'Legacy one-page checkout completes an order', reason: 'Legacy checkout is deprecated and pending removal', tags: ['@critical', '@checkout'] },
  { name: 'Flash-sale countdown timer reaches zero', reason: 'Quarantined - timing dependent and unreliable in CI', tags: ['@high', '@general'] },
  { name: 'Deprecated social login button starts the OAuth flow', reason: 'Social login provider was retired', tags: ['@medium', '@auth'] },
  { name: 'Old newsletter modal appears on second visit', reason: 'Quarantined - depends on cookie state across runs', tags: ['@low', '@dialogs'] },
  { name: 'Legacy cart drawer animation completes', reason: 'Quarantined - animation timing is unstable in CI', tags: ['@critical', '@checkout'] },
  { name: 'Deprecated live chat launcher opens the widget', reason: 'Chat vendor is being switched out', tags: ['@high', '@general'] },
];

test.describe('Skipped - Quarantined or Deprecated', {
  tag: ['@chromium', '@ios', '@mixed', '@skipped-quarantined-or-deprecated'],
  annotation: [
    { type: 'testdino:owner', description: 'checkout-squad' },
    { type: 'testdino:feature', description: 'Quarantined or Deprecated' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3795' },
    { type: 'testdino:context', description: 'Mixed-outcome sample data - 25 passed, 25 failed, 25 flaky, 25 skipped.' },
  ],
}, () => {
  for (const { name, reason, tags } of skippedQuarantined) {
    test(`[Skipped/Quarantined] ${name}`, { tag: tags }, async ({ page }) => {
      test.fixme(true, reason);
      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });
  }
});
