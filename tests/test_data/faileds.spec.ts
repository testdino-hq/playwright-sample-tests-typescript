// @ts-nocheck

import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

test.describe('UI Error', {
  tag: ['@chromium', '@firefox', '@failed', '@ui-error'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'UI Error' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3212' },
    { type: 'testdino:context', description: 'Failure sample data - every test in this suite fails by design.' },
  ],
}, () => {
  const cases = [
    { name: 'Homepage', path: '/', selector: '#get-started-button', tags: ['@critical', '@navigation'] },
    { name: 'A/B Testing', path: '/abtest', selector: '.variant-badge', tags: ['@high', '@general'] },
    { name: 'Add/Remove Elements', path: '/add_remove_elements/', selector: '#delete-confirmation-modal', tags: ['@medium', '@general'] },
    { name: 'Broken Images', path: '/broken_images', selector: '.image-gallery-carousel', tags: ['@low', '@visual'] },
    { name: 'Challenging DOM', path: '/challenging_dom', selector: '#stable-locator-id', tags: ['@critical', '@general'] },
    { name: 'Checkboxes', path: '/checkboxes', selector: '#checkbox-group-wrapper', tags: ['@high', '@forms'] },
    { name: 'Context Menu', path: '/context_menu', selector: '#context-menu-panel', tags: ['@medium', '@interactions'] },
    { name: 'Disappearing Elements', path: '/disappearing_elements', selector: '.nav-mega-menu', tags: ['@low', '@general'] },
    { name: 'Drag and Drop', path: '/drag_and_drop', selector: '#drop-success-banner', tags: ['@critical', '@interactions'] },
    { name: 'Dropdown', path: '/dropdown', selector: '.dropdown-search-input', tags: ['@high', '@forms'] },
    { name: 'Dynamic Content', path: '/dynamic_content', selector: '.content-carousel-dots', tags: ['@medium', '@general'] },
    { name: 'Dynamic Controls', path: '/dynamic_controls', selector: '#control-panel-v2', tags: ['@low', '@general'] },
    { name: 'Dynamic Loading', path: '/dynamic_loading/1', selector: '.progress-bar-percentage', tags: ['@critical', '@performance'] },
    { name: 'Entry Ad', path: '/entry_ad', selector: '.ad-close-icon-v2', tags: ['@high', '@general'] },
    { name: 'File Download', path: '/download', selector: '.download-progress-indicator', tags: ['@medium', '@downloads'] },
    { name: 'File Upload', path: '/upload', selector: '.upload-success-checkmark', tags: ['@low', '@upload'] },
    { name: 'Floating Menu', path: '/floating_menu', selector: '.menu-collapse-toggle', tags: ['@critical', '@interactions'] },
    { name: 'Forgot Password', path: '/forgot_password', selector: '.password-strength-meter', tags: ['@high', '@auth'] },
    { name: 'Login', path: '/login', selector: '.two-factor-auth-input', tags: ['@medium', '@auth'] },
    { name: 'Frames', path: '/frames', selector: '.frame-breadcrumb', tags: ['@low', '@frames'] },
    { name: 'Geolocation', path: '/geolocation', selector: '.map-preview-widget', tags: ['@critical', '@general'] },
    { name: 'Horizontal Slider', path: '/horizontal_slider', selector: '.slider-tooltip-value', tags: ['@high', '@forms'] },
    { name: 'Hovers', path: '/hovers', selector: '.hover-card-cta-button', tags: ['@medium', '@interactions'] },
    { name: 'Infinite Scroll', path: '/infinite_scroll', selector: '.scroll-progress-bar', tags: ['@low', '@interactions'] },
    { name: 'Inputs', path: '/inputs', selector: '.input-validation-message', tags: ['@critical', '@forms'] },
  ];

  for (const { name, path, selector, tags } of cases) {
    test(`[UI Error] ${name} - locator "${selector}" no longer matches the page`, {
      tag: tags,
      annotation: [
        { type: 'issue', description: `https://jira.example.com/browse/UI-${1000 + name.length * 7}` },
        { type: 'testdino:context', description: `Stale locator "${selector}" - the markup changed underneath this test.` },
      ],
    }, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(selector), `Expected "${selector}" to exist on ${path} - selector is stale`).toBeVisible({ timeout: 3000 });
    });
  }
});

