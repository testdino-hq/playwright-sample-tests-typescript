import { expect, test } from '@playwright/test';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

const skipCases = [
  { name: 'Legacy checkout summary renders the totals panel', path: '/', selector: '#legacy-totals-panel', tags: ['@critical', '@checkout'] },
  { name: 'Deprecated address book widget lists saved entries', path: '/checkboxes', selector: '.address-book-widget', tags: ['@high', '@forms'] },
  { name: 'Old payment selector shows the saved cards', path: '/dropdown', selector: '#saved-cards-selector', tags: ['@critical', '@checkout'] },
  { name: 'Retired promo ribbon appears on the product tile', path: '/hovers', selector: '.promo-ribbon', tags: ['@low', '@visual'] },
  { name: 'Legacy order tracker renders the carrier map', path: '/tables', selector: '#carrier-map', tags: ['@medium', '@checkout'] },
  { name: 'Removed gift message field accepts input', path: '/inputs', selector: '#gift-message', tags: ['@low', '@forms'] },
  { name: 'Obsolete loyalty banner shows the point balance', path: '/login', selector: '.loyalty-balance', tags: ['@medium', '@checkout'] },
  { name: 'Legacy wishlist drawer opens from the header', path: '/', selector: '#wishlist-drawer', tags: ['@high', '@catalog'] },
  { name: 'Deprecated size guide modal loads its table', path: '/large', selector: '#size-guide-modal', tags: ['@low', '@dialogs'] },
  { name: 'Old currency switcher lists all currencies', path: '/dropdown', selector: '#currency-switcher', tags: ['@medium', '@catalog'] },
  { name: 'Retired stock notifier shows the signup form', path: '/forgot_password', selector: '#stock-notifier', tags: ['@low', '@forms'] },
  { name: 'Legacy review sorter orders by helpfulness', path: '/tables', selector: '#review-sorter', tags: ['@medium', '@catalog'] },
  { name: 'Removed referral panel generates a code', path: '/', selector: '#referral-panel', tags: ['@low', '@catalog'] },
  { name: 'Deprecated chat launcher opens the widget', path: '/context_menu', selector: '#chat-launcher', tags: ['@medium', '@interactions'] },
  { name: 'Old bundle builder adds a grouped item', path: '/checkboxes', selector: '#bundle-builder', tags: ['@high', '@catalog'] },
  { name: 'Legacy invoice preview renders the PDF frame', path: '/frames', selector: '#invoice-preview', tags: ['@medium', '@frames'] },
  { name: 'Retired subscription toggle switches the plan', path: '/checkboxes', selector: '#subscription-toggle', tags: ['@high', '@checkout'] },
  { name: 'Removed store credit field applies a balance', path: '/inputs', selector: '#store-credit', tags: ['@medium', '@checkout'] },
  { name: 'Legacy split shipment selector lists options', path: '/dropdown', selector: '#split-shipment', tags: ['@low', '@checkout'] },
  { name: 'Deprecated tax breakdown expands the detail row', path: '/tables', selector: '#tax-breakdown', tags: ['@high', '@data-table'] },
];

test.describe('Action Skip', {
  tag: ['@chromium', '@firefox', '@actions', '@action-skip'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Action Skip' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7025' },
    { type: 'testdino:context', description: 'Test data for the TestDino Create Actions feature (Skip / Quarantine / Tag only).' },
  ],
}, () => {
  for (const { name, path, selector, tags } of skipCases) {
    test(`[Skip] ${name}`, { tag: tags }, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator(selector),
        `"${selector}" no longer exists - this test is a candidate for the Skip action`
      ).toBeVisible({ timeout: 3000 });
    });
  }
});

const quarantineFailingCases = [
  { name: 'Checkout totals match the cart subtotal', path: '/', selector: '#checkout-totals', tags: ['@critical', '@checkout'] },
  { name: 'Shipping step advances to payment', path: '/checkboxes', selector: '#shipping-step', tags: ['@critical', '@checkout'] },
  { name: 'Payment method selection persists on back', path: '/dropdown', selector: '#payment-method', tags: ['@high', '@checkout'] },
  { name: 'Promo code applies before tax', path: '/inputs', selector: '#promo-code', tags: ['@high', '@checkout'] },
  { name: 'Billing address copies from shipping', path: '/forgot_password', selector: '#copy-billing', tags: ['@medium', '@forms'] },
  { name: 'Order review lists every line item', path: '/tables', selector: '#order-review', tags: ['@critical', '@checkout'] },
  { name: 'Guest checkout reaches the confirmation step', path: '/login', selector: '#guest-checkout', tags: ['@high', '@checkout'] },
  { name: 'Delivery slot picker shows available dates', path: '/large', selector: '#delivery-slot', tags: ['@medium', '@checkout'] },
  { name: 'Saved card CVV prompt validates input', path: '/inputs', selector: '#cvv-prompt', tags: ['@high', '@forms'] },
  { name: 'Place order button enables after validation', path: '/checkboxes', selector: '#place-order', tags: ['@critical', '@checkout'] },
  { name: 'Order confirmation shows the reference number', path: '/', selector: '#order-reference', tags: ['@critical', '@checkout'] },
  { name: 'Cart drawer totals update after quantity change', path: '/dropdown', selector: '#cart-drawer', tags: ['@high', '@checkout'] },
  { name: 'Express checkout skips the shipping step', path: '/hovers', selector: '#express-checkout', tags: ['@medium', '@checkout'] },
  { name: 'Multi-currency checkout converts the total', path: '/tables', selector: '#currency-total', tags: ['@medium', '@checkout'] },
  { name: 'Checkout error banner clears on correction', path: '/login', selector: '#checkout-error', tags: ['@high', '@dialogs'] },
];

