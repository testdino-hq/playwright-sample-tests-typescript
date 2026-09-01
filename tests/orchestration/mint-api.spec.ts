import { expect, test, type APIRequestContext } from '@playwright/test';
import { serverEnv, suiteFingerprint } from './support/orchestration.js';

/**
 * L2 -- the mint API contract: POST /api/v1/orchestrate/discover
 *
 * PRECONDITIONS. These skip rather than fail when the dispatcher is not
 * available: a suite that is red for environmental reasons trains people to
 * ignore red. The probe below distinguishes "no env" from "flags off" and
 * reports the reason, so a skip is never mysterious.
 *
 * CAVEAT: the request payload shape below follows the strategy doc, not a
 * captured live request -- it has never been exercised against a running
 * dispatcher. Expect to adjust field names the first time these actually run.
 */

const ENDPOINT = '/api/v1/orchestrate/discover';

function specsFixture(n = 3) {
  return Array.from({ length: n }, (_, i) => ({
    file: `tests/orchestration/fixtures/unit-${i}.spec.ts`,
    project: 'chromium',
    tags: [],
    tests: [{ title: `case ${i}`, titlePath: ['chromium', `case ${i}`], tags: [] }],
  }));
}

function payload(over: Record<string, unknown> = {}) {
  const specs = (over.specs as unknown[]) ?? specsFixture();
  return {
    specs,
    machines: 2,
    workers: 2,
    fullyParallel: true,
    totalTests: specs.length,
    suiteFingerprint: suiteFingerprint(specs as Array<{ file: string; project: string }>),
    ...over,
  };
}

const env = serverEnv();
let skipReason = env.ready ? '' : env.reason;

async function post(request: APIRequestContext, body: unknown, token = env.token) {
  return request.post(`${env.url}${ENDPOINT}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
    failOnStatusCode: false,
  });
}

test.describe('Mint API contract (L2)', {
  tag: ['@orchestration', '@contract', '@L2'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Orchestration mint API' },
    { type: 'testdino:context', description: 'Env-gated. Needs TESTDINO_SERVER_URL, a td_api_ key, and the orchestration feature flags enabled server-side.' },
  ],
}, () => {
  test.describe.configure({ timeout: 60 * 1000 });

  // One probe decides the whole level. Without it every test would report its
  // own identical auth failure and drown the real signal.
  test.beforeAll(async ({ request }) => {
    if (!env.ready) return;
    try {
      const res = await post(request, payload());
      if (res.status() === 401 || res.status() === 403) {
        skipReason = `dispatcher rejected a valid td_api_ key (${res.status()}) - orchestration feature flags are likely off server-side`;
      } else if (res.status() === 404) {
        skipReason = 'dispatcher returned 404 for the discover endpoint - not deployed or flags off';
      }
    } catch (err) {
      skipReason = `dispatcher unreachable: ${(err as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(!!skipReason, skipReason);
  });

  test('AC-M1: a valid master list mints a server-owned orchestrationId', async ({ request }) => {
    const res = await post(request, payload());
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.orchestrationId, 'server-minted id').toMatch(/^orch_/);
    expect(body.created).toBe(true);
    expect(body.machines).toBe(2);
    expect(body.workers).toBe(2);
    expect(body.fullyParallel).toBe(true);
    expect(body.specCount).toBe(3);
  });

  test('AC-M2: posting the identical body is idempotent', async ({ request }) => {
    const body = payload();
    const first = await (await post(request, body)).json();
    const second = await (await post(request, body)).json();
    expect(second.orchestrationId, 'same id -- one CI blip must not fork the run').toBe(first.orchestrationId);
    expect(second.created, 'no second run group').toBe(false);
  });

  test('AC-M3: same fingerprint with different machines is a 409', async ({ request }) => {
    const body = payload();
    await post(request, body);
    const res = await post(request, { ...body, machines: 5 });
    // Two disagreeing discoveries must not be silently reconciled.
    expect(res.status()).toBe(409);
  });

  test('AC-M4: an empty spec list is a 422', async ({ request }) => {
    const res = await post(request, payload({ specs: [] }));
    expect(res.status()).toBe(422);
  });

  test('AC-M5: a spec list over the cap is a 422, not a 500 or a truncated success', async ({ request }) => {
    const res = await post(request, payload({ specs: specsFixture(100_000) }));
    expect(res.status()).toBe(422);
  });

  test('AC-M6: orchestrate is API-key-only -- a session cookie is rejected', async ({ request }) => {
    const res = await request.post(`${env.url}${ENDPOINT}`, {
      headers: { Cookie: 'session=not-a-pipeline-key', 'Content-Type': 'application/json' },
      data: payload(),
      failOnStatusCode: false,
    });
    // A session that can read the dashboard must not be able to mint runs.
    expect([401, 403, 404]).toContain(res.status());
  });

  test('AC-M9: unknown and foreign ids are an identical 404 cloak', async ({ request }) => {
    const madeUp = await request.get(`${env.url}/api/v1/orchestrate/orch_definitely-not-real`, {
      headers: { Authorization: `Bearer ${env.token}` },
      failOnStatusCode: false,
    });
    expect(madeUp.status()).toBe(404);
    const body = await madeUp.text();
    expect(body).toContain('RUN_NOT_FOUND');
    // An attacker must not distinguish "doesn't exist" from "not yours". The
    // foreign-tenant half of this needs a second tenant's real id -- see README.
  });

  test.fixme('AC-M7: a body projectId is ignored in favour of the token\'s project', async () => {
    // Needs a second project under the same token to prove the binding.
  });

  test.fixme('AC-M8: a softlocked tenant gets a byte-identical 404', async () => {
    // Needs a softlocked (paused) tenant fixture.
  });
});
