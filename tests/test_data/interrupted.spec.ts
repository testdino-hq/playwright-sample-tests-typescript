import { test } from '@playwright/test';
import { setTimeout as sleep } from 'node:timers/promises';

const HOLD_MS = 180000;
const TEST_TIMEOUT_MS = 600000;

async function longRunningOperation() {
  await sleep(HOLD_MS);
}

const migrationCases = [
  { name: 'Migrate legacy order records to the new schema', tags: ['@critical', '@checkout'] },
  { name: 'Backfill product categories across the catalog', tags: ['@high', '@data-pipeline'] },
  { name: 'Rebuild the search index from the primary store', tags: ['@medium', '@data-pipeline'] },
  { name: 'Reconcile inventory counts with the warehouse feed', tags: ['@low', '@data-pipeline'] },
  { name: 'Migrate customer addresses to the normalized table', tags: ['@critical', '@data-table'] },
  { name: 'Recompute lifetime value for every customer', tags: ['@high', '@general'] },
  { name: 'Re-encrypt stored payment tokens with the new key', tags: ['@medium', '@auth'] },
  { name: 'Replay the order event log into the read model', tags: ['@low', '@checkout'] },
  { name: 'Rebuild the recommendation graph from scratch', tags: ['@critical', '@data-pipeline'] },
  { name: 'Normalize historical currency amounts to the base currency', tags: ['@high', '@general'] },
  { name: 'Migrate wishlist entries to the shared collection service', tags: ['@medium', '@data-pipeline'] },
  { name: 'Rebuild the category tree materialized view', tags: ['@low', '@data-pipeline'] },
  { name: 'Backfill missing SKU metadata from the supplier feed', tags: ['@critical', '@data-pipeline'] },
  { name: 'Re-index product reviews for the new ranking model', tags: ['@high', '@data-pipeline'] },
  { name: 'Migrate session records to the distributed cache', tags: ['@medium', '@auth'] },
  { name: 'Recalculate shipping zones for every saved address', tags: ['@low', '@general'] },
  { name: 'Rebuild the coupon eligibility cache', tags: ['@critical', '@checkout'] },
  { name: 'Migrate invoice documents to the archival bucket', tags: ['@high', '@checkout'] },
  { name: 'Backfill audit trail entries for legacy orders', tags: ['@medium', '@checkout'] },
  { name: 'Recompute tax rates across historical invoices', tags: ['@low', '@checkout'] },
  { name: 'Migrate user avatars to the new media pipeline', tags: ['@critical', '@visual'] },
  { name: 'Rebuild the price history rollup tables', tags: ['@high', '@data-table'] },
  { name: 'Backfill fulfillment timestamps from carrier records', tags: ['@medium', '@data-pipeline'] },
  { name: 'Migrate saved carts to the durable store', tags: ['@low', '@checkout'] },
  { name: 'Rebuild the customer segmentation snapshot', tags: ['@critical', '@data-pipeline'] },
];

test.describe('Long Running Migration', {
  tag: ['@chromium', '@firefox', '@interrupted', '@long-running-migration'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Long Running Migration' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-1489' },
    { type: 'testdino:context', description: 'Interrupt sample data - the run is aborted while these tests are in flight.' },
  ],
}, () => {
  for (const { name, tags } of migrationCases) {
    test(`[Migration] ${name}`, { tag: tags }, async () => {
      test.setTimeout(TEST_TIMEOUT_MS);
      await longRunningOperation();
    });
  }
});

