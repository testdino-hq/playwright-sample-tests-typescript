import { expect, test, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

test.describe('Homepage', {
  tag: ['@chromium', '@firefox', '@passed', '@homepage'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Homepage' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8766' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads the homepage and displays the welcome heading', { tag: ['@critical', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.heading')).toHaveText('Welcome to the-internet');
  });

  test('displays the GitHub "fork me" link', { tag: ['@high', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="https://github.com/tourdedave/the-internet"]')).toHaveCount(1);
  });

  test('lists all available example links', { tag: ['@medium', '@navigation'] }, async ({ page }) => {
    await page.goto('/');
    const links = page.locator('#content ul li a');
    expect(await links.count()).toBeGreaterThan(30);
  });
});

test.describe('A/B Testing', {
  tag: ['@chromium', '@webkit', '@passed', '@a-b-testing'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'A/B Testing' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3804' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows an A/B test heading on the abtest page', { tag: ['@low', '@general'] }, async ({ page }) => {
    await page.goto('/abtest');
    await expect(page.locator('h3')).toContainText('A/B Test');
  });
});

test.describe('Add/Remove Elements', {
  tag: ['@chromium', '@android', '@passed', '@add-remove-elements'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Add/Remove Elements' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6725' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('adds a delete button when Add Element is clicked', { tag: ['@critical', '@interactions'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    await expect(page.locator('button.added-manually')).toHaveCount(1);
  });

  test('removes a delete button when clicked', { tag: ['@high', '@interactions'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    await page.getByRole('button', { name: 'Add Element' }).click();
    await page.locator('button.added-manually').click();
    await expect(page.locator('button.added-manually')).toHaveCount(0);
  });

  test('adds multiple delete buttons when clicked multiple times', { tag: ['@medium', '@interactions'] }, async ({ page }) => {
    await page.goto('/add_remove_elements/');
    const addButton = page.getByRole('button', { name: 'Add Element' });
    await addButton.click();
    await addButton.click();
    await addButton.click();
    await expect(page.locator('button.added-manually')).toHaveCount(3);
  });
});

test.describe('Basic Auth', {
  tag: ['@chromium', '@ios', '@passed', '@basic-auth'],
  annotation: [
    { type: 'testdino:owner', description: 'identity-squad' },
    { type: 'testdino:feature', description: 'Basic Auth' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9506' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test.use({ httpCredentials: { username: 'admin', password: 'admin' } });

  test('logs in successfully with valid basic auth credentials', { tag: ['@low', '@auth'] }, async ({ page }) => {
    await page.goto('/basic_auth');
    await expect(page.locator('h3')).toHaveText('Basic Auth');
  });

  test('shows the congratulations message after basic auth', { tag: ['@critical', '@auth'] }, async ({ page }) => {
    await page.goto('/basic_auth');
    await expect(page.locator('p')).toContainText('Congratulations! You must have the proper credentials.');
  });
});

test.describe('Broken Images', {
  tag: ['@chromium', '@firefox', '@passed', '@broken-images'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Broken Images' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3979' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads the broken images page with three images', { tag: ['@high', '@visual'] }, async ({ page }) => {
    await page.goto('/broken_images');
    await expect(page.locator('#content img')).toHaveCount(3);
  });

  test('detects at least one broken image on the page', { tag: ['@medium', '@visual'] }, async ({ page }) => {
    await page.goto('/broken_images');
    const brokenCount = await page.locator('#content img').evaluateAll((imgs: any[]) =>
      imgs.filter((img: any) => !img.complete || img.naturalWidth === 0).length
    );
    expect(brokenCount).toBeGreaterThan(0);
  });
});

test.describe('Challenging DOM', {
  tag: ['@chromium', '@webkit', '@passed', '@challenging-dom'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Challenging DOM' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6722' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('renders a table with the expected column headers', { tag: ['@low', '@data-table'] }, async ({ page }) => {
    await page.goto('/challenging_dom');
    await expect(page.locator('table thead th')).toHaveText(['Lorem', 'Ipsum', 'Dolor', 'Sit', 'Amet', 'Diceret', 'Action']);
  });

  test('renders ten rows of data in the challenging DOM table', { tag: ['@critical', '@data-table'] }, async ({ page }) => {
    await page.goto('/challenging_dom');
    await expect(page.locator('table tbody tr')).toHaveCount(10);
  });
});

test.describe('Checkboxes', {
  tag: ['@chromium', '@android', '@passed', '@checkboxes'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Checkboxes' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7033' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads two checkboxes on the page', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    await expect(page.locator('#checkboxes input[type="checkbox"]')).toHaveCount(2);
  });

  test('checkbox two is checked by default', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    await expect(page.locator('#checkboxes input[type="checkbox"]').nth(1)).toBeChecked();
  });

  test('toggles checkbox one to checked state', { tag: ['@low', '@forms'] }, async ({ page }) => {
    await page.goto('/checkboxes');
    const first = page.locator('#checkboxes input[type="checkbox"]').nth(0);
    await expect(first).not.toBeChecked();
    await first.check();
    await expect(first).toBeChecked();
  });
});

test.describe('Context Menu', {
  tag: ['@chromium', '@ios', '@passed', '@context-menu'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Context Menu' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9168' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('triggers a JS alert on right click in the hot spot', { tag: ['@critical', '@dialogs'] }, async ({ page }) => {
    await page.goto('/context_menu');
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('You selected a context menu');
      await dialog.accept();
    });
    await page.locator('#hot-spot').click({ button: 'right' });
  });
});

test.describe('Disappearing Elements', {
  tag: ['@chromium', '@firefox', '@passed', '@disappearing-elements'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Disappearing Elements' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2440' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('always shows a Home navigation link', { tag: ['@high', '@navigation'] }, async ({ page }) => {
    await page.goto('/disappearing_elements');
    await expect(page.locator('ul li a', { hasText: 'Home' })).toBeVisible();
  });

  test('renders at least four navigation items', { tag: ['@medium', '@visual'] }, async ({ page }) => {
    await page.goto('/disappearing_elements');
    const count = await page.locator('#content ul li').count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

test.describe('Drag and Drop', {
  tag: ['@chromium', '@webkit', '@passed', '@drag-and-drop'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Drag and Drop' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9748' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows column A and column B with initial labels', { tag: ['@low', '@data-table'] }, async ({ page }) => {
    await page.goto('/drag_and_drop');
    await expect(page.locator('#column-a')).toHaveText('A');
    await expect(page.locator('#column-b')).toHaveText('B');
  });
});

test.describe('Dropdown', {
  tag: ['@chromium', '@android', '@passed', '@dropdown'],
  annotation: [
    { type: 'testdino:owner', description: 'catalog-squad' },
    { type: 'testdino:feature', description: 'Dropdown' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5865' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows a default disabled placeholder option', { tag: ['@critical', '@general'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await expect(page.locator('#dropdown')).toHaveValue('');
  });

  test('selects Option 1 from the dropdown', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await page.locator('#dropdown').selectOption('1');
    await expect(page.locator('#dropdown')).toHaveValue('1');
  });

  test('selects Option 2 from the dropdown', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/dropdown');
    await page.locator('#dropdown').selectOption('2');
    await expect(page.locator('#dropdown')).toHaveValue('2');
  });
});

test.describe('Dynamic Content', {
  tag: ['@chromium', '@ios', '@passed', '@dynamic-content'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Dynamic Content' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9672' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads dynamic content page with images', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/dynamic_content');
    await expect(page.locator('.large-2.columns img')).toHaveCount(3);
  });

  test('shows static content when with_content=static is used', { tag: ['@critical', '@general'] }, async ({ page }) => {
    await page.goto('/dynamic_content?with_content=static');
    await expect(page.locator('h3')).toHaveText('Dynamic Content');
  });
});

test.describe('Dynamic Controls', {
  tag: ['@chromium', '@firefox', '@passed', '@dynamic-controls'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Dynamic Controls' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9943' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('removes the checkbox after clicking Remove', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.locator('#checkbox-example button').click();
    await expect(page.locator('#message')).toHaveText("It's gone!", { timeout: 10000 });
    await expect(page.locator('#checkbox')).toHaveCount(0);
  });

  test('enables the text input after clicking Enable', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/dynamic_controls');
    await page.locator('#input-example button').click();
    await expect(page.locator('#message')).toHaveText("It's enabled!", { timeout: 10000 });
    await expect(page.locator('#input-example input')).toBeEnabled();
  });
});

test.describe('Dynamic Loading', {
  tag: ['@chromium', '@webkit', '@passed', '@dynamic-loading'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Dynamic Loading' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2203' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('reveals hidden text in example 1', { tag: ['@low', '@general'] }, async ({ page }) => {
    await page.goto('/dynamic_loading/1');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 10000 });
  });

  test('renders new text in example 2', { tag: ['@critical', '@visual'] }, async ({ page }) => {
    await page.goto('/dynamic_loading/2');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.locator('#finish')).toHaveText('Hello World!', { timeout: 10000 });
  });
});

test.describe('Entry Ad', {
  tag: ['@chromium', '@android', '@passed', '@entry-ad'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Entry Ad' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8057' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows a modal window on page load', { tag: ['@high', '@dialogs'] }, async ({ page }) => {
    await page.goto('/entry_ad');
    await expect(page.locator('.modal-title h3')).toHaveText('This is a modal window');
    await page.locator('.modal-footer p').click();
    await expect(page.locator('#modal')).toBeHidden();
  });

  test('reopens the modal after clicking restart ad', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/entry_ad');
    await page.locator('.modal-footer p').click();
    await page.locator('#restart-ad').click();
    await expect(page.locator('.modal-title h3')).toHaveText('This is a modal window', { timeout: 10000 });
  });
});

