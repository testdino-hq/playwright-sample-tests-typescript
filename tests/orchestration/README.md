# Orchestration tests

Verification layer for the orchestration feature. Companion to
[`orchastrastion_test_stretergy.md`](../../orchastrastion_test_stretergy.md) — every test
title carries its AC id, so a red test points straight at a row in §4 of that document.

This directory holds the **assertions**. The **corpus** those assertions are about —
500 tests that orchestration actually distributes — lives in
[`tests/test_data/orchastration/`](../test_data/orchastration/).

## Layout

```
support/orchestration.ts     list runner, unit transform, fingerprint, P1/P2 oracle, env gating
fixtures/                    known-answer suite: 3 files x 2 projects. LISTED, NEVER EXECUTED.
discover-contract.spec.ts    L0  AC-D1 … AC-D9   ✅ runs today
mint-api.spec.ts             L2  AC-M1 … AC-M10  ⏭  skips (see below)
ws-push.spec.ts              L3  AC-W1 … AC-W8   ⏭  skips (see below)
../../scripts/verify-orchestration.mjs           the P1/P2/P3 oracle as a CI gate
```

The fixtures use their own config, [`playwright.orchestration.config.ts`](../../playwright.orchestration.config.ts),
which declares chromium **and** firefox so the hand-computed 3 × 2 = 6 holds. The main
config carries a matching `testIgnore`, so a normal run never executes them.

## Run

```bash
# L0 — needs nothing but Playwright. No server, no CLI build, no feature flags.
npx playwright test tests/orchestration/discover-contract.spec.ts

# everything, including the levels that skip
npx playwright test tests/orchestration
```

## The known answers

Hand-computed against the fixture suite, default `TD_ORCH_FIXTURE_CASES=1`:

| Command | Tests | Units |
| --- | --- | --- |
| no filter | 6 | 6 |
| `--grep @smoke` | 2 | 2 |
| `--project chromium` | 3 | 3 |
| both | 1 | 1 |

`TD_ORCH_FIXTURE_CASES=3` changes tests to 10 but must leave `suiteFingerprint`
**unchanged** — the file set is identical. That is AC-D7, the `test.each` guard.

## What skips, and why

Preconditions skip; they never fail. A suite that is red for environmental reasons
trains people to ignore red.

| Level | Skips when | Current status |
| --- | --- | --- |
| L0 | never | ✅ 9/9 pass |
| L2 | no `TESTDINO_SERVER_URL`, no `td_api_` key, or the dispatcher rejects/404s the probe | ⏭ **dispatcher rejects a valid `td_api_` key** |
| L3 | same as L2, or no global `WebSocket` (needs Node 22+), or no live orchestration id | ⏭ blocked behind L2 |

L2 runs **one probe** in `beforeAll` and gates the whole level on it. Without that,
every test would report its own identical auth failure and drown the real signal.

### The current blocker

`orchestrate discover` reaches the server and is refused:

```
✖ Discovery mint failed: Authentication required.
```

Ruled out: the token **is** a `td_api_` pipeline key (the type AC-M6 requires), and
`https://stg-reporter.testdino.com` is reachable. That leaves the server side — the
three flags the strategy doc says default to `false`:

```
ORCHESTRATE_PUSH_ENABLED            (dispatcher)
ORCHESTRATION_CONTROL_ENABLED       (data-handler)
KAFKA_ORCHESTRATION_CONTROL_ENABLED (ingestion)
```

All three must be on and pointing at the same Kafka topic. Until then L2/L3 skip.

## Verifying a real orchestrated run

The P1/P2/P3 comparison must be programmatic — eyeballing two lists of 500 items finds
nothing. After an orchestrated run, collect each machine's Playwright JSON report and:

```bash
node scripts/verify-orchestration.mjs master.json m1/report.json m2/report.json
```

```
P1 no loss          : PASS     every discovered unit ran
P2 no duplication   : PASS     no unit ran on two machines
P3 correct total    : PASS     tests run == discovery's totalTests
RESULT: PASS
```

Exits non-zero on any violation, so CI can gate on it. Note P1 and P2 are checked
separately on purpose: one lost file plus one duplicated file leaves the **total**
correct, so P3 alone would pass while the run is silently wrong.

## Not automated

These need a full stack, a second tenant, or a deliberate crash, and are documented
rather than coded (marked `fixme` where a placeholder exists):

- **AC-R3** — kill a machine mid-batch; the run must finalize `incomplete`, **never
  `passed`**. The single most important check in the whole plan. The corpus's slow-fail
  (2s) and slow-pass (2.5s) tests exist to give you a window to kill it in.
- **AC-R5** — start a run, never report; the zombie sweep must finalize it `incomplete`
  after the ~10-minute grace.
- **AC-M7 / AC-M8 / AC-W8** — need a second project, a softlocked tenant, and a duplicate
  `machineId` respectively.
- **L5 scheduling** — measure, don't gate. Needs 3–4 seeded runs first, or there is no
  p95 history to sort by and ordering correctly degrades to FIFO (AC-R8).

## A note on stdout

`orchestrate discover` parses `playwright test --list --reporter=json`. **Anything a
config or spec prints to stdout corrupts that JSON.** This is not hypothetical — dotenv
v17's "injected env" notice broke discovery until both call sites passed `quiet: true`
(`playwright.config.ts`, `tests/ecommerce.spec.ts`). `--list` loads every spec file, so
even a spec excluded by `--grep` can poison the payload.