const bulkProcessingCases = [
  { name: 'Process a fifty thousand row order export', tags: ['@high', '@checkout'] },
  { name: 'Generate invoices for the full monthly billing cycle', tags: ['@medium', '@checkout'] },
  { name: 'Compress and archive the previous quarter of logs', tags: ['@low', '@keyboard'] },
  { name: 'Batch import the supplier product feed', tags: ['@critical', '@data-pipeline'] },
  { name: 'Generate shipping labels for the pending queue', tags: ['@high', '@downloads'] },
  { name: 'Export the full customer list for the CRM sync', tags: ['@medium', '@downloads'] },
  { name: 'Recalculate stock levels across all warehouses', tags: ['@low', '@catalog'] },
  { name: 'Batch send the abandoned cart reminder campaign', tags: ['@critical', '@checkout'] },
  { name: 'Produce the annual sales reconciliation report', tags: ['@high', '@data-pipeline'] },
  { name: 'Bulk update prices from the pricing service', tags: ['@medium', '@data-pipeline'] },
  { name: 'Generate the full product sitemap', tags: ['@low', '@downloads'] },
  { name: 'Batch verify every stored email address', tags: ['@critical', '@forms'] },
  { name: 'Export the complete refund ledger', tags: ['@high', '@checkout'] },
  { name: 'Bulk resize the product image library', tags: ['@medium', '@visual'] },
  { name: 'Generate the warehouse pick list for all open orders', tags: ['@low', '@checkout'] },
  { name: 'Batch reconcile payment settlements', tags: ['@critical', '@checkout'] },
  { name: 'Export the full order history for compliance review', tags: ['@high', '@checkout'] },
  { name: 'Bulk apply the seasonal discount rules', tags: ['@medium', '@checkout'] },
  { name: 'Generate per-region tax summary reports', tags: ['@low', '@checkout'] },
  { name: 'Batch validate every shipping address on file', tags: ['@critical', '@data-pipeline'] },
  { name: 'Export the complete inventory movement log', tags: ['@high', '@downloads'] },
  { name: 'Bulk regenerate product thumbnails', tags: ['@medium', '@visual'] },
  { name: 'Generate the supplier settlement statements', tags: ['@low', '@checkout'] },
  { name: 'Batch archive completed support tickets', tags: ['@critical', '@data-pipeline'] },
  { name: 'Export the full analytics event stream', tags: ['@high', '@downloads'] },
];

test.describe('Bulk Data Processing', {
  tag: ['@chromium', '@webkit', '@interrupted', '@bulk-data-processing'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Bulk Data Processing' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7483' },
    { type: 'testdino:context', description: 'Interrupt sample data - the run is aborted while these tests are in flight.' },
  ],
}, () => {
  for (const { name, tags } of bulkProcessingCases) {
    test(`[Bulk Processing] ${name}`, { tag: tags }, async () => {
      test.setTimeout(TEST_TIMEOUT_MS);
      await longRunningOperation();
    });
  }
});

const soakCases = [
  { name: 'Hold a checkout session open past the idle threshold', tags: ['@medium', '@auth'] },
  { name: 'Monitor memory growth across a long browsing session', tags: ['@low', '@auth'] },
  { name: 'Watch for connection leaks during sustained traffic', tags: ['@critical', '@performance'] },
  { name: 'Observe cache eviction behaviour under steady load', tags: ['@high', '@performance'] },
  { name: 'Track session token refresh across an extended window', tags: ['@medium', '@auth'] },
  { name: 'Monitor queue depth during a sustained order burst', tags: ['@low', '@checkout'] },
  { name: 'Observe database connection pool saturation', tags: ['@critical', '@navigation'] },
  { name: 'Track render performance across a long catalog scroll', tags: ['@high', '@forms'] },
  { name: 'Monitor websocket stability over an extended period', tags: ['@medium', '@navigation'] },
  { name: 'Observe background job throughput under load', tags: ['@low', '@performance'] },
  { name: 'Track CDN cache hit ratio across a sustained window', tags: ['@critical', '@navigation'] },
  { name: 'Monitor search latency during continuous querying', tags: ['@high', '@performance'] },
  { name: 'Observe payment gateway keepalive behaviour', tags: ['@medium', '@checkout'] },
  { name: 'Track inventory sync drift across a long window', tags: ['@low', '@navigation'] },
  { name: 'Monitor error rates during a sustained soak', tags: ['@critical', '@performance'] },
  { name: 'Observe garbage collection pauses under load', tags: ['@high', '@performance'] },
  { name: 'Track API rate limit recovery over time', tags: ['@medium', '@general'] },
  { name: 'Monitor session replication across the cluster', tags: ['@low', '@auth'] },
  { name: 'Observe log ingestion lag under sustained volume', tags: ['@critical', '@general'] },
  { name: 'Track thread pool utilisation across the run', tags: ['@high', '@general'] },
  { name: 'Monitor disk usage growth during the soak window', tags: ['@medium', '@navigation'] },
  { name: 'Observe retry backoff behaviour under failure load', tags: ['@low', '@performance'] },
  { name: 'Track cart abandonment timing across the window', tags: ['@critical', '@checkout'] },
  { name: 'Monitor read replica lag during heavy writes', tags: ['@high', '@performance'] },
  { name: 'Observe circuit breaker behaviour under sustained errors', tags: ['@medium', '@general'] },
];

