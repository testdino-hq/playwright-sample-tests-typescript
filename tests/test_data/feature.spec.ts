import { expect, test, type APIRequestContext } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { setTimeout as sleep } from 'node:timers/promises';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

const BASIC_AUTH = `Basic ${Buffer.from('admin:admin').toString('base64')}`;

test.describe('Split 1 - API Contract', {
  tag: ['@api', '@split', '@split-api'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'API Contract' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7100' },
    { type: 'testdino:context', description: 'Split 1 of 5 - runs under --project=api with no browser, assigned by project.' },
  ],
}, () => {
  test('[Split/API] Status endpoint returns 200', { tag: ['@critical', '@network'] }, async ({ request }) => {
    const response = await request.get('/status_codes/200');
    expect(response.status()).toBe(200);
  });

  test('[Split/API] Status endpoint returns a raw 301', { tag: ['@high', '@network'] }, async ({ request }) => {
    const response = await request.get('/status_codes/301', { maxRedirects: 0 });
    expect(response.status()).toBe(301);
  });

  test('[Split/API] Status endpoint returns 404', { tag: ['@high', '@network'] }, async ({ request }) => {
    const response = await request.get('/status_codes/404');
    expect(response.status()).toBe(404);
  });

  test('[Split/API] Status endpoint returns 500', { tag: ['@critical', '@network'] }, async ({ request }) => {
    const response = await request.get('/status_codes/500');
    expect(response.status()).toBe(500);
  });

  test('[Split/API] Redirect endpoint answers with a 302', { tag: ['@high', '@network'] }, async ({ request }) => {
    const response = await request.get('/redirect', { maxRedirects: 0 });
    expect(response.status()).toBe(302);
  });

  test('[Split/API] Redirect endpoint sends a Location header', { tag: ['@medium', '@network'] }, async ({ request }) => {
    const response = await request.get('/redirect', { maxRedirects: 0 });
    expect(response.headers()['location']).toBeTruthy();
  });

  test('[Split/API] Protected route rejects anonymous access', { tag: ['@critical', '@auth'] }, async ({ request }) => {
    const response = await request.get('/basic_auth');
    expect(response.status()).toBe(401);
  });

  test('[Split/API] Protected route accepts valid credentials', { tag: ['@critical', '@auth'] }, async ({ request }) => {
    const response = await request.get('/basic_auth', { headers: { Authorization: BASIC_AUTH } });
    expect(response.status()).toBe(200);
  });

  test('[Split/API] Protected route greets an authorised caller', { tag: ['@high', '@auth'] }, async ({ request }) => {
    const response = await request.get('/basic_auth', { headers: { Authorization: BASIC_AUTH } });
    expect(await response.text()).toContain('Congratulations!');
  });

  test('[Split/API] Notification endpoint answers with a redirect', { tag: ['@medium', '@network'] }, async ({ request }) => {
    const response = await request.get('/notification_message', { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });

  test('[Split/API] Landing page is served as HTML', { tag: ['@high', '@navigation'] }, async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['content-type']).toContain('text/html');
  });

  test('[Split/API] Landing page carries the welcome copy', { tag: ['@critical', '@navigation'] }, async ({ request }) => {
    const response = await request.get('/');
    expect(await response.text()).toContain('Welcome to the-internet');
  });

  test('[Split/API] Landing page advertises every example route', { tag: ['@medium', '@navigation'] }, async ({ request }) => {
    const body = await response(request, '/');
    const links = body.match(/href='\/[a-z_]+'/g) || [];
    expect(links.length).toBeGreaterThan(30);
  });

  test('[Split/API] Status index links to all four codes', { tag: ['@medium', '@network'] }, async ({ request }) => {
    const body = await response(request, '/status_codes');
    for (const code of [200, 301, 404, 500]) {
      expect(body).toContain(`status_codes/${code}`);
    }
  });

  test('[Split/API] Download listing exposes at least one file', { tag: ['@high', '@downloads'] }, async ({ request }) => {
    const body = await response(request, '/download');
    expect((body.match(/href="download\//g) || []).length).toBeGreaterThan(0);
  });

  test('[Split/API] Downloaded asset is sent as an attachment', { tag: ['@critical', '@downloads'] }, async ({ request }) => {
    const body = await response(request, '/download');
    const first = (body.match(/href="(download\/[^"]+)"/) || [])[1];
    expect(first).toBeTruthy();
    const asset = await request.get(`/${first}`);
    expect(asset.headers()['content-disposition']).toContain('attachment');
  });

  test('[Split/API] Table page returns real table markup', { tag: ['@medium', '@data-table'] }, async ({ request }) => {
    const body = await response(request, '/tables');
    expect(body).toContain('id="table1"');
    expect(body).toContain('Last Name');
  });

  test('[Split/API] Challenging DOM returns ten data rows', { tag: ['@medium', '@data-table'] }, async ({ request }) => {
    const body = await response(request, '/challenging_dom');
    expect((body.match(/<td>Iuvaret\d<\/td>/g) || []).length).toBe(10);
  });

  test('[Split/API] Large DOM payload is substantial', { tag: ['@low', '@performance'] }, async ({ request }) => {
    const body = await response(request, '/large');
    expect(body.length).toBeGreaterThan(50000);
  });

  test('[Split/API] Upload page exposes its form controls', { tag: ['@high', '@upload'] }, async ({ request }) => {
    const body = await response(request, '/upload');
    expect(body).toContain("id='file-upload'");
    expect(body).toContain("id='file-submit'");
  });
});

async function response(request: APIRequestContext, path: string) {
  const res = await request.get(path);
  expect(res.status()).toBe(200);
  return res.text();
}

test.describe('Split 2 - UI Smoke', {
  tag: ['@chromium', '@split', '@split-smoke'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'UI Smoke' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7200' },
    { type: 'testdino:context', description: 'Split 2 of 5 - the only split that is additionally sharded, assigned by --grep @split-smoke.' },
  ],
}, () => {
  test('[Split/Smoke] Landing page shows the welcome heading', { tag: ['@critical', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.heading')).toHaveText('Welcome to the-internet');
  });

  test('[Split/Smoke] Landing page lists the example links', { tag: ['@high', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('#content ul li a').count()).toBeGreaterThan(30);
  });

  test('[Split/Smoke] User signs in with valid credentials', { tag: ['@critical', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
  });

  test('[Split/Smoke] User signs out again', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await page.locator('a[href="/logout"]').click();
    await expect(page.locator('#flash')).toContainText('You logged out of the secure area!');
  });

  test('[Split/Smoke] Invalid credentials are rejected', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('wrong-user');
    await page.locator('#password').fill('wrong-pass');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('Your username is invalid!');
  });

  test('[Split/Smoke] Checkbox can be toggled on', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    const first = page.locator('#checkboxes input[type="checkbox"]').nth(0);
    await first.check();
    await expect(first).toBeChecked();
  });

  test('[Split/Smoke] Dropdown accepts a selection', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await page.locator('#dropdown').selectOption('1');
    await expect(page.locator('#dropdown')).toHaveValue('1');
  });

  test('[Split/Smoke] Number field accepts a value', { tag: ['@low', '@forms'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('99');
    await expect(input).toHaveValue('99');
  });

  test('[Split/Smoke] Element can be added to the list', { tag: ['@medium', '@interactions'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    await expect(page.locator('button.added-manually')).toHaveCount(1);
  });

  test('[Split/Smoke] Element can be removed again', { tag: ['@medium', '@interactions'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    await page.locator('button.added-manually').click();
    await expect(page.locator('button.added-manually')).toHaveCount(0);
  });

  test('[Split/Smoke] Alert dialog is accepted', { tag: ['@high', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Click for JS Alert' }).click();
    await expect(page.locator('#result')).toHaveText('You successfully clicked an alert');
  });

  test('[Split/Smoke] Confirm dialog is dismissed', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
    await expect(page.locator('#result')).toHaveText('You clicked: Cancel');
  });

  test('[Split/Smoke] Table renders its column headers', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await expect(page.locator('#table1 thead th')).toHaveText(['Last Name', 'First Name', 'Email', 'Due', 'Web Site', 'Action']);
  });

  test('[Split/Smoke] Table sorts by last name', { tag: ['@high', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Bach');
  });

  test('[Split/Smoke] Key press is echoed back', { tag: ['@low', '@keyboard'] }, async ({ page }) => {
    await page.goto('/key_presses');
    await page.locator('#target').click();
    await page.locator('#target').press('a');
    await expect(page.locator('#result')).toHaveText('You entered: A');
  });

  test('[Split/Smoke] Hover reveals the first caption', { tag: ['@low', '@interactions'] }, async ({ page }) => {
    await page.goto('/hovers');
    const figure = page.locator('.figure').nth(0);
    await figure.hover();
    await expect(figure.locator('.figcaption h5')).toHaveText('name: user1');
  });

  test('[Split/Smoke] Status page reports a 200', { tag: ['@medium', '@network'] }, async ({ page }) => {
    await page.goto('/status_codes/200');
    await expect(page.locator('#content p').first()).toContainText('This page returned a 200 status code');
  });

  test('[Split/Smoke] Drag columns show their labels', { tag: ['@low', '@interactions'] }, async ({ page }) => {
    await page.goto('/drag_and_drop');
    await expect(page.locator('#column-a')).toHaveText('A');
    await expect(page.locator('#column-b')).toHaveText('B');
  });

  test('[Split/Smoke] Floating menu stays visible', { tag: ['@low', '@navigation'] }, async ({ page }) => {
    await page.goto('/floating_menu');
    await page.mouse.wheel(0, 800);
    await expect(page.locator('#menu')).toBeVisible();
  });

  test('[Split/Smoke] Forgot password form is reachable', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/forgot_password');
    await expect(page.locator('h2')).toHaveText('Forgot Password');
    await expect(page.locator('#email')).toBeVisible();
  });
});

test.describe('Split 3 - UI Regression', {
  tag: ['@chromium', '@split', '@split-regression'],
  annotation: [
    { type: 'testdino:owner', description: 'catalog-squad' },
    { type: 'testdino:feature', description: 'UI Regression' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7300' },
    { type: 'testdino:context', description: 'Split 3 of 5 - assigned by --grep @split-regression.' },
  ],
}, () => {
  test('[Split/Regression] Deep DOM renders fifty rows', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('tr[class^="row-"]')).toHaveCount(50);
  });

  test('[Split/Regression] Challenging DOM renders ten rows', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/challenging_dom');
    await expect(page.locator('table tbody tr')).toHaveCount(10);
  });

  test('[Split/Regression] Nested frames expose every panel', { tag: ['@high', '@frames'] }, async ({ page }) => {
    await page.goto('/nested_frames');
    const top = page.frameLocator('frame[name="frame-top"]');
    await expect(top.frameLocator('frame[name="frame-left"]').locator('body')).toHaveText('LEFT');
    await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toHaveText('BOTTOM');
  });

  test('[Split/Regression] Second window opens with its heading', { tag: ['@medium', '@navigation'] }, async ({ page, context }) => {
    await page.goto('/windows');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);
    await newPage.waitForLoadState();
    await expect(newPage.locator('h3')).toHaveText('New Window');
  });

  test('[Split/Regression] Context menu raises its alert', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/context_menu');
    page.once('dialog', async (d) => {
      expect(d.message()).toBe('You selected a context menu');
      await d.accept();
    });
    await page.locator('#hot-spot').click({ button: 'right' });
  });

  test('[Split/Regression] Shadow DOM content is reachable', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/shadowdom');
    await expect(page.locator('my-paragraph').first()).toContainText("Let's have some different text!");
  });

  test('[Split/Regression] Broken images are detected', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/broken_images');
    const broken = await page.locator('#content img').evaluateAll((imgs: any[]) =>
      imgs.filter((img: any) => !img.complete || img.naturalWidth === 0).length
    );
    expect(broken).toBeGreaterThan(0);
  });

  test('[Split/Regression] Horizontal slider responds to arrow keys', { tag: ['@low', '@forms'] }, async ({ page }) => {
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type="range"]');
    await slider.focus();
    await slider.press('ArrowRight');
    await expect(page.locator('#range')).toHaveText('0.5');
  });

  test('[Split/Regression] Dynamic controls remove the checkbox', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.locator('#checkbox-example button').click();
    await expect(page.locator('#message')).toHaveText("It's gone!", { timeout: 15000 });
  });

  test('[Split/Regression] File upload confirms the file name', { tag: ['@critical', '@upload'] }, async ({ page }) => {
    await page.goto('/upload');
    await page.locator('#file-upload').setInputFiles({
      name: 'split-mode.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('split mode evidence'),
    });
    await page.locator('#file-submit').click();
    await expect(page.locator('#uploaded-files')).toHaveText('split-mode.txt');
  });

  test('[Split/Regression] Redirect link lands on the status page', { tag: ['@medium', '@navigation'] }, async ({ page }) => {
    await page.goto('/redirector');
    await page.locator('#redirect').click();
    await expect(page).toHaveURL(/status_codes/, { timeout: 15000 });
  });

  test('[Split/Regression] Entry ad modal can be dismissed', { tag: ['@low', '@dialogs'] }, async ({ page }) => {
    await page.goto('/entry_ad');
    await expect(page.locator('.modal-title h3')).toHaveText('This is a modal window');
    await page.locator('.modal-footer p').click();
    await expect(page.locator('#modal')).toBeHidden();
  });

  test('[Split/Regression] Disappearing nav always keeps Home', { tag: ['@low', '@navigation'] }, async ({ page }) => {
    await page.goto('/disappearing_elements');
    await expect(page.locator('ul li a', { hasText: 'Home' })).toBeVisible();
  });

  test('[Split/Regression] TinyMCE editor loads its default copy', { tag: ['@medium', '@frames'] }, async ({ page }) => {
    await page.goto('/tinymce');
    await expect(page.frameLocator('#mce_0_ifr').locator('#tinymce')).toContainText('Your content goes here.');
  });

  test('[Split/Regression] Typos page renders its heading', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/typos');
    await expect(page.locator('h3')).toHaveText('Typos');
  });
});

