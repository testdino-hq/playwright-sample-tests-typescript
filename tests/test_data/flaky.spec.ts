import { expect, test } from '@playwright/test';

test.use({ baseURL: 'https://the-internet.herokuapp.com' });

const raceConditionCases = [
  { name: 'Homepage hero renders before the heading assertion settles', path: '/', selector: 'h1.heading', ghost: '.hero-skeleton-loaded', tags: ['@critical', '@visual'] },
  { name: 'A/B variant class is applied after first paint', path: '/abtest', selector: 'h3', ghost: '.variant-resolved', tags: ['@high', '@visual'] },
  { name: 'Add Element button binds its click handler late', path: '/add_remove_elements/', selector: '#content', ghost: '.handler-bound', tags: ['@medium', '@interactions'] },
  { name: 'Broken image scan starts before lazy-load completes', path: '/broken_images', selector: '#content', ghost: '.images-settled', tags: ['@low', '@visual'] },
  { name: 'Challenging DOM canvas paints after the row assertion', path: '/challenging_dom', selector: '#content', ghost: '.canvas-painted', tags: ['@critical', '@data-table'] },
  { name: 'Checkbox group hydrates a frame after mount', path: '/checkboxes', selector: '#checkboxes', ghost: '.checkbox-hydrated', tags: ['@high', '@frames'] },
  { name: 'Context menu hot spot registers its listener late', path: '/context_menu', selector: '#hot-spot', ghost: '.contextmenu-ready', tags: ['@medium', '@interactions'] },
  { name: 'Disappearing nav randomizes during the visibility check', path: '/disappearing_elements', selector: '#content', ghost: '.nav-stabilized', tags: ['@low', '@navigation'] },
  { name: 'Drag column opacity transition races the label read', path: '/drag_and_drop', selector: '#column-a', ghost: '.drag-initialized', tags: ['@critical', '@data-table'] },
  { name: 'Dropdown options attach after the select is queried', path: '/dropdown', selector: '#dropdown', ghost: '.options-populated', tags: ['@high', '@forms'] },
  { name: 'Dynamic content images swap mid-assertion', path: '/dynamic_content', selector: '#content', ghost: '.content-locked', tags: ['@medium', '@visual'] },
  { name: 'Dynamic controls toggle lands after the state read', path: '/dynamic_controls', selector: '#content', ghost: '.controls-idle', tags: ['@low', '@general'] },
  { name: 'Download list renders after the anchor count is taken', path: '/download', selector: '#content', ghost: '.downloads-rendered', tags: ['@critical', '@downloads'] },
  { name: 'Upload input is queried before dropzone initializes', path: '/upload', selector: '#file-upload', ghost: '.dropzone-ready', tags: ['@high', '@upload'] },
  { name: 'Floating menu settles position after a layout reflow', path: '/floating_menu', selector: '#menu', ghost: '.menu-anchored', tags: ['@medium', '@interactions'] },
  { name: 'Forgot password field focus races the input query', path: '/forgot_password', selector: '#email', ghost: '.form-focused', tags: ['@low', '@auth'] },
  { name: 'Login form autofill fires after the field assertion', path: '/login', selector: '#username', ghost: '.autofill-complete', tags: ['@critical', '@auth'] },
  { name: 'Horizontal slider value binds one animation frame late', path: '/horizontal_slider', selector: 'input[type="range"]', ghost: '.slider-bound', tags: ['@high', '@frames'] },
  { name: 'Hover caption transition races the figure lookup', path: '/hovers', selector: '.figure', ghost: '.hover-ready', tags: ['@medium', '@interactions'] },
  { name: 'Number input debounce delays the value commit', path: '/inputs', selector: 'input[type="number"]', ghost: '.input-debounced', tags: ['@low', '@forms'] },
  { name: 'JQuery UI menu widget initializes after the DOM query', path: '/jqueryui/menu', selector: '#menu', ghost: '.menu-widget-ready', tags: ['@critical', '@interactions'] },
  { name: 'Key press listener attaches after the target is read', path: '/key_presses', selector: '#target', ghost: '.keyhandler-attached', tags: ['@high', '@keyboard'] },
  { name: 'Deep DOM layout reflows during the row count', path: '/large', selector: '#content', ghost: '.layout-settled', tags: ['@medium', '@data-table'] },
  { name: 'Table sorter plugin binds after the header assertion', path: '/tables', selector: '#table1', ghost: '.tablesorter-ready', tags: ['@low', '@data-table'] },
  { name: 'Typos paragraph re-renders during the text read', path: '/typos', selector: '#content', ghost: '.copy-finalized', tags: ['@critical', '@visual'] },
];