test.describe('Action Quarantine - Failing', {
  tag: ['@chromium', '@webkit', '@actions', '@action-quarantine'],
  annotation: [
    { type: 'testdino:owner', description: 'checkout-squad' },
    { type: 'testdino:feature', description: 'Action Quarantine' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5233' },
    { type: 'testdino:context', description: 'Test data for the TestDino Create Actions feature (Skip / Quarantine / Tag only).' },
  ],
}, () => {
  for (const { name, path, selector, tags } of quarantineFailingCases) {
    test(`[Quarantine] ${name}`, { tag: tags }, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator(selector),
        `checkout redesign broke this - failure should not break the build once quarantined`
      ).toBeVisible({ timeout: 3000 });
    });
  }
});

test.describe('Action Quarantine - Passing', {
  tag: ['@chromium', '@webkit', '@actions', '@action-quarantine'],
  annotation: [
    { type: 'testdino:owner', description: 'checkout-squad' },
    { type: 'testdino:feature', description: 'Action Quarantine' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9790' },
    { type: 'testdino:context', description: 'Test data for the TestDino Create Actions feature (Skip / Quarantine / Tag only).' },
  ],
}, () => {
  test('[Quarantine] Storefront landing page loads', { tag: ['@critical', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.heading')).toHaveText('Welcome to the-internet');
  });

  test('[Quarantine] Checkout option toggles are selectable', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    const first = page.locator('#checkboxes input[type="checkbox"]').nth(0);
    await first.check();
    await expect(first).toBeChecked();
  });

  test('[Quarantine] Shipping method dropdown accepts a selection', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await page.locator('#dropdown').selectOption('2');
    await expect(page.locator('#dropdown')).toHaveValue('2');
  });

  test('[Quarantine] Registered user signs in before checkout', { tag: ['@critical', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
  });

  test('[Quarantine] Order table renders its column headers', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await expect(page.locator('#table1 thead th')).toHaveText(['Last Name', 'First Name', 'Email', 'Due', 'Web Site', 'Action']);
  });
});

const tagOnlyFailingCases = [
  { name: 'Product grid shows the sale badge', path: '/', selector: '#sale-badge', tags: ['@medium', '@catalog'] },
  { name: 'Search autocomplete ranks by relevance', path: '/checkboxes', selector: '#search-autocomplete', tags: ['@high', '@catalog'] },
  { name: 'Category filter persists across pages', path: '/dropdown', selector: '#category-filter', tags: ['@medium', '@catalog'] },
  { name: 'Product zoom overlay opens on click', path: '/hovers', selector: '#zoom-overlay', tags: ['@low', '@interactions'] },
  { name: 'Review histogram renders all five bars', path: '/tables', selector: '#review-histogram', tags: ['@low', '@visual'] },
  { name: 'Recently viewed carousel scrolls to the end', path: '/large', selector: '#recently-viewed', tags: ['@low', '@interactions'] },
  { name: 'Stock level indicator shows the remaining count', path: '/inputs', selector: '#stock-level', tags: ['@medium', '@catalog'] },
  { name: 'Compare tray accepts a third product', path: '/checkboxes', selector: '#compare-tray', tags: ['@low', '@catalog'] },
  { name: 'Breadcrumb reflects the arrival category', path: '/', selector: '#breadcrumb-trail', tags: ['@medium', '@navigation'] },
  { name: 'Related products rail loads six items', path: '/dropdown', selector: '#related-rail', tags: ['@low', '@catalog'] },
  { name: 'Size selector disables unavailable sizes', path: '/inputs', selector: '#size-selector', tags: ['@high', '@forms'] },
  { name: 'Product video player loads its poster frame', path: '/frames', selector: '#product-video', tags: ['@low', '@frames'] },
  { name: 'Wishlist heart toggles its filled state', path: '/hovers', selector: '#wishlist-heart', tags: ['@medium', '@interactions'] },
  { name: 'Price history chart renders the trend line', path: '/tables', selector: '#price-history', tags: ['@low', '@visual'] },
  { name: 'Delivery estimate updates with the postcode', path: '/forgot_password', selector: '#delivery-estimate', tags: ['@medium', '@forms'] },
];

test.describe('Action Tag Only - Failing', {
  tag: ['@chromium', '@android', '@actions', '@action-tag-only'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Action Tag Only' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1349' },
    { type: 'testdino:context', description: 'Test data for the TestDino Create Actions feature (Skip / Quarantine / Tag only).' },
  ],
}, () => {
  for (const { name, path, selector, tags } of tagOnlyFailingCases) {
    test(`[Tag Only] ${name}`, { tag: tags }, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator(selector),
        `"${selector}" is missing - this failure should still break the build under Tag only`
      ).toBeVisible({ timeout: 3000 });
    });
  }
});

test.describe('Action Tag Only - Passing', {
  tag: ['@chromium', '@android', '@actions', '@action-tag-only'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Action Tag Only' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5906' },
    { type: 'testdino:context', description: 'Test data for the TestDino Create Actions feature (Skip / Quarantine / Tag only).' },
  ],
}, () => {
  test('[Tag Only] Catalog landing page loads', { tag: ['@critical', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('#content ul li a').count()).toBeGreaterThan(30);
  });

  test('[Tag Only] Product status endpoint returns 200', { tag: ['@high', '@network'] }, async ({ page }) => {
    await page.goto('/status_codes/200');
    await expect(page.locator('#content p').first()).toContainText('This page returned a 200 status code');
  });

  test('[Tag Only] Quantity field accepts a numeric value', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('42');
    await expect(input).toHaveValue('42');
  });

  test('[Tag Only] Catalog table sorts by last name', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Bach');
  });

  test('[Tag Only] Product listing renders fifty rows', { tag: ['@low', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('tr[class^="row-"]')).toHaveCount(50);
  });
});