test.describe('Split 4 - Slow Isolated', {
  tag: ['@chromium', '@split', '@split-slow'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Slow Isolated' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7400' },
    { type: 'testdino:context', description: 'Split 4 of 5 - the slow specs, isolated on their own runner so they do not hold up the fast splits.' },
  ],
}, () => {
  test('[Split/Slow] Dynamic loading example one completes', { tag: ['@high', '@performance'] }, async ({ page }) => {
    await page.goto('/dynamic_loading/1');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 20000 });
  });

  test('[Split/Slow] Dynamic loading example two completes', { tag: ['@high', '@performance'] }, async ({ page }) => {
    await page.goto('/dynamic_loading/2');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 20000 });
  });

  test('[Split/Slow] Dynamic controls enable the input field', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.locator('#input-example button').click();
    await expect(page.locator('#message')).toHaveText("It's enabled!", { timeout: 20000 });
    await expect(page.locator('#input-example input')).toBeEnabled();
  });

  test('[Split/Slow] Infinite scroll appends more content', { tag: ['@medium', '@performance'] }, async ({ page }) => {
    await page.goto('/infinite_scroll');
    const blocks = () => page.locator('.jscroll-added').filter({ hasNotText: 'Loading' }).count();
    await expect.poll(blocks, { timeout: 20000 }).toBeGreaterThan(0);
    const before = await blocks();
    await page.mouse.wheel(0, 5000);
    await page.mouse.wheel(0, 5000);
    await expect.poll(blocks, { timeout: 20000 }).toBeGreaterThan(before);
  });

  test('[Split/Slow] Slow resources page still renders', { tag: ['@low', '@performance'] }, async ({ page }) => {
    await page.goto('/slow');
    await expect(page.locator('h3')).toHaveText('Slow Resources');
  });
});

