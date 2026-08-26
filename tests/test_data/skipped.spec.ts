import { expect, test } from '@playwright/test';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

const notImplementedCases = [
  { name: 'Wishlist can be shared with another account', reason: 'Wishlist sharing is not built yet', tags: ['@critical', '@catalog'] },
  { name: 'User can export their order history as CSV', reason: 'CSV export endpoint is not implemented', tags: ['@high', '@checkout'] },
  { name: 'Saved payment methods can be reordered', reason: 'Payment method ordering is not on the roadmap yet', tags: ['@medium', '@checkout'] },
  { name: 'Product comparison view supports four items', reason: 'Comparison view currently caps at two items', tags: ['@low', '@catalog'] },
  { name: 'Guest checkout converts to a registered account', reason: 'Guest conversion flow is still in design', tags: ['@critical', '@checkout'] },
  { name: 'Bulk delete removes multiple addresses at once', reason: 'Bulk address delete is not implemented', tags: ['@high', '@data-pipeline'] },
  { name: 'Order can be split across multiple shipments', reason: 'Split shipment support is not built', tags: ['@medium', '@checkout'] },
  { name: 'Search supports fuzzy matching on product names', reason: 'Fuzzy search is pending a search-service upgrade', tags: ['@low', '@catalog'] },
  { name: 'Gift wrapping can be added at checkout', reason: 'Gift wrapping is not implemented', tags: ['@critical', '@checkout'] },
  { name: 'Subscription orders can be paused for a month', reason: 'Subscription pause is not built yet', tags: ['@high', '@checkout'] },
  { name: 'Reviews can be filtered by verified purchase', reason: 'Verified-purchase filter is not implemented', tags: ['@medium', '@catalog'] },
  { name: 'Cart can be restored from a previous session', reason: 'Cart persistence across sessions is not built', tags: ['@low', '@auth'] },
  { name: 'Two-factor authentication can be enabled', reason: '2FA is not implemented in this environment', tags: ['@critical', '@auth'] },
  { name: 'Invoice PDF can be regenerated after an address change', reason: 'Invoice regeneration is not implemented', tags: ['@high', '@checkout'] },
  { name: 'Product page shows a live stock counter', reason: 'Live stock counter is pending inventory service work', tags: ['@medium', '@catalog'] },
  { name: 'Refund can be issued to store credit', reason: 'Store credit refunds are not implemented', tags: ['@low', '@checkout'] },
  { name: 'Address book supports international postal formats', reason: 'International address formats are not supported yet', tags: ['@critical', '@forms'] },
  { name: 'Notification preferences can be set per channel', reason: 'Per-channel notification settings are not built', tags: ['@high', '@dialogs'] },
  { name: 'Abandoned cart reminder can be triggered manually', reason: 'Manual reminder trigger is not implemented', tags: ['@medium', '@checkout'] },
  { name: 'Loyalty points can be redeemed at checkout', reason: 'Loyalty programme is not implemented', tags: ['@low', '@checkout'] },
  { name: 'Product bundles can be added as a single line item', reason: 'Bundle support is not built', tags: ['@critical', '@catalog'] },
  { name: 'Order tracking shows carrier milestones', reason: 'Carrier milestone integration is not implemented', tags: ['@high', '@checkout'] },
  { name: 'Returns can be initiated from the order detail page', reason: 'Self-service returns are still in design', tags: ['@medium', '@checkout'] },
  { name: 'Price drop alerts can be subscribed to', reason: 'Price alert service is not implemented', tags: ['@low', '@dialogs'] },
  { name: 'Checkout supports multiple discount codes', reason: 'Stacked discount codes are not supported yet', tags: ['@critical', '@checkout'] },
];

test.describe('Feature Not Implemented', {
  tag: ['@chromium', '@firefox', '@skipped', '@feature-not-implemented'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Feature Not Implemented' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9075' },
    { type: 'testdino:context', description: 'Skip sample data - every test in this suite is skipped.' },
  ],
}, () => {
  for (const { name, reason, tags } of notImplementedCases) {
    test.skip(
      `[Not Implemented] ${name}`,
      { tag: tags, annotation: { type: 'testdino:context', description: reason } },
      async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1.heading')).toBeVisible();
      }
    );
  }
});

