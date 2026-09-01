# Orchestration — Test Strategy & Acceptance Criteria

> Companion to [orchestration.md](./orchestration.md) (what the feature *is*).
> This file is the **test plan**: what we test, in what order, and exactly what "pass" means.
>
> Status of the world when this was written (2026-08-31):
> - The installed CLI `@testdino/playwright@2.4.0` has **only** `tdpw test`. There is **no
>   `tdpw orchestrate` command yet** — Phase-2 discover is an unmerged PR. So every CLI-level
>   test below is written now and **stays skipped** until the build lands.
> - The dispatcher lives behind feature flags that **default to `false`**. Nothing orchestrates
>   until they're on.
> - Node here is v24 → global `WebSocket` exists, so the push channel is testable from a spec
>   with no extra dependency.

---

## 1. What we are testing

One sentence: **N machines pull from one server-owned queue and produce exactly one run, with every test executed exactly once.**

Everything below is an expansion of that sentence. The three properties we are really defending:

| # | Property | Why it matters | If it breaks |
| --- | --- | --- | --- |
| **P1** | **No loss** — every discovered test runs | The old pull MVP silently dropped tests | Green run that didn't test anything |
| **P2** | **No duplication** — no test runs on two machines | Doubles cost, corrupts flake stats | Wrong metrics, wasted CI minutes |
| **P3** | **One unified run** — N machines, 1 run row, correct total | Otherwise the UI is useless | 5 partial runs the user must mentally merge |

**Everything else (speed, LPT ordering, machine attribution) is secondary.** A slow correct run
ships. A fast run that loses tests does not.

### Explicitly OUT of scope — do not raise bugs for these

Designed but **not built**: failed-first ordering · tag/context ordering · user-intent priority ·
machine-aware scheduling · warm workers / zero re-setup · per-lease reclaim by age ·
per-test dispatch. Also out: the retired **pull** endpoints (`/runs/{id}/pull|ack|release`) — if
they still respond, that's a cleanup ticket, not a test target.

---

## 2. Test levels (build the pyramid in this order)

Each level is independently runnable and gates on different things. Run L0 → L4.

| Level | Name | What it proves | Needs | Runnable today? |
| --- | --- | --- | --- | --- |
| **L0** | **Discover contract (local)** | The master-list shape is right, filters work, the fingerprint is stable | Nothing — just Playwright | ✅ **Yes** |
| **L1** | **CLI discover** | The real `tdpw orchestrate discover` produces L0's shape | the CLI build | ❌ skipped until build |
| **L2** | **Mint API contract** | discover POST: id, idempotency, 409/422/404, auth | server URL + `td_api_` token + flags on | ❌ skipped until env |
| **L3** | **WebSocket push** | assign/ack/end, no loss, no duplication | same as L2 | ❌ skipped until env |
| **L4** | **Completion & resilience** | drain, crash → `incomplete`, dispatcher down → local fallback | full stack incl. Kafka + ingestion | ❌ skipped until env |

**Skip, never fail, on a missing precondition.** A test that can't run yet must report
`skipped` with a reason — not red. A red suite that's red for environmental reasons trains people
to ignore red.

---

## 3. The fixture suite (our known-answer test)

We cannot assert "the queue is correct" against a 500-test suite nobody can count. So L0/L1 run
against a **tiny fixture suite with hand-computed expected numbers**, mirroring the numbers the
feature spec itself quotes.

```
tests/orchestration/fixtures/
  checkout.fixture.spec.ts   describe "Checkout" → 1 test, tagged @smoke
  login.fixture.spec.ts                          → 1 test, no tag
  search.fixture.spec.ts                         → N tests (N = TD_ORCH_FIXTURE_CASES, default 1)

projects: chromium + firefox
```

**Hand-computed expectations (default N=1):**

| Command | Tests | Units `(file, project)` |
| --- | --- | --- |
| no filter | **6** (3 tests × 2 projects) | **6** |
| `--grep @smoke` | **2** | **2** |
| `--project chromium` | **3** | **3** |
| `--grep @smoke --project chromium` | **1** | **1** |

Those 6→2 and 6→3 numbers are the exact ones the spec claims it verified. If our fixture
reproduces them, the transform is behaving.

Fixtures are **listed, never executed** — they're excluded from the normal suite run.