test.describe('File Download', {
  tag: ['@chromium', '@ios', '@passed', '@file-download'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'File Download' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2540' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('lists downloadable files', { tag: ['@low', '@downloads'] }, async ({ page }) => {
    await page.goto('/download');
    const count = await page.locator('#content a[href^="download/"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('includes the sample document in the file list', { tag: ['@critical', '@general'] }, async ({ page }) => {
    await page.goto('/download');
    await expect(page.locator('a[href="download/sample-document.txt"]')).toBeVisible();
  });
});

test.describe('File Upload', {
  tag: ['@chromium', '@firefox', '@passed', '@file-upload'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'File Upload' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7549' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows the file upload form controls', { tag: ['@high', '@upload'] }, async ({ page }) => {
    await page.goto('/upload');
    await expect(page.locator('#file-upload')).toBeVisible();
    await expect(page.locator('#file-submit')).toBeVisible();
  });

  test('uploads a file and confirms the file name', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/upload');
    await page.locator('#file-upload').setInputFiles({
      name: 'passed-suite-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('real world upload test'),
    });
    await page.locator('#file-submit').click();
    await expect(page.locator('h3')).toHaveText('File Uploaded!');
    await expect(page.locator('#uploaded-files')).toHaveText('passed-suite-upload.txt');
  });
});

