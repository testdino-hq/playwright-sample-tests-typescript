/**
 * Deterministic workload helpers for the orchestration test corpus.
 *
 * These specs exist to exercise *distribution*, not the application under test.
 * They deliberately do NOT take the `page` fixture: no browser launches, so a
 * 500-test corpus stays cheap and, more importantly, its per-test duration is
 * stable enough to assert scheduling behaviour against (AC-S1 / AC-S2).
 */

/** Sleep for a fixed number of milliseconds. The unit of "test weight". */
export async function hold(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Small deterministic PRNG (mulberry32). Seeded from the test's own id so the
 * corpus produces identical values on every machine — a value that differed
 * per-machine would make no-loss/no-duplication set arithmetic unfalsifiable.
 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string — used to derive per-test seeds from ids. */
export function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A unit of deterministic CPU work, so "slow" is not purely idle wall-clock. */
export function compute(rounds: number): number {
  let acc = 0;
  for (let i = 0; i < rounds; i += 1) {
    acc = (acc + Math.imul(i ^ 0x9e3779b9, 2654435761)) >>> 0;
  }
  return acc >>> 0;
}

/** Simulated cart subtotal — gives the assertions something domain-shaped. */
export function subtotal(lines: Array<{ price: number; qty: number }>): number {
  return Number(lines.reduce((sum, l) => sum + l.price * l.qty, 0).toFixed(2));
}