test.describe('Race Condition', {
  tag: ['@chromium', '@firefox', '@flaky', '@race-condition'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Race Condition' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-4716' },
    { type: 'testdino:context', description: 'Flaky sample data - fails on the first attempt, passes on retry.' },
  ],
}, () => {
  for (const { name, path, selector, ghost, tags } of raceConditionCases) {
    test(`[Race Condition] ${name}`, {
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

const networkCases = [
  { name: 'Homepage request times out on a cold connection', path: '/', selector: 'h1.heading', tags: ['@high', '@navigation'] },
  { name: 'A/B test endpoint is slow to respond', path: '/abtest', selector: 'h3', tags: ['@medium', '@network'] },
  { name: 'Add/Remove page stalls behind a slow CDN edge', path: '/add_remove_elements/', selector: '#content', tags: ['@low', '@network'] },
  { name: 'Challenging DOM assets exceed the connection budget', path: '/challenging_dom', selector: '#content', tags: ['@critical', '@network'] },
  { name: 'Checkboxes page hits a transient gateway delay', path: '/checkboxes', selector: '#checkboxes', tags: ['@high', '@forms'] },
  { name: 'Context menu page load is throttled by the proxy', path: '/context_menu', selector: '#hot-spot', tags: ['@medium', '@interactions'] },
  { name: 'Disappearing elements route responds past the deadline', path: '/disappearing_elements', selector: '#content', tags: ['@low', '@navigation'] },
  { name: 'Drag and drop assets are served from a cold cache', path: '/drag_and_drop', selector: '#column-a', tags: ['@critical', '@interactions'] },
  { name: 'Dropdown page navigation exceeds the timeout budget', path: '/dropdown', selector: '#dropdown', tags: ['@high', '@forms'] },
  { name: 'Dynamic content images saturate the connection pool', path: '/dynamic_content', selector: '#content', tags: ['@medium', '@visual'] },
  { name: 'Dynamic controls page is delayed by a DNS lookup', path: '/dynamic_controls', selector: '#content', tags: ['@low', '@network'] },
  { name: 'Download listing request is queued behind other traffic', path: '/download', selector: '#content', tags: ['@critical', '@downloads'] },
  { name: 'Upload page stalls waiting on the dropzone bundle', path: '/upload', selector: '#file-upload', tags: ['@high', '@upload'] },
  { name: 'Floating menu stylesheet blocks first paint', path: '/floating_menu', selector: '#menu', tags: ['@medium', '@interactions'] },
  { name: 'Forgot password route hits a rate limiter', path: '/forgot_password', selector: '#email', tags: ['@low', '@auth'] },
  { name: 'Login page navigation is interrupted by a TLS renegotiation', path: '/login', selector: '#username', tags: ['@critical', '@auth'] },
  { name: 'Frames page is slow behind a redirect chain', path: '/frames', selector: '#content', tags: ['@high', '@frames'] },
  { name: 'Horizontal slider page load exceeds the network deadline', path: '/horizontal_slider', selector: 'input[type="range"]', tags: ['@medium', '@forms'] },
  { name: 'Hovers avatars are fetched from a cold origin', path: '/hovers', selector: '.figure', tags: ['@low', '@interactions'] },
  { name: 'Inputs page is delayed by a slow upstream hop', path: '/inputs', selector: 'input[type="number"]', tags: ['@critical', '@forms'] },
  { name: 'JQuery UI bundle download exceeds the timeout', path: '/jqueryui/menu', selector: '#menu', tags: ['@high', '@downloads'] },
  { name: 'Key presses page load is throttled mid-flight', path: '/key_presses', selector: '#target', tags: ['@medium', '@keyboard'] },
  { name: 'Large DOM payload exceeds the transfer window', path: '/large', selector: '#content', tags: ['@low', '@navigation'] },
  { name: 'Tables page assets are blocked by a slow font fetch', path: '/tables', selector: '#table1', tags: ['@critical', '@data-table'] },
  { name: 'Shifting content route responds after the deadline', path: '/shifting_content/list', selector: '#content', tags: ['@high', '@visual'] },
];

test.describe('Network Instability', {
  tag: ['@chromium', '@webkit', '@flaky', '@network-instability'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Network Instability' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5282' },
    { type: 'testdino:context', description: 'Flaky sample data - fails on the first attempt, passes on retry.' },
  ],
}, () => {
  for (const { name, path, selector, tags } of networkCases) {
    test(`[Network Instability] ${name}`, {
      tag: tags,
      annotation: [{ type: 'testdino:flaky-reason', description: `Network instability: ${name}` }],
    }, async ({ page }, testInfo) => {
      await page.goto(path, { timeout: testInfo.retry === 0 ? 1 : 30000 });
      await expect(page.locator(selector).first()).toBeVisible();
    });
  }
});

const asyncDataCases = [
  { name: 'Search index is still warming when results are asserted', path: '/', field: 'indexedDocuments', expected: 250, tags: ['@medium', '@data-pipeline'] },
  { name: 'Experiment assignment has not propagated to the read replica', path: '/abtest', field: 'assignedVariant', expected: 1, tags: ['@low', '@general'] },
  { name: 'Element counter lags behind the append operation', path: '/add_remove_elements/', field: 'renderedElements', expected: 3, tags: ['@critical', '@general'] },
  { name: 'Image manifest is fetched after the gallery renders', path: '/broken_images', field: 'manifestEntries', expected: 3, tags: ['@high', '@visual'] },
  { name: 'Table dataset is paginated in after first render', path: '/challenging_dom', field: 'loadedRows', expected: 10, tags: ['@medium', '@data-table'] },
  { name: 'Checkbox defaults arrive from a late preferences call', path: '/checkboxes', field: 'restoredPreferences', expected: 2, tags: ['@low', '@forms'] },
  { name: 'Menu permissions resolve after the first render pass', path: '/context_menu', field: 'grantedActions', expected: 4, tags: ['@critical', '@interactions'] },
  { name: 'Navigation config is hydrated from a deferred request', path: '/disappearing_elements', field: 'navItems', expected: 5, tags: ['@high', '@navigation'] },
  { name: 'Drag targets register after the layout pass completes', path: '/drag_and_drop', field: 'dropTargets', expected: 2, tags: ['@medium', '@interactions'] },
  { name: 'Dropdown options arrive from a deferred catalog call', path: '/dropdown', field: 'catalogOptions', expected: 2, tags: ['@low', '@forms'] },
  { name: 'Content feed is populated by a background refresh', path: '/dynamic_content', field: 'feedItems', expected: 3, tags: ['@critical', '@general'] },
  { name: 'Control state syncs from the server after mount', path: '/dynamic_controls', field: 'syncedControls', expected: 2, tags: ['@high', '@general'] },
  { name: 'File listing is assembled by an async directory scan', path: '/download', field: 'listedFiles', expected: 12, tags: ['@medium', '@general'] },
  { name: 'Upload quota is fetched after the form is enabled', path: '/upload', field: 'remainingQuotaMb', expected: 100, tags: ['@low', '@upload'] },
  { name: 'Menu entitlements load after the shell renders', path: '/floating_menu', field: 'visibleMenuItems', expected: 5, tags: ['@critical', '@interactions'] },
  { name: 'Password policy is fetched after the form paints', path: '/forgot_password', field: 'minPasswordLength', expected: 12, tags: ['@high', '@auth'] },
  { name: 'Session token refresh completes after the first request', path: '/login', field: 'tokenTtlMinutes', expected: 30, tags: ['@medium', '@auth'] },
  { name: 'Slider bounds are configured by a late settings call', path: '/horizontal_slider', field: 'sliderMax', expected: 5, tags: ['@low', '@forms'] },
  { name: 'Profile cards are resolved from a batched user query', path: '/hovers', field: 'resolvedProfiles', expected: 3, tags: ['@critical', '@data-pipeline'] },
  { name: 'Validation rules are compiled after the input mounts', path: '/inputs', field: 'activeRules', expected: 4, tags: ['@high', '@forms'] },
  { name: 'Menu tree is materialized from a deferred fetch', path: '/jqueryui/menu', field: 'menuNodes', expected: 8, tags: ['@medium', '@interactions'] },
  { name: 'Keymap is loaded after the input is focusable', path: '/key_presses', field: 'mappedKeys', expected: 256, tags: ['@low', '@forms'] },
  { name: 'Virtualized rows are measured after the scroll container mounts', path: '/large', field: 'measuredRows', expected: 50, tags: ['@critical', '@data-table'] },
  { name: 'Sort comparators register after the table is built', path: '/tables', field: 'sortableColumns', expected: 6, tags: ['@high', '@data-table'] },
  { name: 'Locale strings resolve after the first render', path: '/typos', field: 'loadedStrings', expected: 42, tags: ['@medium', '@visual'] },
];

test.describe('Async Data Sync', {
  tag: ['@chromium', '@android', '@flaky', '@async-data-sync'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Async Data Sync' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8605' },
    { type: 'testdino:context', description: 'Flaky sample data - fails on the first attempt, passes on retry.' },
  ],
}, () => {
  for (const { name, path, field, expected, tags } of asyncDataCases) {
    test(`[Async Data Sync] ${name}`, {
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

const environmentCases = [
  { name: 'CI runner drops the connection mid-run', path: '/', code: 'ECONNRESET', message: 'socket hang up while streaming the response', tags: ['@low', '@interactions'] },
  { name: 'Shared test account is locked by a parallel worker', path: '/abtest', code: 'AccountLockedError', message: 'account is held by another worker in this shard', tags: ['@critical', '@environment'] },
  { name: 'Browser context runs out of memory under load', path: '/add_remove_elements/', code: 'OutOfMemoryError', message: 'renderer process exceeded its memory budget', tags: ['@high', '@data-table'] },
  { name: 'Image CDN returns a transient 503', path: '/broken_images', code: 'ServiceUnavailableError', message: 'asset CDN responded 503 Service Unavailable', tags: ['@medium', '@visual'] },
  { name: 'Canvas fingerprint differs on this runner image', path: '/challenging_dom', code: 'RenderMismatchError', message: 'canvas raster differs from the recorded baseline', tags: ['@low', '@visual'] },
  { name: 'Preference service is briefly unavailable', path: '/checkboxes', code: 'UpstreamUnavailableError', message: 'preferences service did not answer in time', tags: ['@critical', '@general'] },
  { name: 'Clipboard permission prompt steals focus', path: '/context_menu', code: 'FocusStolenError', message: 'a permission prompt took focus during the interaction', tags: ['@high', '@dialogs'] },
  { name: 'Feature flag service returns a stale snapshot', path: '/disappearing_elements', code: 'StaleFlagsError', message: 'feature flag snapshot was older than the run', tags: ['@medium', '@general'] },
  { name: 'Pointer events are dropped by the virtual display', path: '/drag_and_drop', code: 'PointerDroppedError', message: 'virtual display dropped a pointer event sequence', tags: ['@low', '@interactions'] },
  { name: 'Catalog service cold start exceeds the budget', path: '/dropdown', code: 'ColdStartError', message: 'catalog lambda cold start exceeded the budget', tags: ['@critical', '@catalog'] },
  { name: 'Asset host rate limits the parallel shards', path: '/dynamic_content', code: 'RateLimitError', message: 'asset host returned 429 for this shard', tags: ['@high', '@general'] },
  { name: 'Background job queue is backed up', path: '/dynamic_controls', code: 'QueueBacklogError', message: 'control-sync job was still queued', tags: ['@medium', '@general'] },
  { name: 'Temp directory is cleaned by a parallel job', path: '/download', code: 'ENOENT', message: 'download directory was removed by a concurrent job', tags: ['@low', '@general'] },
  { name: 'Disk quota is exhausted on the runner', path: '/upload', code: 'ENOSPC', message: 'no space left on device while staging the upload', tags: ['@critical', '@performance'] },
  { name: 'Font loading shifts the menu geometry', path: '/floating_menu', code: 'LayoutShiftError', message: 'web font swap shifted the menu past its anchor', tags: ['@high', '@interactions'] },
  { name: 'Mail sandbox is slow to accept the message', path: '/forgot_password', code: 'MailSandboxTimeout', message: 'mail sandbox did not accept the message in time', tags: ['@medium', '@general'] },
  { name: 'Auth session expires between shards', path: '/login', code: 'SessionExpiredError', message: 'shared auth session expired before this shard ran', tags: ['@low', '@auth'] },
  { name: 'Frame isolation policy blocks the first load', path: '/frames', code: 'FrameBlockedError', message: 'frame was blocked by the sandbox policy on first load', tags: ['@critical', '@frames'] },
  { name: 'Input device profile is not ready on the runner', path: '/horizontal_slider', code: 'InputDeviceError', message: 'virtual input device was not initialised yet', tags: ['@high', '@forms'] },
  { name: 'Avatar service returns an intermittent 502', path: '/hovers', code: 'BadGatewayError', message: 'avatar service responded 502 Bad Gateway', tags: ['@medium', '@visual'] },
  { name: 'Locale data is missing from the container image', path: '/inputs', code: 'LocaleMissingError', message: 'ICU locale data was absent from the runner image', tags: ['@low', '@visual'] },
  { name: 'Widget bundle hash mismatches the deployed version', path: '/jqueryui/menu', code: 'BundleMismatchError', message: 'widget bundle hash did not match the deployment', tags: ['@critical', '@general'] },
  { name: 'Keyboard layout differs on the container image', path: '/key_presses', code: 'KeyboardLayoutError', message: 'container keyboard layout did not match the expected map', tags: ['@high', '@keyboard'] },
  { name: 'Runner CPU throttling stretches the render budget', path: '/large', code: 'CpuThrottledError', message: 'runner CPU was throttled during the render pass', tags: ['@medium', '@visual'] },
  { name: 'Timezone drift breaks the due-date column', path: '/tables', code: 'TimezoneDriftError', message: 'runner timezone drifted from the expected offset', tags: ['@low', '@data-table'] },
];

test.describe('Environment Instability', {
  tag: ['@chromium', '@ios', '@flaky', '@environment-instability'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-platform' },
    { type: 'testdino:feature', description: 'Environment Instability' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-8439' },
    { type: 'testdino:context', description: 'Flaky sample data - fails on the first attempt, passes on retry.' },
  ],
}, () => {
  for (const { name, path, code, message, tags } of environmentCases) {
    test(`[Environment Instability] ${name}`, {
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