test.describe('Floating Menu', {
  tag: ['@chromium', '@webkit', '@passed', '@floating-menu'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Floating Menu' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6457' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows the floating menu items', { tag: ['@low', '@interactions'] }, async ({ page }) => {
    await page.goto('/floating_menu');
    await expect(page.locator('#menu')).toBeVisible();
    await expect(page.locator('#menu a', { hasText: 'Home' })).toBeVisible();
  });

  test('keeps the menu visible after scrolling', { tag: ['@critical', '@interactions'] }, async ({ page }) => {
    await page.goto('/floating_menu');
    await page.mouse.wheel(0, 800);
    await expect(page.locator('#menu')).toBeVisible();
  });
});

test.describe('Forgot Password', {
  tag: ['@chromium', '@android', '@passed', '@forgot-password'],
  annotation: [
    { type: 'testdino:owner', description: 'identity-squad' },
    { type: 'testdino:feature', description: 'Forgot Password' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8928' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows the forgot password form', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/forgot_password');
    await expect(page.locator('h2')).toHaveText('Forgot Password');
    await expect(page.locator('#email')).toBeVisible();
  });

  test('shows the retrieve password button', { tag: ['@medium', '@auth'] }, async ({ page }) => {
    await page.goto('/forgot_password');
    await expect(page.getByRole('button', { name: 'Retrieve password' })).toBeVisible();
  });
});