const knownBugCases = [
  { name: 'Cart total recalculates after removing the last item', ticket: 'STORE-1042', tags: ['@high', '@checkout'] },
  { name: 'Address form retains state after a validation error', ticket: 'STORE-1108', tags: ['@medium', '@forms'] },
  { name: 'Order list pagination keeps the selected filter', ticket: 'STORE-1173', tags: ['@low', '@checkout'] },
  { name: 'Password change invalidates other active sessions', ticket: 'STORE-1219', tags: ['@critical', '@auth'] },
  { name: 'Product images load in the correct display order', ticket: 'STORE-1265', tags: ['@high', '@checkout'] },
  { name: 'Quantity stepper respects the per-order maximum', ticket: 'STORE-1301', tags: ['@medium', '@checkout'] },
  { name: 'Coupon field clears after a successful order', ticket: 'STORE-1347', tags: ['@low', '@checkout'] },
  { name: 'Review rating stars reflect the submitted score', ticket: 'STORE-1382', tags: ['@critical', '@catalog'] },
  { name: 'Shipping estimate updates when the country changes', ticket: 'STORE-1419', tags: ['@high', '@general'] },
  { name: 'Search results preserve scroll position on back', ticket: 'STORE-1455', tags: ['@medium', '@interactions'] },
  { name: 'Wishlist badge count updates without a refresh', ticket: 'STORE-1490', tags: ['@low', '@catalog'] },
  { name: 'Checkout summary matches the cart subtotal exactly', ticket: 'STORE-1526', tags: ['@critical', '@checkout'] },
  { name: 'Order confirmation email address matches the profile', ticket: 'STORE-1563', tags: ['@high', '@checkout'] },
  { name: 'Category filter resets when navigating to a new section', ticket: 'STORE-1598', tags: ['@medium', '@catalog'] },
  { name: 'Session timeout redirects back to the intended page', ticket: 'STORE-1634', tags: ['@low', '@auth'] },
  { name: 'Currency switcher updates all displayed prices', ticket: 'STORE-1671', tags: ['@critical', '@catalog'] },
  { name: 'Out-of-stock items are blocked at checkout', ticket: 'STORE-1707', tags: ['@high', '@checkout'] },
  { name: 'Profile avatar upload accepts PNG files', ticket: 'STORE-1742', tags: ['@medium', '@upload'] },
  { name: 'Order cancellation restores the reserved stock', ticket: 'STORE-1779', tags: ['@low', '@checkout'] },
  { name: 'Saved address can be set as the default reliably', ticket: 'STORE-1815', tags: ['@critical', '@general'] },
  { name: 'Product tabs keep their selection after a reload', ticket: 'STORE-1851', tags: ['@high', '@forms'] },
  { name: 'Breadcrumb reflects the category the user arrived from', ticket: 'STORE-1888', tags: ['@medium', '@navigation'] },
  { name: 'Newsletter opt-in persists after profile edits', ticket: 'STORE-1924', tags: ['@low', '@general'] },
  { name: 'Cart merges correctly after signing in', ticket: 'STORE-1960', tags: ['@critical', '@checkout'] },
  { name: 'Discount applies before tax is calculated', ticket: 'STORE-1997', tags: ['@high', '@checkout'] },
];

test.describe('Blocked by Known Bug', {
  tag: ['@chromium', '@webkit', '@skipped', '@blocked-by-known-bug'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Blocked by Known Bug' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8938' },
    { type: 'testdino:context', description: 'Skip sample data - every test in this suite is skipped.' },
  ],
}, () => {
  for (const { name, ticket, tags } of knownBugCases) {
    test(`[Known Bug] ${name}`, {
      tag: tags,
      annotation: [{ type: 'issue', description: `https://jira.example.com/browse/${ticket}` }],
    }, async ({ page }) => {
      test.skip(true, `Blocked by open defect ${ticket} - re-enable once the fix ships`);

      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });
  }
});

