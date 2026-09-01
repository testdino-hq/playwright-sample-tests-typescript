import { expect, test } from '@playwright/test';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  runList,
  toMasterList,
  suiteFingerprint,
  unitKeys,
  type MasterList,
} from './support/orchestration.js';

/**
 * L0 -- the discover contract, verified locally.
 *
 * Runs against the fixture suite (3 files x 2 projects) whose numbers are
 * hand-computed, so "the queue is correct" is a countable claim rather than an
 * eyeball. Needs nothing but Playwright: no CLI build, no dispatcher, no flags.
 */

// Listing spawns a Playwright process, so memoise the unfiltered run and reuse it.
let cached: MasterList | null = null;
function master(): MasterList {
  if (!cached) {
    const { json, stderr, status } = runList();
    expect(json, `--list produced no parsable JSON (status ${status}): ${stderr.slice(0, 400)}`).toBeTruthy();
    cached = toMasterList(json);
  }
  return cached;
}

test.describe('Discover contract (L0)', {
  tag: ['@orchestration', '@contract', '@L0'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Orchestration discover contract' },
    { type: 'testdino:context', description: 'Known-answer tests against the fixture suite. Runnable with no server, no CLI build and no feature flags.' },
  ],
}, () => {
  test.describe.configure({ timeout: 120 * 1000 });

  test('AC-D1: unfiltered list is 6 tests in 6 units', async () => {
    const m = master();
    expect(m.totalTests, '3 fixture tests x 2 projects').toBe(6);
    expect(m.units.length, 'one unit per (file, project)').toBe(6);
  });

  test('AC-D2: units are a flat array of unique (file, project) pairs', async () => {
    const m = master();
    const keys = unitKeys(m.units);
    expect(new Set(keys).size, 'no duplicate unit').toBe(keys.length);
    for (const unit of m.units) {
      expect(Object.keys(unit).sort()).toEqual(['file', 'project', 'tags', 'tests']);
      expect(Array.isArray(unit.tests)).toBe(true);
      // Flat: a unit must never carry nested child units.
      expect((unit as unknown as Record<string, unknown>).units).toBeUndefined();
      expect((unit as unknown as Record<string, unknown>).suites).toBeUndefined();
    }
  });

  test('AC-D3: tags are un-prefixed', async () => {
    const m = master();
    const smoke = m.units.find((u) => u.file.includes('checkout.fixture'));
    expect(smoke, 'checkout fixture unit').toBeTruthy();
    // Assert the bare form: a test asserting '@smoke' passes today and breaks later.
    expect(smoke!.tags).toContain('smoke');
    for (const unit of m.units) {
      for (const tag of unit.tags) expect(tag.startsWith('@'), `tag ${tag} must be un-prefixed`).toBe(false);
      for (const t of unit.tests) {
        for (const tag of t.tags) expect(tag.startsWith('@'), `tag ${tag} must be un-prefixed`).toBe(false);
      }
    }
  });

  test('AC-D4: titlePath is [project, ...describes, title]', async () => {
    const m = master();
    const unit = m.units.find((u) => u.file.includes('checkout.fixture'))!;
    const t = unit.tests[0]!;
    expect(t.titlePath[0], 'first element is the project name').toBe(unit.project);
    expect(t.titlePath[t.titlePath.length - 1], 'last element is the test title').toBe(t.title);
    expect(t.titlePath, 'the describe title sits in between').toContain('Checkout');
  });

  test('AC-D5: spec.id is absent from the wire payload', async () => {
    const m = master();
    // Playwright's own hash is not stable across CI machines and must not be sent.
    for (const unit of m.units) {
      expect((unit as unknown as Record<string, unknown>).id).toBeUndefined();
      for (const t of unit.tests) expect((t as unknown as Record<string, unknown>).id).toBeUndefined();
    }
    expect(JSON.stringify(m.units)).not.toContain('"id"');
  });

  test('AC-D6: filters reach the list -- @smoke gives 2, chromium gives 3', async () => {
    const grep = toMasterList(runList(['--grep', '@smoke']).json);
    expect(grep.totalTests).toBe(2);
    expect(grep.units.length).toBe(2);

    const project = toMasterList(runList(['--project', 'chromium']).json);
    expect(project.totalTests).toBe(3);
    expect(project.units.length).toBe(3);

    const both = toMasterList(runList(['--grep', '@smoke', '--project', 'chromium']).json);
    expect(both.totalTests).toBe(1);
    expect(both.units.length).toBe(1);
  });

  test('AC-D7: fingerprint survives a changing test count (the test.each guard)', async () => {
    const one = toMasterList(runList([], ).json);
    const three = toMasterList(
      (() => {
        const prev = process.env.TD_ORCH_FIXTURE_CASES;
        process.env.TD_ORCH_FIXTURE_CASES = '3';
        try {
          return runList().json;
        } finally {
          if (prev === undefined) delete process.env.TD_ORCH_FIXTURE_CASES;
          else process.env.TD_ORCH_FIXTURE_CASES = prev;
        }
      })(),
    );

    expect(one.totalTests, 'N=1 -> 3 tests x 2 projects').toBe(6);
    expect(three.totalTests, 'N=3 -> 5 tests x 2 projects').toBe(10);
    expect(three.suiteFingerprint, 'same file set -> same fingerprint').toBe(one.suiteFingerprint);
  });

  test('AC-D8: fingerprint hashes the SORTED keys, so file order cannot move it', async () => {
    const m = master();
    const shuffled = [...m.units].reverse();
    expect(suiteFingerprint(shuffled)).toBe(m.suiteFingerprint);
    expect(suiteFingerprint([...m.units].sort(() => 1))).toBe(m.suiteFingerprint);
  });

  test('AC-D9: a broken spec file makes discovery fail loudly', async () => {
    const broken = path.join(REPO_ROOT, 'tests/orchestration/fixtures/broken.fixture.spec.ts');
    try {
      writeFileSync(broken, 'import { test } from "@playwright/test";\ntest("oops" => {\n');
      const { json, status } = runList();
      const errors = json ? toMasterList(json).errors : ['non-zero exit, unparsable output'];
      // A master list built from a broken suite must never be silently short.
      expect(status, 'discovery must not exit 0').not.toBe(0);
      expect(errors.length, 'errors[] must be non-empty').toBeGreaterThan(0);
    } finally {
      if (existsSync(broken)) rmSync(broken);
    }
  });
});