test.describe('Form Authentication', {
  tag: ['@chromium', '@ios', '@passed', '@form-authentication'],
  annotation: [
    { type: 'testdino:owner', description: 'identity-squad' },
    { type: 'testdino:feature', description: 'Form Authentication' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6268' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows an error for invalid username', { tag: ['@low', '@general'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('not-a-real-user');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('Your username is invalid!');
  });

  test('shows an error for invalid password', { tag: ['@critical', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('wrong-password');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('Your password is invalid!');
  });

  test('logs in successfully with valid credentials', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#flash')).toContainText('You logged into a secure area!');
  });

  test('logs out successfully after logging in', { tag: ['@medium', '@general'] }, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill('tomsmith');
    await page.locator('#password').fill('SuperSecretPassword!');
    await page.locator('button[type="submit"]').click();
    await page.locator('a[href="/logout"]').click();
    await expect(page.locator('#flash')).toContainText('You logged out of the secure area!');
  });
});

test.describe('Frames', {
  tag: ['@chromium', '@firefox', '@passed', '@frames'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Frames' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2686' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows links to Nested Frames and iFrame', { tag: ['@low', '@frames'] }, async ({ page }) => {
    await page.goto('/frames');
    await expect(page.locator('a[href="/nested_frames"]')).toBeVisible();
    await expect(page.locator('a[href="/iframe"]')).toBeVisible();
  });
});

test.describe('iFrame Editor', {
  tag: ['@chromium', '@webkit', '@passed', '@iframe-editor'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'iFrame Editor' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8153' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads the TinyMCE iframe editor with its default content', { tag: ['@critical', '@frames'] }, async ({ page }) => {
    await page.goto('/iframe');
    const editorFrame = page.frameLocator('#mce_0_ifr');
    await expect(editorFrame.locator('#tinymce')).toContainText('Your content goes here.');
  });

  test('shows the TinyMCE iframe editor toolbar controls', { tag: ['@high', '@frames'] }, async ({ page }) => {
    await page.goto('/iframe');
    await expect(page.locator('.tox-toolbar__group button[aria-label="Bold"]')).toBeVisible();
    await expect(page.locator('.tox-toolbar__group button[aria-label="Italic"]')).toBeVisible();
  });
});