test.describe('Actual Bug', {
  tag: ['@chromium', '@webkit', '@failed', '@actual-bug'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Actual Bug' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3210' },
    { type: 'testdino:context', description: 'Failure sample data - every test in this suite fails by design.' },
  ],
}, () => {
  test('[Actual Bug] Homepage heading does not match required marketing copy', { tag: ['@medium', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.heading')).toHaveText('Welcome to The Internet!');
  });

  test('[Actual Bug] Checkbox two should be unchecked by default per spec', { tag: ['@low', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    await expect(page.locator('#checkboxes input[type="checkbox"]').nth(1)).not.toBeChecked();
  });

  test('[Actual Bug] Dropdown should preselect Option 1 by default', { tag: ['@critical', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await expect(page.locator('#dropdown')).toHaveValue('1');
  });

  test('[Actual Bug] Login success banner copy does not match product requirements', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('Login successful!');
  });

  test('[Actual Bug] Logout banner copy does not match product requirements', { tag: ['@medium', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await page.locator('a[href="/logout"]').click();
    await expect(page.locator('#flash')).toContainText('You have signed out');
  });

  test('[Actual Bug] Broken Images page should have zero broken images', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/broken_images');
    const brokenCount = await page.locator('#content img').evaluateAll((imgs: any[]) =>
      imgs.filter((img: any) => !img.complete || img.naturalWidth === 0).length
    );
    expect(brokenCount).toBe(0);
  });

  test('[Actual Bug] 404 page should show friendly "Page Not Found" copy', { tag: ['@critical', '@general'] }, async ({ page }) => {
    await page.goto('/status_codes/404');
    await expect(page.locator('#content p').first()).toContainText('Page Not Found');
  });

  test('[Actual Bug] 500 page should show a reassuring support message', { tag: ['@high', '@general'] }, async ({ page }) => {
    await page.goto('/status_codes/500');
    await expect(page.locator('#content p').first()).toContainText("We're on it! - support has been notified");
  });

  test('[Actual Bug] Key Presses result text does not use the required "Key Pressed:" format', { tag: ['@medium', '@keyboard'] }, async ({ page }) => {
    await page.goto('/key_presses');
    await page.locator('#target').click();
    await page.locator('#target').press('a');
    await expect(page.locator('#result')).toHaveText('Key Pressed: A');
  });

  test('[Actual Bug] Dynamic Controls remove message does not confirm the action clearly', { tag: ['@low', '@dialogs'] }, async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.locator('#checkbox-example button').click();
    await expect(page.locator('#message')).toHaveText('Checkbox removed successfully', { timeout: 10000 });
  });

  test('[Actual Bug] Dynamic Loading example 1 shows placeholder text instead of a real message', { tag: ['@critical', '@performance'] }, async ({ page }) => {
    await page.goto('/dynamic_loading/1');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#finish')).toHaveText('Loaded successfully!', { timeout: 10000 });
  });

  test('[Actual Bug] Forgot Password button label is not user-friendly', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/forgot_password');
    await expect(page.getByRole('button', { name: 'Reset Password' })).toBeVisible();
  });

  test('[Actual Bug] File Upload success heading does not confirm completion clearly', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/upload');
    await page.locator('#file-upload').setInputFiles({
      name: 'bug-report-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('bug repro upload'),
    });
    await page.locator('#file-submit').click();
    await expect(page.locator('h3')).toHaveText('Upload Complete!');
  });

  test('[Actual Bug] Horizontal Slider value is wrong after two right-arrow presses', { tag: ['@low', '@keyboard'] }, async ({ page }) => {
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type="range"]');
    await slider.focus();
    await slider.press('ArrowRight');
    await slider.press('ArrowRight');
    await expect(page.locator('#range')).toHaveText('2');
  });

  test('[Actual Bug] WYSIWYG (tinymce) editor is stuck in read-only mode', { tag: ['@critical', '@frames'] }, async ({ page }) => {
    await page.goto('/tinymce');
    const editorFrame = page.frameLocator('#mce_0_ifr');
    await expect(editorFrame.locator('#tinymce')).toHaveAttribute('contenteditable', 'true');
  });

  test('[Actual Bug] iFrame WYSIWYG editor is stuck in read-only mode', { tag: ['@high', '@frames'] }, async ({ page }) => {
    await page.goto('/iframe');
    const editorFrame = page.frameLocator('#mce_0_ifr');
    await expect(editorFrame.locator('#tinymce')).toHaveAttribute('contenteditable', 'true');
  });

  test('[Actual Bug] iFrame editor toolbar is missing a Save control', { tag: ['@medium', '@frames'] }, async ({ page }) => {
    await page.goto('/iframe');
    await expect(page.locator('.tox-toolbar__group button[aria-label="Save"]')).toBeVisible();
  });

  test('[Actual Bug] Large DOM table has fewer rows than the documented 100-row dataset', { tag: ['@low', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('tr[class^="row-"]')).toHaveCount(100);
  });

  test('[Actual Bug] New window title is not personalized for the logged-in user', { tag: ['@critical', '@navigation'] }, async ({ page, context }) => {
    await page.goto('/windows');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);
    await newPage.waitForLoadState();
    await expect(newPage.locator('h3')).toHaveText('Welcome New User');
  });

  test('[Actual Bug] Nested frame bottom section is labeled incorrectly', { tag: ['@high', '@frames'] }, async ({ page }) => {
    await page.goto('/nested_frames');
    await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toHaveText('FOOTER');
  });

  test('[Actual Bug] Notification banner is missing a dismiss control', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/notification_message');
    await expect(page.locator('#flash button.close, #flash [aria-label="dismiss"]')).toBeVisible();
  });

  test('[Actual Bug] Redirect Link does not land on the documented confirmation page', { tag: ['@low', '@dialogs'] }, async ({ page }) => {
    await page.goto('/redirector');
    await page.locator('#redirect').click();
    await expect(page.locator('h3')).toHaveText('Redirect Successful', { timeout: 10000 });
  });

  test('[Actual Bug] Sortable table shows the wrong Due amount for the top sorted row', { tag: ['@critical', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').nth(3)).toHaveText('$100.00');
  });

  test('[Actual Bug] JQuery UI Downloads submenu is missing a Word document option', { tag: ['@high', '@downloads'] }, async ({ page }) => {
    await page.goto('/jqueryui/menu');
    await page.locator('#menu li', { hasText: 'Enabled' }).first().hover();
    await page.getByRole('link', { name: 'Downloads' }).hover();
    await expect(page.getByRole('link', { name: 'Word' })).toBeVisible();
  });

  test('[Actual Bug] Basic Auth congratulations copy is missing the user\'s name', { tag: ['@medium', '@auth'] }, async ({ page }) => {
    await page.context().addCookies([]);
    await page.goto('https://admin:admin@the-internet.herokuapp.com/basic_auth');
    await expect(page.locator('p')).toContainText('Congratulations admin!');
  });
});

