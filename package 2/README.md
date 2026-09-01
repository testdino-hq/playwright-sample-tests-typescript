# @testdino/playwright

[![npm version](https://img.shields.io/npm/v/@testdino/playwright.svg)](https://www.npmjs.com/package/@testdino/playwright)
[![npm downloads](https://img.shields.io/npm/dm/@testdino/playwright.svg)](https://www.npmjs.com/package/@testdino/playwright)
[![total downloads](https://img.shields.io/npm/dt/@testdino/playwright.svg)](https://www.npmjs.com/package/@testdino/playwright)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

Real-time Playwright reporting for debugging failures, detecting flaky tests, and keeping traces, screenshots, videos, logs, and CI history in one place.

<p align="center">
  <img width="830" src="https://tdstorageus.blob.core.windows.net/public/thumbnail/real-time-thumbnail.webp" alt="TestDino: real-time reporting, flaky detection, failure triage, and MCP for Playwright in CI" />
</p>

**[Website](https://www.testdino.com)** | **[Documentation](https://docs.testdino.com/)** | **[Get Your Token](https://docs.testdino.com/guides/generate-api-keys#create-an-api-key)** | **[Changelog](https://changelog.testdino.com/?type=cli)** | **[Support](mailto:support@testdino.com)**

## What TestDino adds to Playwright

### Debug failures faster

- [Real-time streaming](https://testdino.com/features/real-time-streaming): results appear as each test finishes, including sharded CI runs
- [Test evidence](https://testdino.com/features/test-evidence): failure screenshots, execution video, and retry-level evidence for every attempt
- [Trace viewer](https://testdino.com/features/trace-viewer): step through DOM snapshots, network, and console in the browser without downloading trace zips
- [Error groups](https://testdino.com/features/error-grouping): failures clustered by pattern, so you fix a root cause once instead of triaging one by one

### Find and fix flaky tests

- [Flaky detection](https://testdino.com/features/flaky-tests): retry analysis and cross-run pattern matching with root-cause classification
- [Test trends](https://testdino.com/features/test-trends): pass-rate trends, flakiness scoring, and regression detection
- [Test explorer](https://testdino.com/features/test-explorer): flaky rates, pass rates, and durations across spec files and individual tests

### Fit into your CI workflow

- [PR coverage](https://testdino.com/features/pr-coverage): inline summaries on GitHub and GitLab PRs, separating new failures from pre-existing ones
- [Code coverage](https://testdino.com/features/code-coverage): Istanbul coverage with automatic shard merging and branch comparison
- [Environment mapping](https://testdino.com/features/environment-mapping): map branches to named environments and scope trends and flaky detection per environment
- [CI/CD integrations](https://testdino.com/features/cicd-integrations): GitHub Actions, GitLab CI, Azure DevOps, Jenkins, CircleCI, TeamCity, AWS CodeBuild, Bitbucket Pipelines, Buildkite, and Harness

### Route failures to the right place

- [Bug reports](https://testdino.com/features/bug-reports): open Jira, Linear, Asana, or monday.com issues from a failed test with full context
- [Test tags](https://testdino.com/features/test-tags): set priority, owner, feature area, and Slack routing from test code
- [Scheduled reports](https://testdino.com/features/scheduled-reports): automated PDF summaries with trend graphs and branch statistics

### Give AI agents test context

- [MCP server](https://testdino.com/features/mcp-server): let coding assistants query runs, debug failures, and suggest fixes
- [Playwright skills](https://testdino.com/integrations/playwright-skills): prebuilt Claude Code skills to write, fix, and refactor Playwright tests

See [all features](https://testdino.com/features) for the full list.

## Quick start

**Requirements:** Node.js >= 18, `@playwright/test` >= 1.52.0

**1.** Install the reporter:

```bash
npm install --save-dev @testdino/playwright
```

**2.** Add it to your Playwright config:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['@testdino/playwright', { token: process.env.TESTDINO_TOKEN }], ['html']],
});
```

**3.** Set your token and run your tests as usual:

```bash
export TESTDINO_TOKEN="your-token"
npx playwright test
```

No upload step is needed. Results stream to your TestDino dashboard as the run happens.

### Capture traces, screenshots, and videos

TestDino uploads whatever Playwright produces. If these are off in your Playwright config, there is nothing to upload and your runs will show no artifacts:

```typescript
// playwright.config.ts
use: {
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
}
```

Use `'on'` instead of `'retain-on-failure'` to capture artifacts for passing tests too.

### Prefer not to edit your config?

Skip step 2 and run `tdpw test` instead. Same result, no config change. Pass your token with `-t`, or set `TESTDINO_TOKEN` first and omit it.

```bash
npx tdpw test -t "your-token"
```

### Want to hand this off to AI?

Copy the prompt below into Claude Code, Cursor, or your editor assistant and let it wire up the setup for you.

```
Your task is to set up Playwright to report test results to TestDino.

1. Install "@testdino/playwright" as a development dependency, using the
   project's package manager (npm, pnpm, yarn, ...).

2. Update the Playwright config file (playwright.config.ts|js|mjs):

   - Add the TestDino reporter, keeping any existing reporters:

   // playwright.config.ts
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     reporter: [['@testdino/playwright', { token: process.env.TESTDINO_TOKEN }], ['html']],
   });

   - Enable traces, videos and screenshots so there are artifacts to upload:

   use: {
     trace: 'retain-on-failure',
     video: 'retain-on-failure',
     screenshot: 'only-on-failure',
   }

3. Tell me to set TESTDINO_TOKEN in my environment and in CI secrets.
   Do not hardcode the token in any file.

4. If the project runs sharded tests in CI, use "npx tdpw test --ci-run-id <id>"
   so every shard reports into a single run.
```

## Configuration

### Options

| Option      | CLI Flag         | Environment Variable  | Description                     |
| ----------- | ---------------- | --------------------- | ------------------------------- |
| `token`     | `--token`, `-t`  | `TESTDINO_TOKEN`      | Authentication token (required) |
| `serverUrl` | `--server-url`   | `TESTDINO_SERVER_URL` | Server URL                      |
| `debug`     | `--debug`        | `TESTDINO_DEBUG`      | Enable debug logging            |
| `ciRunId`   | `--ci-run-id`    | -                     | Group sharded test runs         |
| `artifacts` | `--no-artifacts` | -                     | Disable artifact uploads        |
| `coverage`  | `--coverage`     | -                     | Enable code coverage collection |
| `tags`      | `--tags <csv>`   | `TESTDINO_TAGS`       | Run-level labels (comma-sep)    |

### Config file

For anything beyond a token, use a config file:

```typescript
// testdino.config.ts
export default {
  token: process.env.TESTDINO_TOKEN,
  debug: false,
  artifacts: true,
  coverage: {
    enabled: true,
    include: ['src/**'],
    exclude: ['**/node_modules/**'],
    thresholds: {
      lines: 80,
      branches: 60,
      functions: 80,
      statements: 80,
    },
  },
};
```

### Priority

Highest to lowest. The first source that sets a value wins:

1. CLI flags (`--token`)
2. Config file (`testdino.config.ts`)
3. Playwright config (reporter options)
4. Environment variables

## CLI usage

`tdpw test` wraps Playwright when you would rather not edit your config, or need a run-scoped flag like `--ci-run-id`. Any option TestDino does not recognize is passed through to Playwright:

```bash
npx tdpw test --headed --project=chromium
npx tdpw test --retries=2 --workers=4
npx tdpw test --coverage
npx tdpw test --no-artifacts
```

### Passing arguments to Playwright

TestDino consumes its own flags and forwards everything else. Use `--` to end TestDino's flags and pass the rest to Playwright verbatim. This matters whenever a TestDino flag takes a value or shares a name with a Playwright flag:

```bash
npx tdpw test --ci-run-id "$CI_RUN_ID" -- --shard=1/4
```

> **Note:** `--debug` is consumed by TestDino, where it enables TestDino's own debug logging. It is not forwarded to Playwright, so `npx tdpw test --debug` will _not_ open the Playwright Inspector. To open the Inspector, pass it after `--`:

```bash
npx tdpw test -- --debug          # Playwright Inspector
npx tdpw test --debug             # TestDino debug logging
TESTDINO_DEBUG=1 npx tdpw test -- --debug   # both
```

## CI/CD integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run tests
        env:
          TESTDINO_TOKEN: ${{ secrets.TESTDINO_TOKEN }}
        run: npx playwright test
```

With the reporter in your Playwright config, CI needs nothing beyond the token.

### Sharded execution

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - name: Run shard
        env:
          TESTDINO_TOKEN: ${{ secrets.TESTDINO_TOKEN }}
        run: npx tdpw test --ci-run-id ${{ github.run_id }} -- --shard=${{ matrix.shard }}/4
```

Sharding uses `tdpw test` so every shard can share one `--ci-run-id`. All shards with the same id are grouped into a single logical run on the TestDino dashboard.

### Split execution

When you fan a suite across CI machines yourself — each job running an arbitrary subset rather than a Playwright `--shard` — use split mode to aggregate those jobs into one logical run. Every job passes its own position and a shared group id:

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        split: [1, 2, 3, 4]
    steps:
      - name: Run split
        env:
          TESTDINO_TOKEN: ${{ secrets.TESTDINO_TOKEN }}
        run: npx tdpw test --split ${{ matrix.split }}/4 --split-id ${{ github.run_id }}
```

- `--split <current>/<total>` — this job's slot and the total number of splits (positive integers, `current <= total`). CLI-only, like `--shard`.
- `--split-id <id>` — group key correlating all splits of one logical run; make it unique per pipeline execution. Like `--ci-run-id`, it resolves from any config source — the flag, `splitId` in `testdino.config.ts`, Playwright reporter options, or the `TESTDINO_SPLIT_ID` environment variable — so `--split-id ${{ github.run_id }}` above is equivalent to setting `TESTDINO_SPLIT_ID`.
- A position and an id are required together — one without the other is an error. A split may itself be sharded (`--split 2/4 -- --shard=1/3`).

### GitLab CI

```yaml
e2e-tests:
  image: mcr.microsoft.com/playwright:v1.52.0-jammy
  script:
    - npm ci
    - npx playwright test
  variables:
    TESTDINO_TOKEN: $TESTDINO_TOKEN
```

### Other providers

Setup guides for every supported provider:

- [GitHub Actions](https://docs.testdino.com/guides/playwright-github-actions)
- [GitLab CI](https://docs.testdino.com/guides/playwright-gitlab-ci-setup)
- [Azure DevOps](https://docs.testdino.com/guides/playwright-azure-devops-pipeline)
- [Jenkins](https://docs.testdino.com/guides/playwright-jenkins)
- [CircleCI](https://docs.testdino.com/guides/playwright-circle-ci-cli)
- [AWS CodeBuild](https://docs.testdino.com/guides/playwright-amazon-codebuild)
- [Bitbucket Pipelines](https://docs.testdino.com/guides/playwright-bitbucket)

## Code coverage

**1.** Instrument your application with Istanbul (e.g., `babel-plugin-istanbul`). Your app must expose `window.__coverage__` in the browser.

**2.** Use the TestDino fixture in your tests:

```typescript
import { test, expect } from '@testdino/playwright';

test('my test', async ({ page }) => {
  await page.goto('/');
  // Coverage is collected automatically after each test
});
```

**3.** Enable coverage:

```bash
npx tdpw test --coverage
```

Coverage works with sharded execution. TestDino merges coverage data across shards automatically.

## How reporting works

The reporter hooks into Playwright's lifecycle, buffers test events, and streams them to TestDino in real time. Artifacts (screenshots, videos, traces) are uploaded to cloud storage and linked to the test that produced them. Local file paths are never transmitted.

Delivery degrades gracefully: if the streaming connection is unavailable, events fall back to an alternate transport automatically, and large batches are split and retried when the server rejects the body size. A TestDino outage affects reporting only — your suite exits on Playwright's own result.

**Two exceptions** surface as a banner and a non-zero exit so CI can catch them: events dropped after the reporter has exhausted its retries (partial-sync), and organization/project quota exhausted mid-run (data missing on TestDino). Both are business-visible signals rather than reporter-infra failures.

### Run link

Once a run is registered, the reporter prints a link to its live results page — before your tests finish, so you can watch a long CI suite as it runs. The same link appears in the end-of-run summary. A sharded run announces the link once, and each shard's summary links to that shard.

If the run can't be linked (offline, over quota, not yet recorded), the link is omitted; nothing fails and nothing is delayed.

### Update notifications

When a newer version is published, a short notice appears after your run with the current and latest versions, so every project stays on an up-to-date reporter.

## Troubleshooting

| Issue                                         | Solution                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Token is required but not provided`          | Set token via `--token`, `TESTDINO_TOKEN`, or config file                                      |
| `TestDino Execution Limit Reached`            | Tests still run; CI exit is non-zero. Upgrade plan or wait for quota reset                     |
| `Reporter dropped events — run marked FAILED` | Events couldn't be delivered after retries; CI exit is non-zero. Check TestDino service status |
| `--debug` didn't open the Inspector           | TestDino consumes `--debug`. Use `npx tdpw test -- --debug`                                    |
| Artifacts missing from the dashboard          | Confirm artifacts aren't disabled via `--no-artifacts`                                         |
| Shards appear as separate runs                | Pass the same `--ci-run-id` to every shard                                                     |

Enable debug logging for detailed diagnostics:

```bash
npx tdpw test --debug
```

## FAQ

**Q: Can I use TestDino with other Playwright reporters?**
Yes. TestDino works alongside HTML, JUnit, JSON, or any other reporter.

**Q: What happens if TestDino is unavailable?**
Tests run normally. Reporting degrades: the reporter falls back to an alternate transport and only surfaces a non-zero exit if events were actually dropped after retries or quota was exhausted (see "How reporting works").

**Q: Does this work with the Playwright VS Code extension?**
Yes. The reporter setup in Quick start applies to every Playwright invocation, including the extension.

## Upgrading from v1

Version 2 introduces an updated artifact upload flow.

Configuration options and CLI commands are unchanged, so no config migration is required. Upgrade all CI jobs using `@testdino/playwright` together, so artifact reporting stays consistent across your fleet.

See the [TestDino documentation](https://docs.testdino.com/) for release details.

## Security & compliance

ISO 27001 certified · SOC 2 · GDPR compliant.

Local file paths are never transmitted. Artifacts are uploaded to cloud storage and referenced by key. See [Security at TestDino](https://www.testdino.com/security) for details.

## Support

- [Documentation](https://docs.testdino.com/)
- [Getting Started](https://docs.testdino.com/getting-started)
- [Changelog](https://changelog.testdino.com/?type=cli)
- [Email Support](mailto:support@testdino.com)

---

Copyright 2026 TestDino. All rights reserved. See [LICENSE](./LICENSE).