test.describe('Geolocation', {
  tag: ['@chromium', '@android', '@passed', '@geolocation'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Geolocation' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1870' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test.use({ geolocation: { latitude: 51.5074, longitude: -0.1278 }, permissions: ['geolocation'] });

  test('shows the mocked London latitude and longitude', { tag: ['@medium', '@general'] }, async ({ page }) => {
    await page.goto('/geolocation');
    await page.getByRole('button', { name: 'Where am I?' }).click();
    await expect(page.locator('#lat-value')).toHaveText('51.5074', { timeout: 10000 });
    await expect(page.locator('#long-value')).toHaveText('-0.1278', { timeout: 10000 });
  });
});

test.describe('Geolocation with a different location', {
  tag: ['@chromium', '@ios', '@passed', '@geolocation-with-a-different-location'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Geolocation with a different location' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4347' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test.use({ geolocation: { latitude: 40.7128, longitude: -74.006 }, permissions: ['geolocation'] });

  test('shows the mocked New York latitude and longitude', { tag: ['@low', '@general'] }, async ({ page }) => {
    await page.goto('/geolocation');
    await page.getByRole('button', { name: 'Where am I?' }).click();
    await expect(page.locator('#lat-value')).toHaveText('40.7128', { timeout: 10000 });
    await expect(page.locator('#long-value')).toHaveText('-74.006', { timeout: 10000 });
  });
});

test.describe('Horizontal Slider', {
  tag: ['@chromium', '@firefox', '@passed', '@horizontal-slider'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Horizontal Slider' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1629' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('increases the slider value with the right arrow key', { tag: ['@critical', '@keyboard'] }, async ({ page }) => {
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type="range"]');
    await slider.focus();
    await slider.press('ArrowRight');
    await slider.press('ArrowRight');
    await expect(page.locator('#range')).toHaveText('1');
  });

  test('decreases the slider value with the left arrow key', { tag: ['@high', '@keyboard'] }, async ({ page }) => {
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type="range"]');
    await slider.focus();
    await slider.press('ArrowRight');
    await slider.press('ArrowRight');
    await slider.press('ArrowLeft');
    await expect(page.locator('#range')).toHaveText('0.5');
  });
});

test.describe('Hovers', {
  tag: ['@chromium', '@webkit', '@passed', '@hovers'],
  annotation: [
    { type: 'testdino:owner', description: 'catalog-squad' },
    { type: 'testdino:feature', description: 'Hovers' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1751' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  const hoverCases = [
    { user: 'user1', tags: ['@critical', '@interactions'] },
    { user: 'user2', tags: ['@high', '@visual'] },
    { user: 'user3', tags: ['@medium', '@interactions'] },
  ];

  for (const [index, { user, tags }] of hoverCases.entries()) {
    test(`shows caption on hover over ${user}`, { tag: tags }, async ({ page }) => {
      await page.goto('/hovers');
      const figure = page.locator('.figure').nth(index);
      await figure.hover();
      await expect(figure.locator('.figcaption h5')).toHaveText(`name: ${user}`);
    });
  }
});

test.describe('Infinite Scroll', {
  tag: ['@chromium', '@android', '@passed', '@infinite-scroll'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Infinite Scroll' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7457' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  const loadedBlocks = (page: Page) => page.locator('.jscroll-added').filter({ hasNotText: 'Loading' }).count();

  test('loads paragraphs on initial page load', { tag: ['@medium', '@performance'] }, async ({ page }) => {
    await page.goto('/infinite_scroll');
    await expect.poll(() => loadedBlocks(page), { timeout: 10000 }).toBeGreaterThan(0);
  });

  test('loads more paragraphs after scrolling down', { tag: ['@low', '@interactions'] }, async ({ page }) => {
    await page.goto('/infinite_scroll');
    await expect.poll(() => loadedBlocks(page), { timeout: 10000 }).toBeGreaterThan(0);
    const before = await loadedBlocks(page);
    await page.mouse.wheel(0, 5000);
    await page.mouse.wheel(0, 5000);
    await expect.poll(() => loadedBlocks(page), { timeout: 10000 }).toBeGreaterThan(before);
  });
});

test.describe('Inputs', {
  tag: ['@chromium', '@ios', '@passed', '@inputs'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Inputs' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4073' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('accepts a positive number', { tag: ['@critical', '@forms'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('42');
    await expect(input).toHaveValue('42');
  });

  test('accepts a negative number', { tag: ['@high', '@forms'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('-15');
    await expect(input).toHaveValue('-15');
  });

  test('accepts a decimal number', { tag: ['@medium', '@forms'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('3.14');
    await expect(input).toHaveValue('3.14');
  });

  test('increments the number using the up arrow key', { tag: ['@low', '@keyboard'] }, async ({ page }) => {
    await page.goto('/inputs');
    const input = page.locator('input[type="number"]');
    await input.fill('5');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('6');
  });
});

test.describe('JQuery UI Menu', {
  tag: ['@chromium', '@firefox', '@passed', '@jquery-ui-menu'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'JQuery UI Menu' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8985' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows Disabled and Enabled menu items', { tag: ['@critical', '@interactions'] }, async ({ page }) => {
    await page.goto('/jqueryui/menu');
    await expect(page.locator('#menu').getByText('Disabled', { exact: true })).toBeVisible();
    await expect(page.locator('#menu').getByText('Enabled', { exact: true })).toBeVisible();
  });

  test('expands the Downloads submenu on hover', { tag: ['@high', '@downloads'] }, async ({ page }) => {
    await page.goto('/jqueryui/menu');
    await page.locator('#menu li', { hasText: 'Enabled' }).first().hover();
    await page.getByRole('link', { name: 'Downloads' }).hover();
    await expect(page.getByRole('link', { name: 'PDF' })).toBeVisible();
  });
});

test.describe('JavaScript Alerts', {
  tag: ['@chromium', '@webkit', '@passed', '@javascript-alerts'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'JavaScript Alerts' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5546' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('handles a JS alert', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Click for JS Alert' }).click();
    await expect(page.locator('#result')).toHaveText('You successfully clicked an alert');
  });

  test('handles a JS confirm accept', { tag: ['@low', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
    await expect(page.locator('#result')).toHaveText('You clicked: Ok');
  });

  test('handles a JS confirm dismiss', { tag: ['@critical', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Click for JS Confirm' }).click();
    await expect(page.locator('#result')).toHaveText('You clicked: Cancel');
  });

  test('handles a JS prompt with text', { tag: ['@high', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.accept('automated answer'));
    await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
    await expect(page.locator('#result')).toHaveText('You entered: automated answer');
  });

  test('handles a JS prompt dismiss', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/javascript_alerts');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Click for JS Prompt' }).click();
    await expect(page.locator('#result')).toHaveText('You entered: null');
  });
});

test.describe('JavaScript onload event error', {
  tag: ['@chromium', '@android', '@passed', '@javascript-onload-event-error'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'JavaScript onload event error' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3578' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads the page despite a JavaScript onload error', { tag: ['@low', '@performance'] }, async ({ page }) => {
    await page.goto('/javascript_error');
    await expect(page.locator('p')).toContainText('This page has a JavaScript error in the onload event.');
  });
});

test.describe('Key Presses', {
  tag: ['@chromium', '@ios', '@passed', '@key-presses'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Key Presses' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4800' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  const keys = [
    { key: 'a', label: 'A', tags: ['@critical', '@keyboard'] },
    { key: 'Escape', label: 'ESCAPE', tags: ['@high', '@keyboard'] },
    { key: 'Tab', label: 'TAB', tags: ['@medium', '@accessibility'] },
    { key: 'ArrowUp', label: 'UP', tags: ['@low', '@keyboard'] },
    { key: 'Space', label: 'SPACE', tags: ['@medium', '@keyboard'] },
  ];

  for (const { key, label, tags } of keys) {
    test(`shows ${label} when ${key} is pressed`, { tag: tags }, async ({ page }) => {
      await page.goto('/key_presses');
      await page.locator('#target').click();
      await page.locator('#target').press(key);
      await expect(page.locator('#result')).toHaveText(`You entered: ${label}`);
    });
  }
});

test.describe('Large & Deep DOM', {
  tag: ['@chromium', '@firefox', '@passed', '@large-deep-dom'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Large & Deep DOM' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6461' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows the No Siblings, Siblings, and Table headings', { tag: ['@critical', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('h4')).toHaveText(['No Siblings', 'Siblings', 'Table']);
  });

  test('renders fifty rows in the deep table', { tag: ['@high', '@data-table'] }, async ({ page }) => {
    await page.goto('/large');
    await expect(page.locator('tr[class^="row-"]')).toHaveCount(50);
  });

  test('renders the deeply nested parent div structure', { tag: ['@medium', '@visual'] }, async ({ page }) => {
    await page.goto('/large');
    const nestedDivCount = await page.locator('div.parent div').count();
    expect(nestedDivCount).toBeGreaterThan(10);
  });
});

test.describe('Multiple Windows', {
  tag: ['@chromium', '@webkit', '@passed', '@multiple-windows'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Multiple Windows' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3403' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('opens a new window with expected heading', { tag: ['@low', '@navigation'] }, async ({ page, context }) => {
    await page.goto('/windows');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);
    await newPage.waitForLoadState();
    await expect(newPage.locator('h3')).toHaveText('New Window');
  });

  test('keeps the original window heading unchanged', { tag: ['@critical', '@navigation'] }, async ({ page, context }) => {
    await page.goto('/windows');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Click Here' }).click(),
    ]);
    await newPage.waitForLoadState();
    await expect(page.locator('h3')).toHaveText('Opening a new window');
  });
});

test.describe('Nested Frames', {
  tag: ['@chromium', '@android', '@passed', '@nested-frames'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Nested Frames' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-3359' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows LEFT, MIDDLE, RIGHT, and BOTTOM frame content', { tag: ['@high', '@frames'] }, async ({ page }) => {
    await page.goto('/nested_frames');
    const top = page.frameLocator('frame[name="frame-top"]');
    await expect(top.frameLocator('frame[name="frame-left"]').locator('body')).toHaveText('LEFT');
    await expect(top.frameLocator('frame[name="frame-middle"]').locator('body')).toHaveText('MIDDLE');
    await expect(top.frameLocator('frame[name="frame-right"]').locator('body')).toHaveText('RIGHT');
    await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toHaveText('BOTTOM');
  });
});