const environmentCases = [
  { name: 'Safari-only date picker renders the native control', requires: 'webkit', tags: ['@medium', '@visual'] },
  { name: 'Firefox-only print stylesheet applies to the invoice', requires: 'firefox', tags: ['@low', '@checkout'] },
  { name: 'WebKit-only smooth scrolling behaviour on the catalog', requires: 'webkit', tags: ['@critical', '@interactions'] },
  { name: 'Firefox-only PDF viewer opens the packing slip', requires: 'firefox', tags: ['@high', '@downloads'] },
  { name: 'Safari private mode blocks the analytics cookie', requires: 'webkit', tags: ['@medium', '@general'] },
  { name: 'Firefox container tabs isolate the shopping session', requires: 'firefox', tags: ['@low', '@auth'] },
  { name: 'WebKit back-forward cache restores the cart state', requires: 'webkit', tags: ['@critical', '@checkout'] },
  { name: 'Firefox reader mode strips the promotional banner', requires: 'firefox', tags: ['@high', '@dialogs'] },
  { name: 'Safari autofill populates the billing address', requires: 'webkit', tags: ['@medium', '@checkout'] },
  { name: 'Firefox tracking protection blocks the pixel request', requires: 'firefox', tags: ['@low', '@network'] },
  { name: 'iOS Safari viewport handles the sticky checkout bar', requires: 'webkit', tags: ['@critical', '@checkout'] },
  { name: 'Firefox download panel receives the invoice file', requires: 'firefox', tags: ['@high', '@checkout'] },
  { name: 'WebKit touch events drive the image carousel', requires: 'webkit', tags: ['@medium', '@interactions'] },
  { name: 'Firefox devtools protocol captures the console warning', requires: 'firefox', tags: ['@low', '@general'] },
  { name: 'Safari intelligent tracking prevention clears the token', requires: 'webkit', tags: ['@critical', '@auth'] },
  { name: 'Firefox-only CSS subgrid renders the product grid', requires: 'firefox', tags: ['@high', '@data-table'] },
  { name: 'WebKit-only scroll snapping on the gallery', requires: 'webkit', tags: ['@medium', '@interactions'] },
  { name: 'Firefox-only fullscreen API on the product zoom', requires: 'firefox', tags: ['@low', '@catalog'] },
  { name: 'Safari-only share sheet opens for the product link', requires: 'webkit', tags: ['@critical', '@navigation'] },
  { name: 'Firefox-only clipboard permission prompt on copy code', requires: 'firefox', tags: ['@high', '@dialogs'] },
  { name: 'WebKit-only form validation bubble on the email field', requires: 'webkit', tags: ['@medium', '@forms'] },
  { name: 'Firefox-only high contrast mode on the checkout form', requires: 'firefox', tags: ['@low', '@checkout'] },
  { name: 'Safari-only pinch zoom on the product image', requires: 'webkit', tags: ['@critical', '@visual'] },
  { name: 'Firefox-only WebRTC support check in the support widget', requires: 'firefox', tags: ['@high', '@general'] },
  { name: 'WebKit-only service worker cache for offline browsing', requires: 'webkit', tags: ['@medium', '@data-table'] },
];

test.describe('Environment Not Supported', {
  tag: ['@chromium', '@android', '@skipped', '@environment-not-supported'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Environment Not Supported' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1228' },
    { type: 'testdino:context', description: 'Skip sample data - every test in this suite is skipped.' },
  ],
}, () => {
  for (const { name, requires, tags } of environmentCases) {
    test(`[Environment] ${name}`, { tag: tags }, async ({ page, browserName }) => {
      test.skip(browserName !== requires, `Requires ${requires} - current browser is ${browserName}`);

      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });
  }
});