test.describe('Miscellaneous', {
  tag: ['@chromium', '@android', '@failed', '@miscellaneous'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Miscellaneous' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1734' },
    { type: 'testdino:context', description: 'Failure sample data - every test in this suite fails by design.' },
  ],
}, () => {
  test('[Miscellaneous] throws a plain Error from test code', { tag: ['@low', '@data-table'] }, async () => {
    throw new Error('Simulated unexpected failure in test setup');
  });

  test('[Miscellaneous] fails to parse malformed JSON test fixture', { tag: ['@critical', '@forms'] }, async () => {
    JSON.parse('{ this is not valid json ');
  });

  test('[Miscellaneous] throws a TypeError reading a property of undefined', { tag: ['@high', '@data-table'] }, async () => {
    const fixture = undefined;
    // eslint-disable-next-line no-unused-expressions
    fixture.someProperty;
  });

  test('[Miscellaneous] rejects a promise from a mocked data-layer call', { tag: ['@medium', '@general'] }, async () => {
    await Promise.reject(new Error('Simulated data-layer rejection'));
  });

  test('[Miscellaneous] calls an undefined helper function', { tag: ['@low', '@general'] }, async () => {
    // @ts-expect-error - intentionally calling something that does not exist
    undefinedHelperFunction();
  });

  test('[Miscellaneous] navigates to a domain that does not resolve', { tag: ['@critical', '@navigation'] }, async ({ page }) => {
    await page.goto('https://this-domain-does-not-exist.testdino-demo.invalid', { timeout: 8000 });
  });

  test('[Miscellaneous] navigates to an unreachable local port', { tag: ['@high', '@navigation'] }, async ({ page }) => {
    await page.goto('http://127.0.0.1:9', { timeout: 8000 });
  });

  test('[Miscellaneous] hits an API endpoint that returns a non-2xx status', { tag: ['@medium', '@network'] }, async ({ request }) => {
    const response = await request.get('https://the-internet.herokuapp.com/status_codes/500');
    expect(response.ok()).toBeTruthy();
  });

  test('[Miscellaneous] throws a RangeError from an invalid date value', { tag: ['@low', '@data-table'] }, async () => {
    new Date('not-a-real-date').toISOString();
  });

  test('[Miscellaneous] throws from JSON.stringify on a circular structure', { tag: ['@critical', '@data-table'] }, async () => {
    const circular = {};
    // @ts-expect-error - intentional circular reference
    circular.self = circular;
    JSON.stringify(circular);
  });

  test('[Miscellaneous] throws a RangeError from runaway recursion', { tag: ['@high', '@data-table'] }, async () => {
    const recurse = (n) => recurse(n + 1);
    recurse(0);
  });

  test('[Miscellaneous] uses an invalid CSS locator syntax', { tag: ['@medium', '@checkout'] }, async ({ page }) => {
    await page.goto('/');
    await page.locator(':::not-a-valid-selector:::').click();
  });

  test('[Miscellaneous] throws when reading an out-of-bounds array element as a function', { tag: ['@low', '@data-table'] }, async () => {
    const items = ['a', 'b', 'c'];
    items[10]();
  });

  test('[Miscellaneous] throws decoding an invalid Buffer encoding', { tag: ['@critical', '@data-table'] }, async () => {
    // @ts-expect-error - intentionally invalid encoding name
    Buffer.from('test data', 'not-a-real-encoding');
  });

  test('[Miscellaneous] required environment variable is missing', { tag: ['@high', '@environment'] }, async () => {
    const token = process.env.NONEXISTENT_DEMO_TOKEN;
    if (!token) {
      throw new Error('NONEXISTENT_DEMO_TOKEN environment variable is not set');
    }
  });

  test('[Miscellaneous] calls page.click with a missing required selector', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/');
    // @ts-expect-error - intentionally omitting the required selector argument
    await page.click();
  });

  test('[Miscellaneous] exceeds a deliberately tiny custom timeout', { tag: ['@low', '@network'] }, async ({ page }) => {
    test.setTimeout(2000);
    await page.goto('/slow', { timeout: 1000 });
  });

  test('[Miscellaneous] throws calling toUpperCase on a non-string value', { tag: ['@critical', '@data-table'] }, async () => {
    const value = 42;
    // @ts-expect-error - intentionally invalid method call
    value.toUpperCase();
  });

  test('[Miscellaneous] throws constructing a Map from an invalid iterable', { tag: ['@high', '@data-table'] }, async () => {
    // @ts-expect-error - intentionally invalid constructor argument
    new Map(42);
  });

  test('[Miscellaneous] throws destructuring properties off null', { tag: ['@medium', '@data-table'] }, async () => {
    const { missing } = null;
  });

  test('[Miscellaneous] fails asserting on a getter that throws', { tag: ['@low', '@data-table'] }, async () => {
    const fixture = {
      get value() {
        throw new Error('Simulated fixture read failure');
      },
    };
    expect(fixture.value).toBeTruthy();
  });

  test('[Miscellaneous] request module rejects on a malformed URL', { tag: ['@critical', '@forms'] }, async ({ request }) => {
    await request.get('not-a-valid-url');
  });

  test('[Miscellaneous] throws invoking a class constructor without new', { tag: ['@high', '@data-table'] }, async () => {
    class DemoFixture {
      constructor() {
        this.ready = true;
      }
    }
    // @ts-expect-error - intentionally calling a class without `new`
    DemoFixture();
  });

  test('[Miscellaneous] throws awaiting a non-thenable treated as a promise', { tag: ['@medium', '@data-table'] }, async () => {
    const fakePromise = { then: undefined };
    // @ts-expect-error - intentionally invalid await target
    await fakePromise.then();
  });

  test('[Miscellaneous] simulates a CI infrastructure connection reset', { tag: ['@low', '@network'] }, async () => {
    const error = new Error('simulated ECONNRESET from CI runner network');
    error.name = 'ECONNRESET';
    throw error;
  });
});

