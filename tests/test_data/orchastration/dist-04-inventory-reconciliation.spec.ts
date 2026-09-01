import { expect, test } from '@playwright/test';
import { compute, hashId, hold, seeded, subtotal } from './support/workload.js';

test.describe('Inventory Reconciliation', {
  tag: ['@orchestration', '@distribution', '@weight-l'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Inventory Reconciliation' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5104' },
    { type: 'testdino:context', description: 'Orchestration distribution corpus - all tests pass by design, so a missing or duplicated result is unambiguous. Unit weight: l (~700ms/test).' },
  ],
}, () => {
  test('[Inventory Reconciliation] 01 subtotal matches the sum of its line items', { tag: ['@critical', '@cart'] }, async () => {
    await hold(700);
    const lines = [{ price: 12.5, qty: 1 }, { price: 4.25, qty: 2 }];
    expect(subtotal(lines)).toBeCloseTo(12.5 * 1 + 8.5, 2);
  });

  test('[Inventory Reconciliation] 02 quantity rounds down to the stocked maximum', { tag: ['@high', '@checkout'] }, async () => {
    await hold(700);
    const requested = 21;
    const stocked = 12;
    expect(Math.min(requested, stocked)).toBe(12);
  });

  test('[Inventory Reconciliation] 03 seeded ordering is stable across machines', { tag: ['@medium', '@catalog'] }, async () => {
    await hold(700);
    const rnd = seeded(hashId('shape-2'));
    const first = [rnd(), rnd(), rnd()];
    const rnd2 = seeded(hashId('shape-2'));
    expect([rnd2(), rnd2(), rnd2()]).toEqual(first);
  });

  test('[Inventory Reconciliation] 04 discount never pushes the total below zero', { tag: ['@low', '@account'] }, async () => {
    await hold(700);
    const total = 8 - 50;
    expect(Math.max(total, 0)).toBe(0);
  });

  test('[Inventory Reconciliation] 05 currency string keeps two decimal places', { tag: ['@critical', '@payments'] }, async () => {
    await hold(700);
    expect((4 + 0.005).toFixed(2)).toMatch(/^\d+\.\d{2}$/);
  });

  test('[Inventory Reconciliation] 06 identifier hash is deterministic', { tag: ['@high', '@search'] }, async () => {
    await hold(700);
    expect(hashId('unit-5')).toBe(hashId('unit-5'));
  });

  test('[Inventory Reconciliation] 07 compute workload returns a stable digest', { tag: ['@medium', '@admin'] }, async () => {
    await hold(700);
    expect(compute(560)).toBe(compute(560));
  });

  test('[Inventory Reconciliation] 08 empty basket reports a zero subtotal', { tag: ['@low', '@cart'] }, async () => {
    await hold(700);
    expect(subtotal([])).toBe(0);
  });

  test('[Inventory Reconciliation] 09 sorted keys survive a shuffle', { tag: ['@critical', '@checkout'] }, async () => {
    await hold(700);
    const keys = ['c8', 'a8', 'b8'];
    expect([...keys].sort()).toEqual(['a8', 'b8', 'c8']);
  });

  test('[Inventory Reconciliation] 10 page size caps the returned window', { tag: ['@high', '@catalog'] }, async () => {
    await hold(700);
    const rows = Array.from({ length: 39 }, (_, n) => n);
    expect(rows.slice(0, 25)).toHaveLength(25);
  });

  test('[Inventory Reconciliation] 11 percentage split sums back to the whole', { tag: ['@medium', '@account'] }, async () => {
    await hold(700);
    const parts = [0.5, 0.3, 0.2].map((p) => p * 110);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(110, 6);
  });

  test('[Inventory Reconciliation] 12 null coalescing falls back to the default', { tag: ['@low', '@payments'] }, async () => {
    await hold(700);
    const value: number | null = 11;
    expect(value ?? -1).toBe(11);
  });

  test('[Inventory Reconciliation] 13 duplicate ids collapse into a unique set', { tag: ['@critical', '@search'] }, async () => {
    await hold(700);
    const ids = ['x12', 'x12', 'y12'];
    expect(new Set(ids).size).toBe(2);
  });

  test('[Inventory Reconciliation] 14 range clamps to its upper bound', { tag: ['@high', '@admin'] }, async () => {
    await hold(700);
    expect(Math.min(Math.max(91, 0), 40)).toBeLessThanOrEqual(40);
  });

  test('[Inventory Reconciliation] 15 timestamps compare in ascending order', { tag: ['@medium', '@cart'] }, async () => {
    await hold(700);
    const a = 1000 + 14;
    const b = a + 1;
    expect(b).toBeGreaterThan(a);
  });

});
