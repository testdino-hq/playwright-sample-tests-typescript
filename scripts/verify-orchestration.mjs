#!/usr/bin/env node
/**
 * The no-loss / no-duplication oracle (strategy doc §5), as a runnable check.
 *
 *   node scripts/verify-orchestration.mjs master.json m1/report.json m2/report.json
 *
 * discovered = set of (file, project) from master.json
 * assigned   = multiset of (file, project) across every machine's report
 *
 *   P1  assigned (as a set) === discovered   -> nothing lost
 *   P2  every count in assigned === 1        -> nothing duplicated
 *   P3  sum of tests === master.totalTests   -> one unified run, correct total
 *
 * Exits non-zero on any violation, so CI can gate on it. This comparison must
 * be programmatic: eyeballing two lists of 500 items finds nothing.
 */
import { readFileSync } from 'node:fs';

const [masterPath, ...reportPaths] = process.argv.slice(2);

if (!masterPath || reportPaths.length === 0) {
  console.error('usage: verify-orchestration.mjs <master.json> <machine-report.json...>');
  process.exit(2);
}

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Pull (file, project) keys out of a Playwright JSON report. */
function keysFromReport(report) {
  const keys = [];
  let tests = 0;
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        keys.push(`${spec.file}|${t.projectName ?? 'unknown'}`);
        tests += 1;
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const s of report.suites ?? []) walk(s);
  return { keys: [...new Set(keys)], tests };
}

const master = read(masterPath);
const discovered = (master.units ?? master.specs ?? []).map((u) => `${u.file}|${u.project}`);
const expectedTotal = master.totalTests ?? master.specCount;

const perMachine = reportPaths.map((p) => ({ path: p, ...keysFromReport(read(p)) }));
const assigned = perMachine.flatMap((m) => m.keys);
const ranTotal = perMachine.reduce((n, m) => n + m.tests, 0);

const want = new Set(discovered);
const counts = new Map();
for (const k of assigned) counts.set(k, (counts.get(k) ?? 0) + 1);

const missing = [...want].filter((k) => !counts.has(k)).sort();
const duplicated = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k).sort();
const unexpected = [...counts.keys()].filter((k) => !want.has(k)).sort();

console.log(`machines           : ${perMachine.length}`);
for (const m of perMachine) console.log(`  ${m.path}: ${m.keys.length} units, ${m.tests} tests`);
console.log(`discovered units   : ${want.size}`);
console.log(`assigned units     : ${counts.size}`);
console.log(`tests run (all)    : ${ranTotal}`);
console.log(`tests discovered   : ${expectedTotal}`);
console.log('');

const show = (label, arr) => {
  if (!arr.length) return;
  console.log(`${label} (${arr.length}):`);
  for (const k of arr.slice(0, 20)) console.log(`   ${k}`);
  if (arr.length > 20) console.log(`   ... and ${arr.length - 20} more`);
};

let failed = false;
if (missing.length) { failed = true; show('P1 VIOLATION -- discovered but never run', missing); }
else console.log('P1 no loss          : PASS');

if (duplicated.length) { failed = true; show('P2 VIOLATION -- run on more than one machine', duplicated); }
else console.log('P2 no duplication   : PASS');

if (expectedTotal != null && ranTotal !== expectedTotal) {
  failed = true;
  console.log(`P3 VIOLATION        : ran ${ranTotal} tests, discovery said ${expectedTotal}`);
} else {
  console.log('P3 correct total    : PASS');
}

show('assigned but never discovered', unexpected);
if (unexpected.length) failed = true;

console.log('');
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);
