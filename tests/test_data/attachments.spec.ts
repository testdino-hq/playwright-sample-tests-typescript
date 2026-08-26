import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { Buffer } from 'node:buffer';

test.use({
  baseURL: 'https://the-internet.herokuapp.com',
  trace: 'on',
  video: 'on',
  screenshot: 'on',
});

const SUITE_CONTEXT = 'Attachment sample data - every test records a trace, a video and screenshots.';

type Recording = { consoleLines: string[]; requests: string[] };

function recorders(page: Page): Recording {
  const consoleLines: string[] = [];
  const requests: string[] = [];
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on('request', (req) => requests.push(`${req.method()} ${req.url()}`));
  return { consoleLines, requests };
}

async function attachDiagnostics(testInfo: TestInfo, page: Page, { consoleLines, requests }: Recording, label: string) {
  await testInfo.attach(`${label} - final screenshot`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await testInfo.attach(`${label} - console log`, {
    body: consoleLines.join('\n') || 'no console output captured',
    contentType: 'text/plain',
  });
  await testInfo.attach(`${label} - network summary`, {
    body: JSON.stringify({ label, requestCount: requests.length, requests: requests.slice(0, 25) }, null, 2),
    contentType: 'application/json',
  });
}

test.describe('Attachments - Passing Journeys', {
  tag: ['@chromium', '@firefox', '@attachments', '@attachments-passing'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Attachment Evidence' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6100' },
    { type: 'testdino:context', description: SUITE_CONTEXT },
  ],
}, () => {
  test('[Evidence] Sign in and reach the secure area', { tag: ['@critical', '@auth'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    await test.step('Open the storefront', async () => {
      await page.goto('/');
      await expect(page.locator('h1.heading')).toBeVisible();
    });

    await test.step('Navigate to the sign in form', async () => {
      await page.goto('/login');
      await expect(page.locator('#username')).toBeVisible();
    });

    await test.step('Enter the credentials', async () => {
      await page.locator('#username').fill('tomsmith');
      await page.locator('#password').fill('SuperSecretPassword!');
      await testInfo.attach('credentials-form', {
        body: await page.locator('#login').screenshot(),
        contentType: 'image/png',
      });
    });

    await test.step('Submit and confirm the secure area', async () => {
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
    });

    await attachDiagnostics(testInfo, page, rec, 'sign-in');
  });

  test('[Evidence] Complete a full sign in and sign out cycle', { tag: ['@high', '@auth'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    await test.step('Sign in', async () => {
      await page.goto('/login');
      await page.locator('#username').fill('tomsmith');
      await page.locator('#password').fill('SuperSecretPassword!');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
    });

    await test.step('Sign out', async () => {
      await page.locator('a[href="/logout"]').click();
      await expect(page.locator('#flash')).toContainText('You logged out of the secure area!');
    });

    await attachDiagnostics(testInfo, page, rec, 'sign-in-out');
  });

  test('[Evidence] Build and tear down a list of elements', { tag: ['@medium', '@interactions'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/add_remove_elements/');
    const add = page.getByRole('button', { name: 'Add Element' });

    await test.step('Add five elements', async () => {
      for (let i = 0; i < 5; i += 1) await add.click();
      await expect(page.locator('button.added-manually')).toHaveCount(5);
    });

    await test.step('Capture the populated state', async () => {
      await testInfo.attach('populated-list', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    });

    await test.step('Remove every element again', async () => {
      for (let i = 0; i < 5; i += 1) await page.locator('button.added-manually').first().click();
      await expect(page.locator('button.added-manually')).toHaveCount(0);
    });

    await attachDiagnostics(testInfo, page, rec, 'add-remove');
  });

  test('[Evidence] Sort a data table in both directions', { tag: ['@high', '@data-table'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/tables');
    const header = page.locator('#table1 thead th', { hasText: 'Last Name' });

    await test.step('Sort ascending', async () => {
      await header.click();
      await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Bach');
    });

    await test.step('Sort descending', async () => {
      await header.click();
      await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Smith');
    });

    await test.step('Attach the table contents', async () => {
      const rows = await page.locator('#table1 tbody tr').allTextContents();
      await testInfo.attach('table-rows', {
        body: JSON.stringify(rows, null, 2),
        contentType: 'application/json',
      });
    });

    await attachDiagnostics(testInfo, page, rec, 'table-sort');
  });

  test('[Evidence] Handle every JavaScript dialog type', { tag: ['@high', '@dialogs'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/javascript_alerts');

    await test.step('Accept an alert', async () => {
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Click for JS Alert' }).click();
      await expect(page.locator('#result')).toHaveText('You successfully clicked an alert');
    });

    await test.step('Dismiss a confirm', async () => {
      page.once('dialog', (d) => d.dismiss());
      await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
      await expect(page.locator('#result')).toHaveText('You clicked: Cancel');
    });

    await test.step('Answer a prompt', async () => {
      page.once('dialog', (d) => d.accept('evidence run'));
      await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
      await expect(page.locator('#result')).toHaveText('You entered: evidence run');
    });

    await attachDiagnostics(testInfo, page, rec, 'dialogs');
  });

  test('[Evidence] Wait through a dynamically loaded element', { tag: ['@medium', '@performance'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/dynamic_loading/1');

    await test.step('Start the loader', async () => {
      await page.getByRole('button', { name: 'Start' }).click();
      await expect(page.locator('#loading')).toBeVisible();
      await testInfo.attach('loading-state', { body: await page.screenshot(), contentType: 'image/png' });
    });

    await test.step('Wait for the finished message', async () => {
      await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 15000 });
    });

    await attachDiagnostics(testInfo, page, rec, 'dynamic-loading');
  });

  test('[Evidence] Reveal each hover caption in turn', { tag: ['@low', '@interactions'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/hovers');

    for (const [index, user] of ['user1', 'user2', 'user3'].entries()) {
      await test.step(`Hover ${user}`, async () => {
        const figure = page.locator('.figure').nth(index);
        await figure.hover();
        await expect(figure.locator('.figcaption h5')).toHaveText(`name: ${user}`);
        await testInfo.attach(`hover-${user}`, { body: await figure.screenshot(), contentType: 'image/png' });
      });
    }

    await attachDiagnostics(testInfo, page, rec, 'hovers');
  });

  test('[Evidence] Drive a form through several field types', { tag: ['@high', '@forms'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    await test.step('Toggle a checkbox', async () => {
      await page.goto('/checkboxes');
      const first = page.locator('#checkboxes input[type="checkbox"]').nth(0);
      await first.check();
      await expect(first).toBeChecked();
    });

    await test.step('Choose a dropdown option', async () => {
      await page.goto('/dropdown');
      await page.locator('#dropdown').selectOption('2');
      await expect(page.locator('#dropdown')).toHaveValue('2');
    });

    await test.step('Fill a number field', async () => {
      await page.goto('/inputs');
      const input = page.locator('input[type="number"]');
      await input.fill('1024');
      await expect(input).toHaveValue('1024');
    });

    await attachDiagnostics(testInfo, page, rec, 'form-fields');
  });

  test('[Evidence] Work across nested frames', { tag: ['@medium', '@frames'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/nested_frames');
    const top = page.frameLocator('frame[name="frame-top"]');

    await test.step('Read every nested frame', async () => {
      await expect(top.frameLocator('frame[name="frame-left"]').locator('body')).toHaveText('LEFT');
      await expect(top.frameLocator('frame[name="frame-middle"]').locator('body')).toHaveText('MIDDLE');
      await expect(top.frameLocator('frame[name="frame-right"]').locator('body')).toHaveText('RIGHT');
      await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toHaveText('BOTTOM');
    });

    await attachDiagnostics(testInfo, page, rec, 'nested-frames');
  });

  test('[Evidence] Open a second window and compare both', { tag: ['@medium', '@navigation'] }, async ({ page, context }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/windows');

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);

    await test.step('Verify both windows', async () => {
      await newPage.waitForLoadState();
      await expect(newPage.locator('h3')).toHaveText('New Window');
      await expect(page.locator('h3')).toHaveText('Opening a new window');
      await testInfo.attach('second-window', { body: await newPage.screenshot(), contentType: 'image/png' });
    });

    await attachDiagnostics(testInfo, page, rec, 'windows');
  });
});

test.describe('Attachments - Failing Journeys', {
  tag: ['@chromium', '@webkit', '@attachments', '@attachments-failing'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Attachment Evidence' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6200' },
    { type: 'testdino:context', description: 'Each test performs a long interaction sequence before failing, so the trace, video and failure screenshot all carry real context.' },
  ],
}, () => {
  test('[Evidence] Sign in then fail on the dashboard greeting', { tag: ['@critical', '@auth'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    await test.step('Sign in successfully', async () => {
      await page.goto('/login');
      await page.locator('#username').fill('tomsmith');
      await page.locator('#password').fill('SuperSecretPassword!');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
    });

    await attachDiagnostics(testInfo, page, rec, 'sign-in-before-failure');

    await test.step('Assert the personalised greeting', async () => {
      await expect(page.locator('h2')).toHaveText('Welcome back, Tom!');
    });
  });

  test('[Evidence] Populate a list then fail on the expected count', { tag: ['@high', '@interactions'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/add_remove_elements/');
    const add = page.getByRole('button', { name: 'Add Element' });

    await test.step('Add seven elements', async () => {
      for (let i = 0; i < 7; i += 1) await add.click();
    });

    await attachDiagnostics(testInfo, page, rec, 'list-before-failure');

    await test.step('Assert the documented count of ten', async () => {
      await expect(page.locator('button.added-manually')).toHaveCount(10);
    });
  });

  test('[Evidence] Sort a table then fail on the top row', { tag: ['@high', '@data-table'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/tables');

    await test.step('Sort by last name', async () => {
      await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    });

    await test.step('Attach the sorted rows', async () => {
      const rows = await page.locator('#table1 tbody tr').allTextContents();
      await testInfo.attach('sorted-rows', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
    });

    await attachDiagnostics(testInfo, page, rec, 'table-before-failure');

    await test.step('Assert the expected top row', async () => {
      await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Anderson');
    });
  });

  test('[Evidence] Complete a form then fail on the confirmation', { tag: ['@critical', '@forms'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    await test.step('Fill every field', async () => {
      await page.goto('/checkboxes');
      await page.locator('#checkboxes input[type="checkbox"]').nth(0).check();
      await page.goto('/dropdown');
      await page.locator('#dropdown').selectOption('1');
      await page.goto('/inputs');
      await page.locator('input[type="number"]').fill('77');
    });

    await attachDiagnostics(testInfo, page, rec, 'form-before-failure');

    await test.step('Assert the submission banner', async () => {
      await expect(page.locator('#submission-confirmation')).toBeVisible({ timeout: 5000 });
    });
  });

  test('[Evidence] Handle dialogs then fail on the result text', { tag: ['@medium', '@dialogs'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/javascript_alerts');

    await test.step('Work through each dialog', async () => {
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Click for JS Alert' }).click();
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
      page.once('dialog', (d) => d.accept('evidence'));
      await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
    });

    await attachDiagnostics(testInfo, page, rec, 'dialogs-before-failure');

    await test.step('Assert the audit wording', async () => {
      await expect(page.locator('#result')).toHaveText('Dialog audit complete');
    });
  });

  test('[Evidence] Wait for dynamic content then fail on its wording', { tag: ['@medium', '@performance'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/dynamic_loading/2');

    await test.step('Trigger and wait for the element', async () => {
      await page.getByRole('button', { name: 'Start' }).click();
      await expect(page.locator('#finish')).toBeVisible({ timeout: 15000 });
    });

    await attachDiagnostics(testInfo, page, rec, 'dynamic-before-failure');

    await test.step('Assert the expected copy', async () => {
      await expect(page.locator('#finish')).toHaveText('Content loaded successfully');
    });
  });

  test('[Evidence] Traverse frames then fail on the footer label', { tag: ['@low', '@frames'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/nested_frames');
    const top = page.frameLocator('frame[name="frame-top"]');

    await test.step('Read the top frames', async () => {
      await expect(top.frameLocator('frame[name="frame-left"]').locator('body')).toHaveText('LEFT');
      await expect(top.frameLocator('frame[name="frame-middle"]').locator('body')).toHaveText('MIDDLE');
    });

    await attachDiagnostics(testInfo, page, rec, 'frames-before-failure');

    await test.step('Assert the bottom frame label', async () => {
      await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toHaveText('FOOTER');
    });
  });

  test('[Evidence] Browse the catalog then fail on a missing badge', { tag: ['@medium', '@catalog'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    await test.step('Walk several catalog pages', async () => {
      await page.goto('/');
      await page.goto('/large');
      await expect(page.locator('tr[class^="row-"]')).toHaveCount(50);
      await page.goto('/challenging_dom');
      await expect(page.locator('table tbody tr')).toHaveCount(10);
    });

    await attachDiagnostics(testInfo, page, rec, 'catalog-before-failure');

    await test.step('Assert the sale badge', async () => {
      await expect(page.locator('#sale-badge')).toBeVisible({ timeout: 5000 });
    });
  });

  test('[Evidence] Interact with the slider then fail on its value', { tag: ['@low', '@forms'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type="range"]');

    await test.step('Move the slider', async () => {
      await slider.focus();
      for (let i = 0; i < 4; i += 1) await slider.press('ArrowRight');
    });

    await attachDiagnostics(testInfo, page, rec, 'slider-before-failure');

    await test.step('Assert the expected value', async () => {
      await expect(page.locator('#range')).toHaveText('5');
    });
  });

  test('[Evidence] Open a new window then fail on its heading', { tag: ['@medium', '@navigation'] }, async ({ page, context }, testInfo) => {
    const rec = recorders(page);
    await page.goto('/windows');

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);
    await newPage.waitForLoadState();

    await testInfo.attach('new-window-before-failure', {
      body: await newPage.screenshot(),
      contentType: 'image/png',
    });
    await attachDiagnostics(testInfo, page, rec, 'windows-before-failure');

    await test.step('Assert the personalised window title', async () => {
      await expect(newPage.locator('h3')).toHaveText('Welcome to your dashboard');
    });
  });
});

test.describe('Attachments - File Artifacts', {
  tag: ['@chromium', '@android', '@attachments', '@attachments-files'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'File Artifacts' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6300' },
    { type: 'testdino:context', description: 'Produces real uploaded and downloaded files as report attachments.' },
  ],
}, () => {
  for (const index of [0, 1, 2, 3, 4]) {
    test(`[Evidence] Download the file at position ${index + 1}`, { tag: ['@medium', '@downloads'] }, async ({ page }, testInfo) => {
      await page.goto('/download');
      const link = page.locator('#content a[href^="download/"]').nth(index);
      const name = await link.textContent();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        link.click(),
      ]);

      const filePath = await download.path();
      if (filePath) {
        await testInfo.attach(`downloaded-${name?.trim() || index}`, { path: filePath });
      }
      await testInfo.attach('download-metadata', {
        body: JSON.stringify({ suggestedFilename: download.suggestedFilename(), position: index + 1 }, null, 2),
        contentType: 'application/json',
      });

      expect(download.suggestedFilename().length).toBeGreaterThan(0);
    });
  }

  for (const size of [1, 8, 64, 256, 1024]) {
    test(`[Evidence] Upload a ${size}KB file and confirm it`, { tag: ['@high', '@upload'] }, async ({ page }, testInfo) => {
      const body = Buffer.alloc(size * 1024, `evidence-${size}kb\n`);

      await test.step('Choose the file', async () => {
        await page.goto('/upload');
        await page.locator('#file-upload').setInputFiles({
          name: `evidence-${size}kb.txt`,
          mimeType: 'text/plain',
          buffer: body,
        });
      });

      await testInfo.attach(`uploaded-evidence-${size}kb.txt`, { body, contentType: 'text/plain' });

      await test.step('Submit and confirm', async () => {
        await page.locator('#file-submit').click();
        await expect(page.locator('h3')).toHaveText('File Uploaded!');
        await expect(page.locator('#uploaded-files')).toHaveText(`evidence-${size}kb.txt`);
      });

      await testInfo.attach('upload-result', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });
  }
});

test.describe('Attachments - Diagnostic Payloads', {
  tag: ['@chromium', '@ios', '@attachments', '@attachments-diagnostics'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Diagnostic Payloads' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6400' },
    { type: 'testdino:context', description: 'Attaches structured JSON, HTML, console output and API responses alongside the trace.' },
  ],
}, () => {
  const pages = [
    { name: 'homepage', path: '/' },
    { name: 'tables', path: '/tables' },
    { name: 'challenging-dom', path: '/challenging_dom' },
    { name: 'large-dom', path: '/large' },
    { name: 'dynamic-content', path: '/dynamic_content' },
  ];

  for (const { name, path } of pages) {
    test(`[Evidence] Capture a diagnostic bundle for ${name}`, { tag: ['@medium', '@data-table'] }, async ({ page }, testInfo) => {
      const rec = recorders(page);
      await page.goto(path);

      await test.step('Attach the rendered HTML', async () => {
        await testInfo.attach(`${name}.html`, {
          body: await page.content(),
          contentType: 'text/html',
        });
      });

      await test.step('Attach a viewport and a full-page screenshot', async () => {
        await testInfo.attach(`${name}-viewport.png`, { body: await page.screenshot(), contentType: 'image/png' });
        await testInfo.attach(`${name}-fullpage.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      });

      await test.step('Attach page metrics', async () => {
        const metrics = await page.evaluate(() => ({
          title: document.title,
          nodeCount: document.getElementsByTagName('*').length,
          linkCount: document.querySelectorAll('a').length,
          imageCount: document.querySelectorAll('img').length,
        }));
        await testInfo.attach(`${name}-metrics.json`, {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
        expect(metrics.nodeCount).toBeGreaterThan(0);
      });

      await attachDiagnostics(testInfo, page, rec, name);
    });
  }

  for (const code of [200, 301, 404, 500]) {
    test(`[Evidence] Capture the API response for status ${code}`, { tag: ['@high', '@network'] }, async ({ request }, testInfo) => {
      const response = await request.get(`https://the-internet.herokuapp.com/status_codes/${code}`);

      await testInfo.attach(`status-${code}-headers.json`, {
        body: JSON.stringify({ status: response.status(), headers: response.headers() }, null, 2),
        contentType: 'application/json',
      });
      await testInfo.attach(`status-${code}-body.html`, {
        body: await response.text(),
        contentType: 'text/html',
      });

      expect(response.status()).toBe(code);
    });
  }

  test('[Evidence] Capture a console and network trail across a session', { tag: ['@critical', '@network'] }, async ({ page }, testInfo) => {
    const rec = recorders(page);

    for (const path of ['/', '/tables', '/javascript_error', '/dynamic_content']) {
      await test.step(`Visit ${path}`, async () => {
        await page.goto(path);
        await expect(page.locator('body')).toBeVisible();
      });
    }

    await testInfo.attach('session-trail.json', {
      body: JSON.stringify({ requests: rec.requests, console: rec.consoleLines }, null, 2),
      contentType: 'application/json',
    });

    expect(rec.requests.length).toBeGreaterThan(0);
  });
});