test.describe('Notification Messages', {
  tag: ['@chromium', '@ios', '@passed', '@notification-messages'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Notification Messages' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2721' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows a notification message after clicking the link', { tag: ['@medium', '@dialogs'] }, async ({ page }) => {
    await page.goto('/notification_message');
    await expect(page.locator('#flash')).toBeVisible();
  });

  test('shows a notification message on repeated clicks', { tag: ['@low', '@dialogs'] }, async ({ page }) => {
    await page.goto('/notification_message');
    await page.getByRole('link', { name: 'Click here' }).click();
    await expect(page.locator('#flash')).toBeVisible();
  });
});

test.describe('Redirect Link', {
  tag: ['@chromium', '@firefox', '@passed', '@redirect-link'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Redirect Link' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2518' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('redirects to the status codes page when clicked', { tag: ['@critical', '@interactions'] }, async ({ page }) => {
    await page.goto('/redirector');
    await page.locator('#redirect').click();
    await expect(page).toHaveURL(/status_codes/, { timeout: 10000 });
  });
});

test.describe('Secure File Download', {
  tag: ['@chromium', '@webkit', '@passed', '@secure-file-download'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Secure File Download' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-9187' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test.use({ httpCredentials: { username: 'admin', password: 'admin' } });

  test('lists downloadable files with valid credentials', { tag: ['@high', '@auth'] }, async ({ page }) => {
    await page.goto('/download_secure');
    const count = await page.locator('#content a[href^="download_secure/"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('includes the sample document in the secure file list', { tag: ['@medium', '@general'] }, async ({ page }) => {
    await page.goto('/download_secure');
    await expect(page.locator('a[href="download_secure/sample-document.txt"]')).toBeVisible();
  });
});

test.describe('Shadow DOM', {
  tag: ['@chromium', '@android', '@passed', '@shadow-dom'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Shadow DOM' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-6370' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('renders the shadow DOM paragraph content', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/shadowdom');
    await expect(page.locator('my-paragraph').first()).toContainText("Let's have some different text!");
  });

  test('renders the shadow DOM list content', { tag: ['@critical', '@visual'] }, async ({ page }) => {
    await page.goto('/shadowdom');
    await expect(page.locator('my-paragraph li')).toHaveCount(2);
  });
});

test.describe('Shifting Content', {
  tag: ['@chromium', '@ios', '@passed', '@shifting-content'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Shifting Content' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8321' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows the shifting content menu heading and nav items', { tag: ['@high', '@interactions'] }, async ({ page }) => {
    await page.goto('/shifting_content/menu');
    await expect(page.locator('h3')).toHaveText('Shifting Content: Menu Element');
    await expect(page.locator('ul li a', { hasText: 'Home' })).toBeVisible();
  });

  test('shows the shifting content image heading', { tag: ['@medium', '@visual'] }, async ({ page }) => {
    await page.goto('/shifting_content/image');
    await expect(page.locator('h3')).toHaveText('Shifting Content: Image');
  });

  test('shows the shifting content list heading and static text', { tag: ['@low', '@visual'] }, async ({ page }) => {
    await page.goto('/shifting_content/list');
    await expect(page.locator('h3')).toHaveText('Shifting Content: List');
    await expect(page.getByText("Important Information You're Looking For")).toBeVisible();
  });
});

test.describe('Slow Resources', {
  tag: ['@chromium', '@firefox', '@passed', '@slow-resources'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Slow Resources' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4238' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads the slow resources page heading promptly', { tag: ['@critical', '@dialogs'] }, async ({ page }) => {
    await page.goto('/slow');
    await expect(page.locator('h3')).toHaveText('Slow Resources');
  });
});

test.describe('Sortable Data Tables', {
  tag: ['@chromium', '@webkit', '@passed', '@sortable-data-tables'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Sortable Data Tables' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4523' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows expected column headers in table one', { tag: ['@high', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await expect(page.locator('#table1 thead th')).toHaveText(['Last Name', 'First Name', 'Email', 'Due', 'Web Site', 'Action']);
  });

  test('shows expected column headers in table two', { tag: ['@medium', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await expect(page.locator('#table2 thead th')).toHaveText(['Last Name', 'First Name', 'Email', 'Due', 'Web Site', 'Action']);
  });

  test('sorts table one by last name ascending', { tag: ['@low', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    await page.locator('#table1 thead th', { hasText: 'Last Name' }).click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Bach');
  });

  test('sorts table one by last name descending', { tag: ['@critical', '@data-table'] }, async ({ page }) => {
    await page.goto('/tables');
    const header = page.locator('#table1 thead th', { hasText: 'Last Name' });
    await header.click();
    await header.click();
    await expect(page.locator('#table1 tbody tr').first().locator('td').first()).toHaveText('Smith');
  });
});

test.describe('Status Codes', {
  tag: ['@chromium', '@android', '@passed', '@status-codes'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Status Codes' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8320' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  const statusCases = [
    { code: 200, tags: ['@critical', '@network'] },
    { code: 301, tags: ['@high', '@navigation'] },
    { code: 404, tags: ['@high', '@network'] },
    { code: 500, tags: ['@critical', '@network'] },
  ];

  for (const { code, tags } of statusCases) {
    test(`shows the ${code} status code message`, { tag: tags }, async ({ page }) => {
      await page.goto(`/status_codes/${code}`);
      await expect(page.locator('#content p').first()).toContainText(`This page returned a ${code} status code`);
    });
  }
});

test.describe('Typos', {
  tag: ['@chromium', '@ios', '@passed', '@typos'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Typos' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4663' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('shows the typos page heading and paragraph', { tag: ['@high', '@general'] }, async ({ page }) => {
    await page.goto('/typos');
    await expect(page.locator('h3')).toHaveText('Typos');
    await expect(page.locator('#content p').first()).not.toBeEmpty();
  });
});

test.describe('WYSIWYG Editor', {
  tag: ['@chromium', '@firefox', '@passed', '@wysiwyg-editor'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'WYSIWYG Editor' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5496' },
    { type: 'testdino:context', description: 'Green-path sample data - every test in this suite is expected to pass.' },
  ],
}, () => {
  test('loads the TinyMCE editor with its default content', { tag: ['@medium', '@frames'] }, async ({ page }) => {
    await page.goto('/tinymce');
    const editorFrame = page.frameLocator('#mce_0_ifr');
    await expect(editorFrame.locator('#tinymce')).toContainText('Your content goes here.');
  });

  test('shows the toolbar bold button in the editor', { tag: ['@low', '@frames'] }, async ({ page }) => {
    await page.goto('/tinymce');
    await expect(page.locator('.tox-toolbar__group button[aria-label="Bold"]')).toBeVisible();
  });
});