const DURATION_PROFILE = { fast: 0, medium: 1500, slow: 5000 } as const;

type Speed = keyof typeof DURATION_PROFILE;
type Outcome = 'passed' | 'failed' | 'flaky' | 'skipped';

const orchestrationCases: { name: string; speed: Speed; outcome: Outcome; tags: string[] }[] = [
  { name: 'Warm the catalog cache', speed: 'fast', outcome: 'passed', tags: ['@low', '@catalog'] },
  { name: 'Resolve the pricing matrix', speed: 'fast', outcome: 'passed', tags: ['@medium', '@catalog'] },
  { name: 'Validate the cart subtotal', speed: 'fast', outcome: 'passed', tags: ['@critical', '@checkout'] },
  { name: 'Check the session token shape', speed: 'fast', outcome: 'passed', tags: ['@high', '@auth'] },
  { name: 'Verify the address validator', speed: 'fast', outcome: 'passed', tags: ['@medium', '@forms'] },
  { name: 'Confirm the currency formatter', speed: 'fast', outcome: 'passed', tags: ['@low', '@catalog'] },
  { name: 'Assert the tax rounding rule', speed: 'fast', outcome: 'passed', tags: ['@high', '@checkout'] },
  { name: 'Check the discount precedence', speed: 'fast', outcome: 'passed', tags: ['@medium', '@checkout'] },
  { name: 'Reconcile the order totals', speed: 'medium', outcome: 'passed', tags: ['@critical', '@checkout'] },
  { name: 'Rebuild the search suggestions', speed: 'medium', outcome: 'passed', tags: ['@high', '@catalog'] },
  { name: 'Recalculate the shipping bands', speed: 'medium', outcome: 'passed', tags: ['@medium', '@checkout'] },
  { name: 'Refresh the inventory snapshot', speed: 'medium', outcome: 'passed', tags: ['@high', '@data-pipeline'] },
  { name: 'Aggregate the review scores', speed: 'medium', outcome: 'passed', tags: ['@low', '@catalog'] },
  { name: 'Compile the audit trail', speed: 'medium', outcome: 'passed', tags: ['@medium', '@data-pipeline'] },
  { name: 'Replay the payment ledger', speed: 'slow', outcome: 'passed', tags: ['@critical', '@checkout'] },
  { name: 'Rebuild the recommendation index', speed: 'slow', outcome: 'passed', tags: ['@high', '@data-pipeline'] },
  { name: 'Reconcile the warehouse feed', speed: 'slow', outcome: 'passed', tags: ['@medium', '@data-pipeline'] },
  { name: 'Regenerate the sitemap', speed: 'slow', outcome: 'passed', tags: ['@low', '@downloads'] },
  { name: 'Recompute customer lifetime value', speed: 'slow', outcome: 'passed', tags: ['@high', '@data-pipeline'] },
  { name: 'Settle the nightly payouts', speed: 'slow', outcome: 'passed', tags: ['@critical', '@checkout'] },
  { name: 'Verify the loyalty accrual', speed: 'fast', outcome: 'passed', tags: ['@low', '@checkout'] },
  { name: 'Check the refund eligibility window', speed: 'medium', outcome: 'passed', tags: ['@medium', '@checkout'] },
  { name: 'Validate the invoice numbering', speed: 'fast', outcome: 'passed', tags: ['@low', '@checkout'] },
  { name: 'Confirm the notification templates', speed: 'medium', outcome: 'passed', tags: ['@low', '@dialogs'] },
  { name: 'Checkout totals drift under concurrency', speed: 'fast', outcome: 'failed', tags: ['@critical', '@checkout'] },
  { name: 'Stock reservation releases too early', speed: 'medium', outcome: 'failed', tags: ['@high', '@catalog'] },
  { name: 'Coupon stacking bypasses the cap', speed: 'fast', outcome: 'failed', tags: ['@high', '@checkout'] },
  { name: 'Address validator rejects a valid postcode', speed: 'medium', outcome: 'failed', tags: ['@medium', '@forms'] },
  { name: 'Refund rounds against the customer', speed: 'slow', outcome: 'failed', tags: ['@critical', '@checkout'] },
  { name: 'Search index misses newly added items', speed: 'slow', outcome: 'failed', tags: ['@high', '@catalog'] },
  { name: 'Audit trail drops concurrent writes', speed: 'medium', outcome: 'failed', tags: ['@medium', '@data-pipeline'] },
  { name: 'Currency conversion loses precision', speed: 'fast', outcome: 'failed', tags: ['@high', '@catalog'] },
  { name: 'Payment webhook arrives out of order', speed: 'medium', outcome: 'flaky', tags: ['@critical', '@network'] },
  { name: 'Inventory sync races the order write', speed: 'fast', outcome: 'flaky', tags: ['@high', '@data-pipeline'] },
  { name: 'Session refresh races the first request', speed: 'fast', outcome: 'flaky', tags: ['@high', '@auth'] },
  { name: 'Cache warm-up lags the first read', speed: 'medium', outcome: 'flaky', tags: ['@medium', '@performance'] },
  { name: 'Ledger export races the batch close', speed: 'slow', outcome: 'flaky', tags: ['@medium', '@data-pipeline'] },
  { name: 'Multi-region failover rehearsal', speed: 'fast', outcome: 'skipped', tags: ['@low', '@environment'] },
  { name: 'Legacy settlement reconciliation', speed: 'fast', outcome: 'skipped', tags: ['@low', '@checkout'] },
  { name: 'Deprecated tax engine comparison', speed: 'fast', outcome: 'skipped', tags: ['@low', '@checkout'] },
];

test.describe('Split 5 - Orchestration Mixed', {
  tag: ['@chromium', '@split', '@split-orchestration'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Orchestration Mixed' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7500' },
    { type: 'testdino:context', description: 'Split 5 of 5 - mixed outcomes with fast, medium and slow durations, so load balancing has a real spread to optimise.' },
  ],
}, () => {
  for (const { name, speed, outcome, tags } of orchestrationCases) {
    test(`[Split/Orchestration] ${name}`, {
      tag: tags,
      annotation: [
        { type: 'testdino:metric', description: JSON.stringify({ speed, holdMs: DURATION_PROFILE[speed], expectedOutcome: outcome }) },
      ],
    }, async ({}, testInfo) => {
      if (outcome === 'skipped') {
        test.skip(true, `${name} is excluded from this orchestration cycle`);
      }

      await sleep(DURATION_PROFILE[speed]);

      if (outcome === 'failed') {
        throw new Error(`${name} did not settle within the orchestration budget`);
      }

      if (outcome === 'flaky' && testInfo.retry === 0) {
        throw new Error(`${name} lost the race on attempt 1`);
      }

      expect(DURATION_PROFILE[speed]).toBeGreaterThanOrEqual(0);
    });
  }
});