test.describe('Unstable Test', {
  tag: ['@chromium', '@ios', '@failed', '@unstable-test'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Unstable Test' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9358' },
    { type: 'testdino:context', description: 'Failure sample data - every test in this suite fails by design.' },
  ],
}, () => {
  const cases = [
    { name: 'Dashboard widgets render before first assertion', path: '/', tags: ['@high', '@visual'] },
    { name: 'Product card animation races the visibility check', path: '/abtest', tags: ['@medium', '@visual'] },
    { name: 'Add/Remove button state lags behind the click handler', path: '/add_remove_elements/', tags: ['@low', '@interactions'] },
    { name: 'Image lazy-load races the broken-image scan', path: '/broken_images', tags: ['@critical', '@visual'] },
    { name: 'Challenging DOM canvas paint races the assertion', path: '/challenging_dom', tags: ['@high', '@visual'] },
    { name: 'Checkbox state update lags on a slow render frame', path: '/checkboxes', tags: ['@medium', '@frames'] },
    { name: 'Context menu event listener attaches after first interaction', path: '/context_menu', tags: ['@low', '@interactions'] },
    { name: 'Disappearing nav items randomize before the check settles', path: '/disappearing_elements', tags: ['@critical', '@navigation'] },
    { name: 'Drag handle listener is not yet bound on first paint', path: '/drag_and_drop', tags: ['@high', '@interactions'] },
    { name: 'Dropdown options hydrate after the initial render', path: '/dropdown', tags: ['@medium', '@forms'] },
    { name: 'Dynamic content swap races the image load event', path: '/dynamic_content', tags: ['@low', '@visual'] },
    { name: 'Dynamic control toggle has a timing-dependent delay', path: '/dynamic_controls', tags: ['@critical', '@general'] },
    { name: 'Dynamic loading spinner races the finish text', path: '/dynamic_loading/2', tags: ['@high', '@performance'] },
    { name: 'Entry ad modal timing depends on the 500ms setTimeout', path: '/entry_ad', tags: ['@medium', '@dialogs'] },
    { name: 'Download list is populated by a late async fetch', path: '/download', tags: ['@low', '@downloads'] },
    { name: 'Upload dropzone script attaches after first render', path: '/upload', tags: ['@critical', '@upload'] },
    { name: 'Floating menu position settles after a layout reflow', path: '/floating_menu', tags: ['@high', '@interactions'] },
    { name: 'Forgot password form validation races input hydration', path: '/forgot_password', tags: ['@medium', '@auth'] },
    { name: 'Login flash message races the redirect', path: '/login', tags: ['@low', '@auth'] },
    { name: 'Frame content loads asynchronously on first paint', path: '/frames', tags: ['@critical', '@frames'] },
    { name: 'Horizontal slider value lags one animation frame', path: '/horizontal_slider', tags: ['@high', '@frames'] },
    { name: 'Hover caption transition races the visibility check', path: '/hovers', tags: ['@medium', '@interactions'] },
    { name: 'Infinite scroll first batch is a late async append', path: '/infinite_scroll', tags: ['@low', '@interactions'] },
    { name: 'Input field validation debounce delays the value update', path: '/inputs', tags: ['@critical', '@forms'] },
    { name: 'Key press handler attaches after the first keydown', path: '/key_presses', tags: ['@high', '@keyboard'] },
  ];

  for (const { name, path, tags } of cases) {
    test(`[Unstable Test] ${name}`, {
      tag: tags,
      annotation: [{ type: 'testdino:flaky-reason', description: `Timing race: ${name}` }],
    }, async ({ page }, testInfo) => {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();

      if (testInfo.retry === 0) {
        throw new Error(`Simulated timing race on first attempt for "${name}"`);
      }
      expect(testInfo.retry).toBeGreaterThan(0);
    });
  }
});
