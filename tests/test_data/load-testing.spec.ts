import { expect, test } from '@playwright/test';

const MODULES = [
  { name: 'Authentication', domain: '@auth', browser: '@firefox', owner: 'identity-squad' },
  { name: 'User Profile', domain: '@auth', browser: '@webkit', owner: 'identity-squad' },
  { name: 'Product Catalog', domain: '@catalog', browser: '@android', owner: 'catalog-squad' },
  { name: 'Product Detail', domain: '@catalog', browser: '@ios', owner: 'catalog-squad' },
  { name: 'Search', domain: '@catalog', browser: '@firefox', owner: 'catalog-squad' },
  { name: 'Shopping Cart', domain: '@checkout', browser: '@webkit', owner: 'checkout-squad' },
  { name: 'Checkout', domain: '@checkout', browser: '@android', owner: 'checkout-squad' },
  { name: 'Payments', domain: '@checkout', browser: '@ios', owner: 'checkout-squad' },
  { name: 'Orders', domain: '@checkout', browser: '@firefox', owner: 'checkout-squad' },
  { name: 'Returns', domain: '@checkout', browser: '@webkit', owner: 'checkout-squad' },
  { name: 'Wishlist', domain: '@catalog', browser: '@android', owner: 'catalog-squad' },
  { name: 'Reviews', domain: '@catalog', browser: '@ios', owner: 'catalog-squad' },
  { name: 'Inventory', domain: '@data-pipeline', browser: '@firefox', owner: 'data-platform' },
  { name: 'Shipping', domain: '@checkout', browser: '@webkit', owner: 'checkout-squad' },
  { name: 'Notifications', domain: '@dialogs', browser: '@android', owner: 'qa-platform' },
  { name: 'Address Book', domain: '@forms', browser: '@ios', owner: 'qa-platform' },
  { name: 'Reporting', domain: '@data-table', browser: '@firefox', owner: 'data-platform' },
  { name: 'Admin Console', domain: '@data-table', browser: '@webkit', owner: 'data-platform' },
  { name: 'Integrations', domain: '@network', browser: '@android', owner: 'qa-platform' },
  { name: 'Localization', domain: '@environment', browser: '@ios', owner: 'qa-platform' },
];

const SCENARIOS = [
  'renders the primary view',
  'handles an empty state',
  'paginates to the second page',
  'applies the default sort order',
  'validates required fields',
  'persists changes after a reload',
  'surfaces a validation error',
  'handles a slow upstream response',
  'recovers from a transient error',
  'respects the permission boundary',
  'filters by the active status',
  'clears an applied filter',
  'supports keyboard navigation',
  'announces changes to assistive technology',
  'renders correctly on a narrow viewport',
  'truncates overflowing text',
  'formats currency for the active locale',
  'formats dates for the active locale',
  'handles a concurrent update',
  'blocks a duplicate submission',
  'restores state from the URL',
  'updates the browser history',
  'handles a cancelled request',
  'retries a failed request once',
  'caches the previous result',
  'invalidates a stale cache entry',
  'debounces rapid input',
  'throttles repeated clicks',
  'shows a loading indicator',
  'hides the loading indicator when complete',
  'reports a server error clearly',
  'handles an expired session',
  'refreshes an expiring token',
  'enforces the maximum length',
  'rejects an invalid payload',
  'accepts the minimum valid payload',
  'exports the current view',
  'imports a valid data file',
  'writes an audit log entry',
  'emits an analytics event',
  'respects the feature flag',
  'falls back when the flag is off',
  'renders an empty search result',
  'highlights the matched term',
  'preserves scroll position',
  'restores focus after a dialog closes',
  'traps focus inside the dialog',
  'closes on the escape key',
  'confirms before a destructive action',
  'rolls back after a failed action',
];

const PRIORITIES = ['@critical', '@high', '@medium', '@low'];

const FAILURE_MODES: ((label: string) => void)[] = [
  (label) => {
    throw new Error(`${label} threw an unexpected error while preparing state`);
  },
  (label) => {
    expect(0, `${label} returned no records when records were expected`).toBe(12);
  },
  (label) => {
    const error = new Error(`${label} lost its upstream connection`);
    error.name = 'ECONNRESET';
    throw error;
  },
];

function outcomeFor(index: number) {
  const slot = index % 20;
  if (slot === 0) return 'skipped';
  if (slot === 5 || slot === 15) return 'flaky';
  if (slot === 1 || slot === 7 || slot === 13) return 'failed';
  return 'passed';
}

function simulateWork(index: number) {
  let checksum = index;
  for (let i = 0; i < 250; i += 1) {
    checksum = (checksum * 31 + i) % 1000003;
  }
  return checksum;
}

MODULES.forEach((module, moduleIndex) => {
  const suiteTags = ['@chromium', module.browser, '@load', `@load-${module.name.toLowerCase().replace(/\s+/g, '-')}`];

  test.describe(`Load - ${module.name}`, {
    tag: suiteTags,
    annotation: [
      { type: 'testdino:owner', description: module.owner },
      { type: 'testdino:feature', description: module.name },
      { type: 'testdino:link', description: `https://jira.example.com/browse/LOAD-${100 + moduleIndex}` },
      { type: 'testdino:context', description: 'Load sample data - 1000 tests at a 70/15/10/5 outcome mix.' },
    ],
  }, () => {
    SCENARIOS.forEach((scenario, scenarioIndex) => {
      const index = moduleIndex * SCENARIOS.length + scenarioIndex;
      const id = String(index + 1).padStart(4, '0');
      const title = `[LOAD-${id}] ${module.name} - ${scenario}`;
      const tags = [PRIORITIES[index % PRIORITIES.length]!, module.domain];
      const outcome = outcomeFor(index);
      const label = `${module.name} / ${scenario}`;

      test(title, {
        tag: tags,
        annotation: [
          {
            type: 'testdino:metric',
            description: JSON.stringify({ id: `LOAD-${id}`, module: module.name, expectedOutcome: outcome }),
          },
        ],
      }, async ({}, testInfo) => {
        const checksum = simulateWork(index);

        if (outcome === 'skipped') {
          test.skip(true, `LOAD-${id} is excluded from the load profile for this cycle`);
        }

        if (outcome === 'failed') {
          FAILURE_MODES[index % FAILURE_MODES.length]!(label);
        }

        if (outcome === 'flaky' && testInfo.retry === 0) {
          throw new Error(`${label} hit a timing race under load on attempt 1`);
        }

        expect(checksum).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
