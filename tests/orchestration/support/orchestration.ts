/**
 * Shared helpers for the orchestration test levels (L0-L4).
 *
 * The transform in here is the contract: it turns Playwright's `--list
 * --reporter=json` output into the master list that `orchestrate discover`
 * sends to the server. L0 pins that shape locally so it is verified before the
 * CLI or the dispatcher are reachable.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const REPO_ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
export const FIXTURE_CONFIG = 'playwright.orchestration.config.ts';

/** One dispatch unit. Orchestration assigns these -- never individual tests. */
export interface Unit {
  file: string;
  project: string;
  tags: string[];
  tests: Array<{ title: string; titlePath: string[]; tags: string[] }>;
}

export interface MasterList {
  totalTests: number;
  units: Unit[];
  suiteFingerprint: string;
  errors: unknown[];
}

/**
 * Run `playwright test --list --reporter=json` against the fixture config.
 *
 * stdio is captured, not inherited: anything a spec prints to stdout would
 * corrupt the JSON. (That is not hypothetical -- dotenv's "injected env"
 * notice broke `orchestrate discover` until both call sites passed quiet:true.)
 */
export function runList(extraArgs: string[] = []): { json: any; stderr: string; status: number } {
  const args = [
    'playwright', 'test',
    '--config', FIXTURE_CONFIG,
    '--list', '--reporter=json',
    ...extraArgs,
  ];
  const res = spawnSync('npx', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env },
  });
  let json: any = null;
  try {
    json = JSON.parse(res.stdout);
  } catch {
    json = null;
  }
  return { json, stderr: res.stderr ?? '', status: res.status ?? -1 };
}

/** Strip Playwright's leading '@' so the wire format carries bare tags. */
function bareTag(tag: string): string {
  return tag.startsWith('@') ? tag.slice(1) : tag;
}

/**
 * Flatten the reporter's nested suites into the flat unit array.
 *
 * Playwright nests project > file > describe > test. The wire format is flat:
 * one unit per (file, project), each carrying its tests. `spec.id` is
 * deliberately dropped -- it is not stable across CI machines (AC-D5).
 */
export function toMasterList(json: any): MasterList {
  const byKey = new Map<string, Unit>();
  let totalTests = 0;

  const walk = (suite: any, file: string | null, titleTrail: string[]) => {
    const nextFile = suite.file ?? file;
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const project = t.projectName ?? t.projectId ?? 'unknown';
        const key = `${spec.file ?? nextFile}|${project}`;
        if (!byKey.has(key)) {
          byKey.set(key, { file: spec.file ?? nextFile!, project, tags: [], tests: [] });
        }
        const unit = byKey.get(key)!;
        const tags = (spec.tags ?? []).map(bareTag);
        unit.tests.push({
          title: spec.title,
          // titlePath[0] is the project name, last element is the test title,
          // any describe titles sit in between (AC-D4).
          titlePath: [project, ...titleTrail, spec.title],
          tags,
        });
        for (const tag of tags) if (!unit.tags.includes(tag)) unit.tags.push(tag);
        totalTests += 1;
      }
    }
    for (const child of suite.suites ?? []) {
      const trail = child.title && child.title !== child.file ? [...titleTrail, child.title] : titleTrail;
      walk(child, nextFile, trail);
    }
  };

  for (const suite of json?.suites ?? []) walk(suite, null, []);

  const units = [...byKey.values()].sort((a, b) =>
    `${a.file}|${a.project}`.localeCompare(`${b.file}|${b.project}`));

  return {
    totalTests,
    units,
    suiteFingerprint: suiteFingerprint(units),
    errors: json?.errors ?? [],
  };
}

/**
 * Hash of the SORTED (file|project) keys.
 *
 * Sorted, so re-ordering files on disk cannot change it (AC-D8). Keyed on the
 * file set only, so a data-driven file whose test count varies still
 * fingerprints identically (AC-D7) -- otherwise every `test.each` change would
 * look like a different suite and fork the run.
 */
export function suiteFingerprint(units: Array<{ file: string; project: string }>): string {
  const keys = units.map((u) => `${u.file}|${u.project}`).sort();
  return createHash('sha256').update(keys.join('\n')).digest('hex');
}

/** The (file, project) key set -- the currency of the P1/P2 comparison. */
export function unitKeys(units: Array<{ file: string; project: string }>): string[] {
  return units.map((u) => `${u.file}|${u.project}`).sort();
}

export interface DistributionVerdict {
  ok: boolean;
  missing: string[];      // P1: discovered but never assigned -- silent test loss
  duplicated: string[];   // P2: assigned to more than one machine
  unexpected: string[];   // assigned but never discovered
}

/**
 * The no-loss / no-duplication oracle. Pure set arithmetic, no judgement --
 * eyeballing two lists of 500 items finds nothing.
 *
 * @param discovered keys from master.json
 * @param assigned   keys across EVERY machine's assign frames (a multiset)
 */
export function compareAssignments(discovered: string[], assigned: string[]): DistributionVerdict {
  const want = new Set(discovered);
  const counts = new Map<string, number>();
  for (const k of assigned) counts.set(k, (counts.get(k) ?? 0) + 1);

  const missing = [...want].filter((k) => !counts.has(k)).sort();
  const duplicated = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k).sort();
  const unexpected = [...counts.keys()].filter((k) => !want.has(k)).sort();

  return { ok: !missing.length && !duplicated.length && !unexpected.length, missing, duplicated, unexpected };
}

/** L2-L4 preconditions. Missing env means skip -- never fail. */
export function serverEnv(): { url: string | undefined; token: string | undefined; ready: boolean; reason: string } {
  const url = process.env.TESTDINO_SERVER_URL;
  const token = process.env.TESTDINO_TOKEN;
  if (!url) return { url, token, ready: false, reason: 'TESTDINO_SERVER_URL is not set' };
  if (!token) return { url, token, ready: false, reason: 'TESTDINO_TOKEN is not set' };
  if (!token.startsWith('td_api_')) {
    return { url, token, ready: false, reason: 'TESTDINO_TOKEN is not a td_api_ pipeline key (orchestrate is API-key-only)' };
  }
  return { url, token, ready: true, reason: '' };
}

/** How many tests the variable fixture file contributes. */
export function fixtureCases(): number {
  const n = Number.parseInt(process.env.TD_ORCH_FIXTURE_CASES ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