test.describe('Extended Soak', {
  tag: ['@chromium', '@android', '@interrupted', '@extended-soak'],
  annotation: [
    { type: 'testdino:owner', description: 'data-platform' },
    { type: 'testdino:feature', description: 'Extended Soak' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-2517' },
    { type: 'testdino:context', description: 'Interrupt sample data - the run is aborted while these tests are in flight.' },
  ],
}, () => {
  for (const { name, tags } of soakCases) {
    test(`[Soak] ${name}`, { tag: tags }, async () => {
      test.setTimeout(TEST_TIMEOUT_MS);
      await longRunningOperation();
    });
  }
});

const externalWaitCases = [
  { name: 'Await settlement confirmation from the payment provider', tags: ['@low', '@checkout'] },
  { name: 'Await carrier pickup confirmation for a shipment', tags: ['@critical', '@dialogs'] },
  { name: 'Await the supplier stock availability callback', tags: ['@high', '@catalog'] },
  { name: 'Await the tax service recalculation webhook', tags: ['@medium', '@checkout'] },
  { name: 'Await the fraud review decision from the vendor', tags: ['@low', '@catalog'] },
  { name: 'Await the identity verification provider response', tags: ['@critical', '@general'] },
  { name: 'Await the warehouse dispatch acknowledgement', tags: ['@high', '@general'] },
  { name: 'Await the email provider delivery receipt', tags: ['@medium', '@forms'] },
  { name: 'Await the SMS gateway delivery confirmation', tags: ['@low', '@dialogs'] },
  { name: 'Await the accounting system journal posting', tags: ['@critical', '@general'] },
  { name: 'Await the customs clearance status update', tags: ['@high', '@general'] },
  { name: 'Await the refund authorization from the acquirer', tags: ['@medium', '@auth'] },
  { name: 'Await the loyalty provider points reconciliation', tags: ['@low', '@checkout'] },
  { name: 'Await the marketplace listing approval', tags: ['@critical', '@general'] },
  { name: 'Await the address validation service response', tags: ['@high', '@forms'] },
  { name: 'Await the credit check provider decision', tags: ['@medium', '@general'] },
  { name: 'Await the returns portal label generation', tags: ['@low', '@downloads'] },
  { name: 'Await the analytics warehouse batch load', tags: ['@critical', '@performance'] },
  { name: 'Await the currency rate provider refresh', tags: ['@high', '@general'] },
  { name: 'Await the subscription billing processor run', tags: ['@medium', '@checkout'] },
  { name: 'Await the invoice archival service confirmation', tags: ['@low', '@checkout'] },
  { name: 'Await the third party review import', tags: ['@critical', '@catalog'] },
  { name: 'Await the shipping rate negotiation response', tags: ['@high', '@general'] },
  { name: 'Await the inventory reservation release', tags: ['@medium', '@catalog'] },
  { name: 'Await the partner catalog synchronisation', tags: ['@low', '@catalog'] },
];

test.describe('External Dependency Wait', {
  tag: ['@chromium', '@ios', '@interrupted', '@external-dependency-wait'],
  annotation: [
    { type: 'testdino:owner', description: 'qa-team' },
    { type: 'testdino:feature', description: 'External Dependency Wait' },
    { type: 'testdino:link', description: 'https://jira.example.com/browse/QA-7557' },
    { type: 'testdino:context', description: 'Interrupt sample data - the run is aborted while these tests are in flight.' },
  ],
}, () => {
  for (const { name, tags } of externalWaitCases) {
    test(`[External Wait] ${name}`, { tag: tags }, async () => {
      test.setTimeout(TEST_TIMEOUT_MS);
      await longRunningOperation();
    });
  }
});
