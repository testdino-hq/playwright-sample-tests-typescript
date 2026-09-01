import { expect, test } from '@playwright/test';
import { compute, hashId, hold, subtotal } from './support/workload.js';

test.describe('Support Tickets', {
  tag: ['@orchestration', '@mixed'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'Support Tickets' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-5209' },
    { type: 'testdino:context', description: 'Mixed-outcome orchestration corpus - passed, failed, flaky, skipped, fixme and timed-out results, each in fast and slow variants. Requires --retries=1 or the flaky tests report as failed.' },
  ],
}, () => {
  test('[Passed] 01 promo code applies once and only once', { tag: ['@critical', '@speed-fast', '@pass'] }, async () => {
    await hold(50);
    expect(hashId('mixed-09-support-tickets-0')).toBe(hashId('mixed-09-support-tickets-0'));
  });

  test('[Passed] 02 shipping estimate matches the selected tier', { tag: ['@high', '@speed-fast', '@pass'] }, async () => {
    await hold(50);
    expect(hashId('mixed-09-support-tickets-1')).toBe(hashId('mixed-09-support-tickets-1'));
  });

  test('[Passed] 03 invoice total reconciles against the order', { tag: ['@medium', '@speed-fast', '@pass'] }, async () => {
    await hold(50);
    expect(hashId('mixed-09-support-tickets-2')).toBe(hashId('mixed-09-support-tickets-2'));
  });

  test('[Passed] 04 refund restores the original tender', { tag: ['@low', '@speed-fast', '@pass'] }, async () => {
    await hold(50);
    expect(hashId('mixed-09-support-tickets-3')).toBe(hashId('mixed-09-support-tickets-3'));
  });

  test('[Passed] 05 loyalty tier upgrades at the threshold', { tag: ['@critical', '@speed-medium', '@pass'] }, async () => {
    await hold(400);
    expect(hashId('mixed-09-support-tickets-4')).toBe(hashId('mixed-09-support-tickets-4'));
  });

  test('[Passed] 06 ticket priority escalates after the SLA', { tag: ['@high', '@speed-medium', '@pass'] }, async () => {
    await hold(400);
    expect(hashId('mixed-09-support-tickets-5')).toBe(hashId('mixed-09-support-tickets-5'));
  });

  test('[Passed] 07 audit row is written for every mutation', { tag: ['@medium', '@speed-slow', '@pass'] }, async () => {
    await hold(2500);
    expect(hashId('mixed-09-support-tickets-6')).toBe(hashId('mixed-09-support-tickets-6'));
  });

  test('[Passed] 08 export respects the active filter', { tag: ['@low', '@speed-slow', '@pass'] }, async () => {
    await hold(2500);
    expect(hashId('mixed-09-support-tickets-7')).toBe(hashId('mixed-09-support-tickets-7'));
  });

  test('[Failed] 09 pagination keeps a stable sort', { tag: ['@critical', '@speed-fast', '@fail'] }, async () => {
    await hold(30);
    const observed = compute(1008);
    // Deliberate failure: the expected digest never matches.
    expect(observed, 'digest should match the recorded baseline').toBe(-1);
  });

  test('[Failed] 10 search ranks exact matches first', { tag: ['@high', '@speed-fast', '@fail'] }, async () => {
    await hold(30);
    const observed = compute(1009);
    // Deliberate failure: the expected digest never matches.
    expect(observed, 'digest should match the recorded baseline').toBe(-1);
  });

  test('[Failed] 11 locale fallback resolves to en-US', { tag: ['@medium', '@speed-slow', '@fail'] }, async () => {
    await hold(2000);
    const observed = compute(1010);
    // Deliberate failure: the expected digest never matches.
    expect(observed, 'digest should match the recorded baseline').toBe(-1);
  });

  test('[Failed] 12 currency symbol matches the storefront', { tag: ['@low', '@speed-slow', '@fail'] }, async () => {
    await hold(2000);
    const observed = compute(1011);
    // Deliberate failure: the expected digest never matches.
    expect(observed, 'digest should match the recorded baseline').toBe(-1);
  });

  test('[Flaky] 13 address validation rejects a bad postcode', { tag: ['@critical', '@speed-medium', '@flaky'] }, async ({}, testInfo) => {
    await hold(200);
    // Fails the first attempt, passes on retry.
    expect(testInfo.retry, 'first attempt is expected to fail').toBeGreaterThan(0);
  });

  test('[Flaky] 14 wishlist survives a logout', { tag: ['@high', '@speed-medium', '@flaky'] }, async ({}, testInfo) => {
    await hold(200);
    // Fails the first attempt, passes on retry.
    expect(testInfo.retry, 'first attempt is expected to fail').toBeGreaterThan(0);
  });

  test('[Flaky] 15 review moderation queues profanity', { tag: ['@medium', '@speed-medium', '@flaky'] }, async ({}, testInfo) => {
    await hold(200);
    // Fails the first attempt, passes on retry.
    expect(testInfo.retry, 'first attempt is expected to fail').toBeGreaterThan(0);
  });

  test('[Skipped] 16 stock reservation expires on time', { tag: ['@low', '@speed-fast', '@skipped'] }, async () => {
    test.skip(true, 'Feature is behind a flag that is off in this environment');
    expect(subtotal([])).toBe(0);
  });

  test('[Skipped] 17 email validation accepts a tagged address', { tag: ['@critical', '@speed-fast', '@skipped'] }, async () => {
    test.skip(true, 'Feature is behind a flag that is off in this environment');
    expect(subtotal([])).toBe(0);
  });

  test('[Skipped] 18 password strength meter reaches "strong"', { tag: ['@high', '@speed-fast', '@skipped'] }, async () => {
    test.skip(true, 'Feature is behind a flag that is off in this environment');
    expect(subtotal([])).toBe(0);
  });

  test('[Fixme] 19 session survives a soft reload', { tag: ['@medium', '@speed-fast', '@fixme'] }, async () => {
    test.fixme(true, 'Known broken - tracked in QA-5209');
    expect(subtotal([])).toBe(0);
  });

  test('[Timeout] 20 cart badge tracks the line-item count', { tag: ['@low', '@speed-slow', '@timedout'] }, async () => {
    test.setTimeout(1500);
    // Deliberately outruns its own timeout: exercises the timedOut status.
    await hold(3000);
    expect(true).toBe(true);
  });

});
