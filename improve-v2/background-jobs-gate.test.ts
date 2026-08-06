/**
 * Matrix test for server/lib/backgroundJobsGate.ts — the identity gate on the
 * four background jobs (heartbeat, cleanup, recovery, cron).
 *
 * The property under test: a machine nobody configured must be SAFE, and
 * Production must keep billing with ZERO new configuration. The 2026-08 wallet
 * drain came through a developer laptop running the heartbeat against the
 * production database — a machine where no opt-out flag was ever going to be
 * set. Identity (Railway's auto-injected environment name) closes that; the
 * explicit flag stays as a two-way override.
 *
 * Run: npx tsx --test improve-v2/background-jobs-gate.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRunBackgroundJobs } from '../server/lib/backgroundJobsGate';

test('laptop (no Railway identity, no flag) → OFF — the August machine', () => {
  const d = shouldRunBackgroundJobs({});
  assert.equal(d.run, false);
  assert.match(d.reason, /no Railway identity/);
});

test('Railway production (auto-injected name, zero config) → ON', () => {
  const d = shouldRunBackgroundJobs({ RAILWAY_ENVIRONMENT_NAME: 'production' });
  assert.equal(d.run, true);
});

test('Railway production, case-insensitive → ON', () => {
  assert.equal(shouldRunBackgroundJobs({ RAILWAY_ENVIRONMENT_NAME: 'Production' }).run, true);
});

test('Railway development environment → OFF by default', () => {
  const d = shouldRunBackgroundJobs({ RAILWAY_ENVIRONMENT_NAME: 'development' });
  assert.equal(d.run, false);
  assert.match(d.reason, /not production/);
});

test('legacy RAILWAY_ENVIRONMENT fallback works both ways', () => {
  assert.equal(shouldRunBackgroundJobs({ RAILWAY_ENVIRONMENT: 'production' }).run, true);
  assert.equal(shouldRunBackgroundJobs({ RAILWAY_ENVIRONMENT: 'pr-42-preview' }).run, false);
});

test('explicit RUN_BACKGROUND_JOBS=true overrides a missing identity (local dev, own DB)', () => {
  assert.equal(shouldRunBackgroundJobs({ RUN_BACKGROUND_JOBS: 'true' }).run, true);
  assert.equal(shouldRunBackgroundJobs({ RUN_BACKGROUND_JOBS: '1' }).run, true);
});

test('explicit RUN_BACKGROUND_JOBS=false is a kill switch even on production', () => {
  const d = shouldRunBackgroundJobs({
    RUN_BACKGROUND_JOBS: 'false',
    RAILWAY_ENVIRONMENT_NAME: 'production',
  });
  assert.equal(d.run, false);
  assert.match(d.reason, /kill switch/);
});

test('garbage flag values fall through to identity, not to ON', () => {
  // A typo'd flag must never accidentally enable billing on a laptop…
  assert.equal(shouldRunBackgroundJobs({ RUN_BACKGROUND_JOBS: 'yess' }).run, false);
  // …and must never accidentally disable it on production.
  assert.equal(
    shouldRunBackgroundJobs({ RUN_BACKGROUND_JOBS: 'flase', RAILWAY_ENVIRONMENT_NAME: 'production' }).run,
    true,
  );
});

test('whitespace-only flag behaves as unset', () => {
  assert.equal(shouldRunBackgroundJobs({ RUN_BACKGROUND_JOBS: '  ' }).run, false);
  assert.equal(
    shouldRunBackgroundJobs({ RUN_BACKGROUND_JOBS: '  ', RAILWAY_ENVIRONMENT_NAME: 'production' }).run,
    true,
  );
});
