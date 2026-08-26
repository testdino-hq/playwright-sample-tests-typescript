# 🎭 TestDino Sample Test Suites

**1800 Playwright tests across 10 suites**, each producing a different kind of TestDino data — every result status, plus purpose-built data for Actions, load, attachments, split mode and orchestration.

Every suite is a separate spec file with its own workflow, triggered manually from the **Actions** tab or by curl.

---

## Contents

1. [Setup](#1-setup-once)
2. [The suites at a glance](#2-the-suites-at-a-glance)
3. [Each suite in detail](#3-each-suite-in-detail)
4. [Project structure](#4-project-structure)
5. [Running locally](#5-running-locally)
6. [Tags and annotations](#6-tags-and-annotations)
7. [How results reach TestDino](#7-how-results-reach-testdino)

---

## 1. Setup (once)

Add your TestDino token as a repo secret, or nothing reaches TestDino.

**Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `TESTDINO_TOKEN` | Your TestDino API token |

Everything else — Node, browsers, dependencies — is handled inside the workflows, which run in the official `mcr.microsoft.com/playwright:v1.60.0-noble` container so no browser download step is needed.

> `playwright.config.ts` pins `workers: 1` in CI, so each workflow passes `--workers` explicitly. Without that every suite would run single-threaded.

---

## 2. The suites at a glance

| # | Suite | Tests | Shards × Workers | Retries | Produces |
|---|---|---|---|---|---|
| 1 | [Passed](#1-passed) | 100 | 5 × 5 | — | 100% green run |
| 2 | [Failed](#2-failed) | 100 | 5 × 5 | 1 | 75 failed + 25 flaky |
| 3 | [Flaky](#3-flaky) | 100 | 5 × 5 | **1** | 100 flaky |
| 4 | [Skipped](#4-skipped) | 100 | 5 × 5 | — | 100 skipped |
| 5 | [Interrupted](#5-interrupted) | 100 | 5 × **20** | — | 100 interrupted |
| 6 | [Mixed](#6-mixed) | 100 | 5 × 5 | **1** | 25 / 25 / 25 / 25 |
| 7 | [Actions](#7-actions) | 60 | 3 × 5 | **0** | Skip / Quarantine / Tag only data |
| 8 | [Load Testing](#8-load-testing) | 1000 | **10 × 2** | 1 | Volume run, 70/15/10/5 |
| 9 | [Attachments](#9-attachments) | 40 | 4 × 2 | **0** | Traces, videos, screenshots, files |
| 10 | [Split Mode](#10-split-mode) | 100 | 7 jobs, 5 splits | 1 | One merged run + orchestration data |

All suites target `https://the-internet.herokuapp.com`, a public site built for automation practice — **except** Interrupted and Load Testing, which open no browser at all (explained in their sections).

---

## 3. Each suite in detail

Replace `YOUR_GITHUB_TOKEN` with a GitHub PAT in every curl below.

### 1. Passed

`tests/test_data/passed.spec.ts` — 100 real browser tests, all passing. Navigation, form fills, drag-and-drop, alerts, iframes, hovers, keyboard input, table sorting, file upload, mocked geolocation.

Verified end to end: **100/100 passing in 1.6 minutes** locally.

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/passed-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 100 passed, exit code 0.

---

### 2. Failed

`tests/test_data/faileds.spec.ts` — 100 tests designed to fail, spread across 4 distinct failure types so error grouping has genuinely different signatures to work with.

| Type | Tests | What it simulates |
|---|---|---|
| **UI Error** | 25 | Locator no longer matches — the markup changed under the test |
| **Actual Bug** | 25 | Element found correctly, but its value is genuinely wrong |
| **Miscellaneous** | 25 | Nothing to do with the UI — thrown errors, `TypeError`, bad domains, missing env vars |
| **Unstable Test** | 25 | Fails then passes on retry — reports as **flaky**, not failed |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/faileds-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 75 failed + 25 flaky. The workflow uses `continue-on-error: true`, or the failing shards would abort the job and the report would never upload.

---

### 3. Flaky

`tests/test_data/flaky.spec.ts` — 100 tests that fail on the first attempt and pass on retry. Each cause produces a **different error signature**, so they group meaningfully rather than collapsing into one bucket.

| Cause | Tests | Error signature |
|---|---|---|
| **Race Condition** | 25 | Locator `TimeoutError` — asserts a not-yet-rendered element |
| **Network Instability** | 25 | Navigation `TimeoutError` — 1ms `goto` deadline |
| **Async Data Sync** | 25 | Assertion diff — `expected 250, received 0` |
| **Environment Instability** | 25 | Named errors — `ECONNRESET`, `OutOfMemoryError`, `ENOSPC` |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/flaky-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 100 flaky, exit code 0 (every test ultimately passes).

> **`--retries=1` is required**, and is set in the workflow. Without it these report as **failed**, not flaky.
>
> Flakiness is keyed off `testInfo.retry`, not a module-level counter — Playwright discards a worker after a failure, so counter-based state resets and the test would fail forever.

---

### 4. Skipped

`tests/test_data/skipped.spec.ts` — 100 skipped tests using **four different skip mechanisms**, each carrying its own reason so the skipped view shows *why*.

| Category | Tests | Mechanism |
|---|---|---|
| **Feature Not Implemented** | 25 | `test.skip(title, details, body)` with a reason annotation |
| **Blocked by Known Bug** | 25 | `test.skip(true, reason)` citing a `STORE-####` ticket |
| **Environment Not Supported** | 25 | `test.skip(browserName !== 'webkit', …)` — conditional |
| **Quarantined or Deprecated** | 25 | `test.fixme(true, reason)` |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/skipped-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 100 skipped, exit code 0.

---

### 5. Interrupted

`tests/test_data/interrupted.spec.ts` — 100 long-running tests, all still executing when the run is aborted.

| Category | Tests |
|---|---|
| Long Running Migration | 25 |
| Bulk Data Processing | 25 |
| Extended Soak | 25 |
| External Dependency Wait | 25 |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/interrupted-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 100 interrupted. Each shard takes about 60 seconds.

> **`interrupted` cannot be set from inside a test** — there is no `test.interrupt()`. It is a *run-level* outcome: a test gets it only if the run is aborted while that test is mid-execution. The suite is tuned so every test in a shard is in flight at that moment:
>
> ```
> 100 tests ÷ 5 shards   = 20 per shard
> --workers=20           = all 20 start at once
> each test blocks 180s  = all still running at 60s
> --global-timeout=60000 = abort → all 20 interrupted
> ```
>
> Tests are **fixture-free** (no browser) so all 20 workers start instantly — a worker still booting when the timeout fires would report as never-run instead.

---

### 6. Mixed

`tests/test_data/mixed.spec.ts` — four outcomes in a single run, the closest thing to a realistic day-to-day CI report.

| Outcome | Tests | Breakdown |
|---|---|---|
| ✅ Passed | 25 | Real UI flows, reused from the verified Passed suite |
| ❌ Failed | 25 | 8 UI errors + 9 real bugs + 8 miscellaneous |
| 🔄 Flaky | 25 | 7 race + 6 network + 6 data sync + 6 environment |
| ⏭️ Skipped | 25 | 7 not implemented + 6 known bugs + 6 env-gated + 6 quarantined |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/mixed-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 25 passed, 25 failed, 25 flaky, 25 skipped.

> `interrupted` is deliberately **not** in this mix — producing it means aborting the run, which would cut the other 75 tests short and destroy their results. That is why it has its own suite.

---

### 7. Actions

`tests/test_data/action.spec.ts` — 60 tests for the **Create Actions** feature, with titles designed to be matched by a rule.

| Mode | Tests | Baseline (no action) | What the action should change |
|---|---|---|---|
| **Skip** — not run at all | 20 | 20 failed | All 20 disappear from the run |
| **Quarantine** — runs, failure won't break build | 20 | **15 failed + 5 passed** | Failures stop breaking the build |
| **Tag only** — runs, labels added | 20 | **15 failed + 5 passed** | Results gain labels; failures **still** break the build |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/action-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Matching rules** — one condition selects each group:

| Action | Condition | Or match on tag |
|---|---|---|
| Skip | `Title` `contains` `[Skip]` | `@action-skip` |
| Quarantine | `Title` `contains` `[Quarantine]` | `@action-quarantine` |
| Tag only | `Title` `contains` `[Tag Only]` | `@action-tag-only` |

**Suggested flow:** run once with no actions → baseline **50 failed, 10 passed**. Create the three rules. Run again and compare. The Quarantine and Tag only groups mix passing *and* failing tests so you can confirm the action applies to both.

---

### 8. Load Testing

`tests/test_data/load-testing.spec.ts` — 1000 tests (20 modules × 50 scenarios) for exercising ingestion, merging and dashboard rendering at volume.

| Outcome | Tests | Share |
|---|---|---|
| Passed | 700 | 70% |
| Failed | 150 | 15% |
| Flaky | 100 | 10% |
| Skipped | 50 | 5% |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/load-testing.yml/dispatches \
  -d '{"ref":"main"}'
```

Every test carries a stable ID for tracking across runs:

```
[LOAD-0001] Authentication - renders the primary view
[LOAD-1000] Localization - rolls back after a failed action
```

Outcomes are assigned by test index, so **every run produces the identical mix** — the load is reproducible.

> **These tests open no browser.** Pointing 1000 tests at a free public demo site would trigger rate limiting, and the resulting 503s would corrupt the intended mix. Each test still does a small deterministic computation. The goal is volume through TestDino, not load on a website.

---

### 9. Attachments

`tests/test_data/attachments.spec.ts` — 40 tests producing rich debug evidence for the trace viewer and screenshot views.

| Group | Tests | Produces |
|---|---|---|
| **Passing Journeys** | 10 | Multi-step happy paths — what a healthy trace looks like |
| **Failing Journeys** | 10 | Long sequences that fail at the **final** step |
| **File Artifacts** | 10 | 5 real downloads + 5 uploads (1KB → 1MB) |
| **Diagnostic Payloads** | 10 | HTML, screenshots, page metrics, API bodies, console/network trails |

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/attachments-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

**Expected:** 30 passed, 10 failed — with a trace, video and screenshots on **every** test.

Two things make this suite work:

- **Artifacts are forced on.** The repo config only keeps them on failure, so passing tests would produce nothing. This file overrides it: `test.use({ trace: 'on', video: 'on', screenshot: 'on' })`.
- **Failures happen last.** A test that fails on line one gives an empty trace and a screenshot of a blank page. Every failing test here runs its full sequence and attaches diagnostics *before* the failing assertion.

Contains **49 `test.step()` calls** (so traces have a readable step breakdown) and **22 `testInfo.attach()` calls** across PNG, JSON, HTML, text and real files. The workflow uploads raw `test-results/` separately (7-day retention) and passes `--upload-traces`.

---

### 10. Split Mode

`tests/test_data/feature.spec.ts` — 100 tests across **5 splits, run by 7 CI jobs**, merged into one logical run.

```sh
curl -X POST -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/testdino-hq/playwright-sample-tests-typescript/actions/workflows/feature-split-tests.yml/dispatches \
  -d '{"ref":"main"}'
```

| Split | Tests | Selected by | Jobs |
|---|---|---|---|
| **1/5** API Contract | 20 | `--grep @split-api` — no browser | 1 |
| **2/5** UI Smoke | 20 | `--grep @split-smoke` | 2 (sharded) |
| **3/5** UI Regression | 15 | `--grep @split-regression` | 1 |
| **4/5** Slow Isolated | 5 | `--grep @split-slow` | 1 |
| **5/5** Orchestration Mixed | 40 | `--grep @split-orchestration` | 2 (sharded) |

**Split mode is not sharding:**

| | Sharding | Split mode |
|---|---|---|
| Jobs run | the same command, only `--shard` differs | **different** commands |
| Selection | Playwright partitions automatically | **you** assign |
| The flag | selects the tests | **only labels** the results |

`--split` does not choose which tests run — it labels this job's results so TestDino can merge them. Assignment is yours, via `--project`, `--grep` or spec paths. The two mechanisms **compose**: splits 2 and 5 are each additionally sharded across two jobs.

| Flag | Purpose | Env var |
|---|---|---|
| `--split <current/total>` | This job's position | none — CLI only |
| `--split-id <id>` | Shared group ID across all jobs | `TESTDINO_SPLIT_ID` |
| `--tags <csv>` | Run labels | — |

**Split 5 is the orchestration data** — mixed outcomes (24 passed / 8 failed / 5 flaky / 3 skipped) spread deliberately across **fast (0s), medium (1.5s) and slow (5s)** durations, so load balancing across CI machines has a real spread to optimise. Each test carries a `testdino:metric` annotation with its speed profile.

Two settings that matter, both already in the workflow:

```yaml
strategy:
  fail-fast: false     # a cancelled sibling leaves the split group incomplete
env:
  TESTDINO_SPLIT_ID: "gh-${{ github.run_id }}-${{ github.run_attempt }}"
```

`run_attempt` must be in the split ID — without it, **re-running merges into the original run** instead of creating a new one.

---

## 4. Project structure

```
tests/test_data/
├── passed.spec.ts         100 tests — all pass
├── faileds.spec.ts        100 tests — 4 failure types
├── flaky.spec.ts          100 tests — 4 flakiness causes
├── skipped.spec.ts        100 tests — 4 skip mechanisms
├── interrupted.spec.ts    100 tests — run aborted mid-flight
├── mixed.spec.ts          100 tests — 25/25/25/25
├── action.spec.ts          60 tests — Skip / Quarantine / Tag only
├── load-testing.spec.ts  1000 tests — volume run
├── attachments.spec.ts     40 tests — traces, videos, files
├── feature.spec.ts        100 tests — 5 splits + orchestration
└── README.md              this file

.github/workflows/
├── passed-tests.yml          5 shards
├── faileds-tests.yml         5 shards, continue-on-error
├── flaky-tests.yml           5 shards, --retries=1
├── skipped-tests.yml         5 shards
├── interrupted-tests.yml     5 shards × 20 workers, --global-timeout
├── mixed-tests.yml           5 shards, --retries=1
├── action-tests.yml          3 shards, --retries=0
├── load-testing.yml         10 shards × 2 workers
├── attachments-tests.yml     4 shards × 2 workers, --upload-traces
└── feature-split-tests.yml   7 jobs across 5 splits
```

---

## 5. Running locally

```sh
npm ci
npx playwright install --with-deps chromium
```

```sh
# straightforward
npx playwright test tests/test_data/passed.spec.ts --project=chromium

# needs retries, or the flaky tests report as failed
npx playwright test tests/test_data/flaky.spec.ts --project=chromium --retries=1

# needs a browser-free, high-worker setup
npx playwright test tests/test_data/interrupted.spec.ts --project=chromium --workers=100 --global-timeout=60000

# split mode — one split at a time
npx playwright test tests/test_data/feature.spec.ts --grep "@split-api"
npx playwright test tests/test_data/feature.spec.ts --grep "@split-orchestration"

npx playwright show-report
npx playwright show-trace test-results/<folder>/trace.zip
```

Append `--list` to any command to enumerate the tests without running them.

---

## 6. Tags and annotations

**Tags are applied at two levels.**

```js
test.describe('Race Condition', { tag: ['@chromium', '@firefox', '@flaky', '@race-condition'] }, () => {
  test('…', { tag: ['@high', '@auth'] }, async ({ page }) => { … });
});
```

| Level | Positions | Examples |
|---|---|---|
| **Suite** (`describe`) | browser · secondary browser · scenario · feature area | `@chromium`, `@webkit`, `@flaky`, `@race-condition` |
| **Test** | priority · domain | `@critical`/`@high`/`@medium`/`@low`, `@auth`, `@checkout`, `@forms`, `@data-table`, `@network` |

```sh
npx playwright test --project=chromium --grep "@critical"
npx playwright test --project=chromium --grep-invert "@low"
```

**Annotations** are declared once on the `describe` and inherited by every test inside it — `testdino:owner`, `testdino:feature`, `testdino:link`, `testdino:context`. Test-specific ones are added only where they apply:

| Annotation | Applied to |
|---|---|
| `testdino:flaky-reason` | every flaky test — its specific cause |
| `issue` | known-bug and stale-locator failures — a Jira URL |
| `testdino:metric` | load and orchestration suites — JSON payload |
| `testdino:context` | per-test skip reasons |

Owners are assigned by feature area: `identity-squad`, `checkout-squad`, `catalog-squad`, `data-platform`, `qa-platform`, `qa-team`.

> **How tags behave in this repo**
> `playwright.config.ts` defines a single `chromium` project with **no `grep` filter**, so every test runs regardless of its tags — tags are pure metadata here, used for filtering on demand with `--grep` and for grouping in TestDino.
>
> This is why the split mode suite selects its API group with `--grep "@split-api"` rather than `--project=api`. If you later add tag-filtered projects to the config (`grep: /@chromium/` and friends), revisit that: tests would then only run when a tag matches their project.

---

## 7. How results reach TestDino

```
Each shard
──────────
npx playwright test --reporter=blob
    │
    └── blob report uploaded as an artifact

After all shards finish
───────────────────────
playwright merge-reports  →  one HTML report
    │
    └── npx tdpw ./playwright-report --token=$TESTDINO_TOKEN --upload-html [--upload-traces]
```

Merge jobs use `if: always()` so a report is produced even when shards fail — which most of these suites do by design.
