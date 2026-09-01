import { expect, test } from '@playwright/test';
import { compareAssignments, serverEnv } from './support/orchestration.js';

/**
 * L3 -- WebSocket push: GET /ws/orchestrate/{id}?machineId=...
 *
 * A "machine" here is just a socket with its own machineId. N sockets from one
 * spec file reproduce the contention that matters -- concurrent assign/ack
 * against one queue -- with no CI matrix involved.
 *
 * Assertions are on FRAMES RECEIVED, never on wall-clock sleeps: timing-based
 * assertions are how this level becomes flaky.
 *
 * CAVEAT: frame names (`assign`/`ack`/`end`) and the socket URL follow the
 * strategy doc and have not been exercised against a live dispatcher.
 */

const env = serverEnv();
const MACHINES = Math.max(2, Number.parseInt(process.env.TD_ORCH_MACHINES ?? '2', 10) || 2);

// Node 22+ exposes a global WebSocket. Without it this level cannot run at all.
const hasWebSocket = typeof (globalThis as { WebSocket?: unknown }).WebSocket !== 'undefined';

const skipReason = !env.ready
  ? env.reason
  : !hasWebSocket
    ? 'no global WebSocket in this Node runtime (needs Node 22+)'
    : 'needs a live orchestration id -- mint one via L2 first (currently blocked: dispatcher rejects a valid td_api_ key, feature flags likely off)';

interface Frame { type: string; specs?: Array<{ file: string; project: string }>; [k: string]: unknown }

/** Collect frames from one machine until `end` arrives or the budget expires. */
async function drain(orchestrationId: string, machineId: string, budgetMs = 60_000): Promise<Frame[]> {
  const url = `${env.url!.replace(/^http/, 'ws')}/ws/orchestrate/${orchestrationId}?machineId=${machineId}`;
  const WS = (globalThis as unknown as { WebSocket: new (u: string, o?: unknown) => any }).WebSocket;
  const socket = new WS(url, { headers: { Authorization: `Bearer ${env.token}` } });
  const frames: Frame[] = [];

  return new Promise<Frame[]>((resolve, reject) => {
    const timer = setTimeout(() => { try { socket.close(); } catch { /* already closed */ } resolve(frames); }, budgetMs);
    socket.onmessage = (ev: { data: string }) => {
      const frame = JSON.parse(ev.data) as Frame;
      frames.push(frame);
      if (frame.type === 'assign') socket.send(JSON.stringify({ type: 'ack', specs: frame.specs }));
      if (frame.type === 'end') { clearTimeout(timer); socket.close(); resolve(frames); }
    };
    socket.onerror = (err: unknown) => { clearTimeout(timer); reject(err); };
  });
}

test.describe('WebSocket push (L3)', {
  tag: ['@orchestration', '@contract', '@L3'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Orchestration WebSocket push' },
    { type: 'testdino:context', description: 'Env-gated. A machine is just a socket with its own machineId - no CI matrix needed.' },
  ],
}, () => {
  test.describe.configure({ timeout: 120 * 1000 });
  test.beforeEach(() => { test.skip(true, skipReason); });

  test('AC-W4: every machine receives assign frames listing spec FILES', async () => {
    const frames = await drain('orch_placeholder', 'machine-1');
    const assigns = frames.filter((f) => f.type === 'assign');
    expect(assigns.length).toBeGreaterThan(0);
    for (const a of assigns) {
      expect(Array.isArray(a.specs)).toBe(true);
      // Files, never individual tests.
      for (const s of a.specs!) expect(s).toHaveProperty('file');
    }
  });

  test('AC-W5: the union of all assigns equals discovery exactly (P1 + P2)', async () => {
    const ids = Array.from({ length: MACHINES }, (_, i) => `machine-${i + 1}`);
    const all = await Promise.all(ids.map((id) => drain('orch_placeholder', id)));

    const assigned = all.flat()
      .filter((f) => f.type === 'assign')
      .flatMap((f) => (f.specs ?? []).map((s) => `${s.file}|${s.project}`));

    // discovered comes from the master list minted for this orchestration.
    const discovered: string[] = [];

    const verdict = compareAssignments(discovered, assigned);
    expect(verdict.missing, 'P1: nothing may be lost').toEqual([]);
    expect(verdict.duplicated, 'P2: nothing may run twice').toEqual([]);
    expect(verdict.unexpected, 'nothing may be assigned that was never discovered').toEqual([]);
  });

  test('AC-W6: end is broadcast -- every machine gets exactly one', async () => {
    const ids = Array.from({ length: MACHINES }, (_, i) => `machine-${i + 1}`);
    const all = await Promise.all(ids.map((id) => drain('orch_placeholder', id)));
    for (const frames of all) {
      expect(frames.filter((f) => f.type === 'end')).toHaveLength(1);
    }
  });

  test('AC-W7: a machine joining an already-empty queue gets end promptly', async () => {
    const frames = await drain('orch_placeholder', 'machine-late', 15_000);
    // Must not hang waiting for work that will never come.
    expect(frames.some((f) => f.type === 'end')).toBe(true);
  });

  test('AC-W2: a cookie/JWT is rejected BEFORE the upgrade', async () => {
    // Never an upgraded-then-closed socket.
    await expect(drain('orch_placeholder', 'machine-cookie')).rejects.toBeTruthy();
  });

  test('AC-W3: a foreign or unknown id gets the same 404 cloak as AC-M9', async () => {
    await expect(drain('orch_definitely-not-real', 'machine-1')).rejects.toBeTruthy();
  });

  test.fixme('AC-W1: a valid key + machineId registers the machine', async () => {
    // Covered implicitly by AC-W4 once a live id exists; kept for traceability.
  });

  test.fixme('AC-W8: a duplicate machineId has defined behaviour (reject or replace)', async () => {
    // Two sockets silently sharing an identity would corrupt attribution.
  });
});