---

## 4. Acceptance criteria

Format: **ID · What you do · What you expect.** Every row maps to one test case.
"Expect" is the *oracle* — the thing that decides pass/fail. No row says "looks correct".

### L0 — Discover contract (local, runnable now)

Input: `playwright test --list --reporter=json` over the fixture suite, transformed into the
§7.1 master list.

| ID | What you do | What you expect |
| --- | --- | --- |
| **AC-D1** | List the fixture suite with no filter | `totalTests === 6`; `units.length === 6` |
| **AC-D2** | Inspect `units[]` | Flat array — **no nesting**. Each unit has exactly `{file, project, tags, tests[]}`. Every `(file, project)` pair is **unique** (no duplicate unit) |
| **AC-D3** | Inspect any test's `tags` | Tags are **un-prefixed**: `["smoke"]`, **not** `["@smoke"]`. (A test asserting `@smoke` will pass today and break later — assert the un-prefixed form) |
| **AC-D4** | Inspect a test inside a `describe` block | `titlePath[0]` is the **project name**, the last element is the **test title**, and the describe title appears in between |
| **AC-D5** | Check the payload keys | `spec.id` (Playwright's own hash) is **absent** from the wire payload — it isn't stable across CI machines and must not be sent |
| **AC-D6** | List with `--grep @smoke`, then `--project chromium` | `2` units and `3` units respectively. Filters must reach the list |
| **AC-D7** | List twice: `TD_ORCH_FIXTURE_CASES=1` then `=3` | `suiteFingerprint` is **identical** both times (the file set didn't change) while `totalTests` differs (6 vs 10). This is the `test.each` guard |
| **AC-D8** | List, then reorder the files on disk / re-list | `suiteFingerprint` unchanged — it hashes the **sorted** `(file\|project)` keys |
| **AC-D9** | List a suite where a spec file has a syntax error | The `errors[]` array is non-empty and discovery **fails loudly**. A master list built from a broken suite must never be silently short |

### L1 — CLI discover (skipped until the build lands)

| ID | What you do | What you expect |
| --- | --- | --- |
| **AC-C1** | `tdpw orchestrate discover` on the fixture suite | Exit code 0. **Zero tests execute** (no browser launches, no results reported) |
| **AC-C2** | Add `--out master.json` | The file is written and is **valid JSON** satisfying every L0 criterion above |
| **AC-C3** | Run without `--out` | Human summary on stdout. Machine output is the **file only** — stdout carries the CLI banner, so stdout is *not* clean JSON by design |
| **AC-C4** | Run with `--grep @smoke` / `--project chromium` | Same 2 / 3 counts as AC-D6 |
| **AC-C5** | Run with no `--orchestration-id` and no env var | An `orch-<uuid>` is generated locally; supplying `TESTDINO_ORCHESTRATION_ID` uses that instead |
| **AC-C6** | Run against an unreachable dispatcher | Does **not** hang or hard-fail CI — see AC-R4 |

### L2 — Mint API: `POST /api/v1/orchestrate/discover`

Auth for every call: the `td_api_` pipeline key. `projectId` is **never** taken from the body.

| ID | What you do | What you expect |
| --- | --- | --- |
| **AC-M1** | POST a valid master list | `200`, body has a **server-minted** `orchestrationId` starting `orch_`, echoes `machines`/`workers`/`fullyParallel`/`specCount`, and `created: true` |
| **AC-M2** | POST the **exact same** body again | Same `orchestrationId`, `created: **false**`. **No second run group.** (Idempotent on `projectId` + `suiteFingerprint`) |
| **AC-M3** | POST same `suiteFingerprint`, different `machines` (or `workers`/`fullyParallel`) | **409**. Two disagreeing discoveries is a contract violation — must **not** be silently reconciled |
| **AC-M4** | POST `specs: []` | **422** |
| **AC-M5** | POST a spec list over the cap | **422** (not a 500, not a truncated success) |
| **AC-M6** | POST with a **cookie/JWT** instead of a `td_api_` key | Rejected. Orchestrate is API-key-only — a session that can read the dashboard must not mint runs |
| **AC-M7** | POST a `projectId` in the body that isn't the token's project | The body value is **ignored**; the run binds to the token's project |
| **AC-M8** | POST as a **softlocked (paused)** tenant | **404** — and the response body is **byte-identical** to AC-M9's |
| **AC-M9** | GET/POST against a made-up `orch_` id, and against **another tenant's real** id | Both **404 `RUN_NOT_FOUND`**, identical bodies. An attacker must not be able to distinguish "doesn't exist" from "not yours" |
| **AC-M10** | Retry the POST after a simulated network drop mid-request | Same id returned (AC-M2 path). One CI blip must never fork the run |

### L3 — WebSocket push: `GET /ws/orchestrate/{id}?machineId=…`

| ID | What you do | What you expect |
| --- | --- | --- |
| **AC-W1** | Connect with a valid `td_api_` key + `machineId` | Handshake upgrades; the machine is registered |
| **AC-W2** | Connect with a cookie/JWT | Rejected **before** the upgrade — never an upgraded-then-closed socket |
| **AC-W3** | Connect with a foreign / unknown / softlocked `orchestrationId` | Same `404 RUN_NOT_FOUND` cloak as AC-M9. No leak via the WS path |
| **AC-W4** | Connect 2 machines and let the run drain | Each receives ≥1 `assign` frame; each `assign` payload is a list of **spec files**, never individual tests |
| **AC-W5** | Union all `assign` payloads across both machines | Equals the discovery unit set **exactly** — no missing unit (**P1**), no unit in both machines' assigns (**P2**) |
| **AC-W6** | Ack every batch until the queue empties | **Both** machines receive exactly **one** `end` frame — broadcast, not per-machine drain |
| **AC-W7** | Connect a 3rd machine after the queue is already empty | It gets `end` promptly; it must not hang waiting for work that will never come |
| **AC-W8** | Connect with a `machineId` already in use | Defined, documented behaviour (reject or replace) — **not** two sockets silently sharing an identity, which would corrupt attribution |

### L4 — Completion, attribution & resilience

| ID | What you do | What you expect |
| --- | --- | --- |
| **AC-R1** | Complete a 2-machine orchestrated run, open TestDino | **ONE** run, not two. Its total equals **discovery's** `totalTests` — not any single machine's slice |
| **AC-R2** | Open a test's detail | It shows **which machine** ran it. Every test is attributed to exactly one machine |
| **AC-R3** | Kill a machine mid-batch | Its files land in `could_not_execute_specs` and the run finalizes **`incomplete`** — **never `passed`**. This is the false-green guard and is the single most important test in this document |
| **AC-R4** | Point the CLI at an unreachable dispatcher | Falls back to a **normal local run** (`tdpw test`) and CI still gets results. We must never be the reason a pipeline is blocked |
| **AC-R5** | Start a run, then never report | After the ~10-minute grace the **zombie sweep** finalizes it `incomplete` and emits `run.processed`. It does not sit `NULL` forever |
| **AC-R6** | Fire the control message before the run row exists | Verdict is **parked** in `pending_orchestration_verdicts`, not dropped; it's claimed at that run's `run:begin` |
| **AC-R7** | Turn the feature flags **off** | Everything behaves exactly as before — no orchestration side-effects on normal runs. (Flag-off is a test case, not an assumption) |
| **AC-R8** | Run a **brand-new** suite with no history | Run succeeds; ordering degrades to FIFO because there's no p95 to sort by. **This is correct behaviour, not a bug** |

### L5 — Scheduling quality (measure, don't gate)

LPT is a performance optimisation, so these are **observations with a number attached**, not
red/green gates. Record them; don't block a release on them.

| ID | What you do | What you expect |
| --- | --- | --- |
| **AC-S1** | Suite with one very slow file + many fast ones, with history present | The slow file is assigned in an **early** batch, not last |
| **AC-S2** | Same suite, sharded vs orchestrated, N machines | Orchestrated wall-clock ≤ sharded. Record both numbers |
| **AC-S3** | Machine idle time across the run | No machine idles while the queue is non-empty |

---

## 5. How we decide pass/fail (the oracles)

Vague oracles are how orchestration bugs survive. These are the three that matter:

**No-loss / no-duplication (P1 + P2)** — pure set arithmetic, no judgement:
```
discovered = set of (file, project) from master.json
assigned   = multiset of (file, project) across every assign frame, all machines

P1  assigned (as a set) == discovered        →  nothing lost
P2  every count in `assigned` == 1           →  nothing duplicated
```
Do this comparison **programmatically**. Eyeballing two lists of 500 items finds nothing.

**One unified run (P3)** — the run count is 1 and `run.totalTests === master.totalTests`.
Comparing against a machine's own reporter total is the classic wrong assertion: each reporter
only ever sees its own slice.

**The false-green guard (AC-R3)** — the assertion is on the **status**, not on the test results:
a run missing any executed spec must be `incomplete`. `passed` with a short total is the worst
possible outcome and the thing this whole plan exists to catch.

---

## 6. Test data & environment

| Variable | Purpose | Test behaviour if unset |
| --- | --- | --- |
| `TESTDINO_SERVER_URL` | Dispatcher base URL | L2–L4 **skip** |
| `TESTDINO_TOKEN` | `td_api_` pipeline key | L2–L4 **skip** |
| `TD_ORCH_MACHINES` | How many simulated machines (default 2) | default |
| `TD_ORCH_FIXTURE_CASES` | Test count in the variable fixture file (default 1) | default |

Server-side flags that must be **on**, all three pointing at the same Kafka topic:
`ORCHESTRATE_PUSH_ENABLED`, `ORCHESTRATION_CONTROL_ENABLED` (data-handler),
`KAFKA_ORCHESTRATION_CONTROL_ENABLED` (ingestion).

**Simulated machines.** L3 does not need real CI runners. A "machine" is just a WebSocket
connection with its own `machineId` — N sockets from one spec file reproduces the contention
that matters (concurrent assign/ack against one queue) without any CI matrix.

---

## 7. Risks & known gaps — state these up front

| Risk | Impact | Mitigation |
| --- | --- | --- |
| CLI `orchestrate` not shipped | L1 unverifiable | L0 tests the same contract locally, so the shape is pinned before the CLI arrives |
| No live dispatcher available yet | L2–L4 unverifiable | Written now, env-gated; they run the day the env exists — zero rewrite |
| LPT needs run history | AC-S1 meaningless on a fresh project | Seed history first, or accept "FIFO, still correct" (AC-R8) |
| Docs still describe the dead **pull** model | Testing endpoints that were removed | Only `POST /orchestrate/discover` + `GET /ws/orchestrate/{id}` are live. Anything `/runs/{id}/pull` is out of scope |
| Timing-dependent WS assertions | Flaky tests | Assert on **frames received**, never on wall-clock sleeps |
| 2 machines may not expose races | Real bugs slip through | Once L3 is green, re-run with `TD_ORCH_MACHINES=8` |

---

## 8. Exit criteria — when is this feature "tested"?

**Must pass before it ships:**
- All of **L0** green.
- **AC-M1–M4, M8, M9** green (mint contract + the 404 cloak).
- **AC-W5** green (no loss, no duplication) — the core correctness claim.
- **AC-R1, R3, R4, R7** green — one unified run, false-green guard, CI-safe fallback, flag-off safety.

**Should pass:** the rest of L2/L3/L4.
**Record, don't gate:** all of L5.

**Any AC-R3 failure is a release blocker.** A run that loses tests and still reports green is
worse than no orchestration at all.

---

## 9. File map (what gets built next)

```
orchestration.md                          the feature, explained
orchestration_test_strategy.md            ← you are here
tests/orchestration/
  README.md                               how to run, what skips and why
  support/orchestration.ts                helpers: list runner, unit transform,
                                          fingerprint, WS client, env gating
  fixtures/                               the known-answer suite (listed, never run)
  discover-contract.spec.ts               L0  AC-D1 … AC-D9
  cli-discover.spec.ts                    L1  AC-C1 … AC-C6      (skipped)
  mint-api.spec.ts                        L2  AC-M1 … AC-M10     (skipped)
  ws-push.spec.ts                         L3  AC-W1 … AC-W8      (skipped)
  completion.spec.ts                      L4  AC-R1 … AC-R8      (skipped)
```

Each spec file carries the AC id in its test title (e.g.
`test('AC-D6: --grep @smoke narrows 6 units to 2', …)`) so a failing run points straight back
at a row in §4 — no translation step between a red test and the criterion it broke.