const quarantinedCases = [
  { name: 'Legacy one-page checkout completes an order', reason: 'Legacy checkout is deprecated and pending removal', tags: ['@low', '@checkout'] },
  { name: 'Old wishlist widget adds an item from the grid', reason: 'Widget replaced by the new wishlist panel', tags: ['@critical', '@data-table'] },
  { name: 'Deprecated coupon banner dismisses correctly', reason: 'Banner removed in the current design system', tags: ['@high', '@checkout'] },
  { name: 'Flash-sale countdown timer reaches zero', reason: 'Quarantined - timing dependent and unreliable in CI', tags: ['@medium', '@general'] },
  { name: 'Legacy address autocomplete returns suggestions', reason: 'Third-party autocomplete provider is being replaced', tags: ['@low', '@general'] },
  { name: 'Old order tracking iframe renders the carrier map', reason: 'Carrier iframe is deprecated', tags: ['@critical', '@checkout'] },
  { name: 'Deprecated social login button starts the OAuth flow', reason: 'Social login provider was retired', tags: ['@high', '@auth'] },
  { name: 'Legacy product zoom overlay opens on hover', reason: 'Hover zoom replaced by click-to-zoom', tags: ['@medium', '@interactions'] },
  { name: 'Old newsletter modal appears on second visit', reason: 'Quarantined - depends on cookie state across runs', tags: ['@low', '@dialogs'] },
  { name: 'Deprecated star rating widget accepts half stars', reason: 'Half-star ratings were removed', tags: ['@critical', '@general'] },
  { name: 'Legacy cart drawer animation completes', reason: 'Quarantined - animation timing is unstable in CI', tags: ['@high', '@checkout'] },
  { name: 'Old search suggestion dropdown ranks by popularity', reason: 'Ranking service was replaced', tags: ['@medium', '@forms'] },
  { name: 'Deprecated size guide popup loads its table', reason: 'Size guide moved to an inline component', tags: ['@low', '@data-table'] },
  { name: 'Legacy gift card balance check returns a value', reason: 'Gift card service is being migrated', tags: ['@critical', '@checkout'] },
  { name: 'Old recently-viewed carousel scrolls to the end', reason: 'Quarantined - flaky scroll behaviour', tags: ['@high', '@interactions'] },
  { name: 'Deprecated live chat launcher opens the widget', reason: 'Chat vendor is being switched out', tags: ['@medium', '@general'] },
  { name: 'Legacy stock notification signup succeeds', reason: 'Notification service is deprecated', tags: ['@low', '@dialogs'] },
  { name: 'Old category mega-menu opens on keyboard focus', reason: 'Mega-menu replaced by the new navigation', tags: ['@critical', '@keyboard'] },
  { name: 'Deprecated print-order button opens the dialog', reason: 'Print dialog cannot be asserted reliably in CI', tags: ['@high', '@checkout'] },
  { name: 'Legacy promo code stacking shows a warning', reason: 'Stacking rules were removed', tags: ['@medium', '@general'] },
  { name: 'Old checkout progress bar highlights step three', reason: 'Progress bar replaced in the redesign', tags: ['@low', '@checkout'] },
  { name: 'Deprecated currency banner switches to EUR', reason: 'Currency banner was retired', tags: ['@critical', '@dialogs'] },
  { name: 'Legacy review sort control orders by date', reason: 'Sort control moved into the reviews service', tags: ['@high', '@checkout'] },
  { name: 'Old profile completeness meter reaches 100 percent', reason: 'Completeness meter was removed', tags: ['@medium', '@general'] },
  { name: 'Deprecated referral link generator returns a code', reason: 'Referral programme is on hold', tags: ['@low', '@navigation'] },
];

test.describe('Quarantined or Deprecated', {
  tag: ['@chromium', '@ios', '@skipped', '@quarantined-or-deprecated'],
  annotation: [
    { type: 'testdino:owner', description: 'checkout-squad' },
    { type: 'testdino:feature', description: 'Quarantined or Deprecated' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3926' },
    { type: 'testdino:context', description: 'Skip sample data - every test in this suite is skipped.' },
  ],
}, () => {
  for (const { name, reason, tags } of quarantinedCases) {
    test(`[Quarantined] ${name}`, { tag: tags }, async ({ page }) => {
      test.fixme(true, reason);

      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });
  }
});
