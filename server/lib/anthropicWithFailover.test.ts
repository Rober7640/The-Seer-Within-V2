// Run: npx tsx --test server/lib/anthropicWithFailover.test.ts
// Pure unit tests — fake clients, no network, no API keys needed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import {
  isCreditExhaustedError,
  isRetryableError,
  __runChainForTest,
} from './anthropicWithFailover';

// The exact body Anthropic returns when an account's balance is empty.
const CREDIT_BODY = {
  type: 'error',
  error: {
    type: 'invalid_request_error',
    message:
      'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
  },
};

function sdkError(status: number, body: object) {
  return Anthropic.APIError.generate(status, body, undefined, new Headers() as any);
}

describe('isCreditExhaustedError', () => {
  it('matches the real SDK 400 credit-balance error', () => {
    const err = sdkError(400, CREDIT_BODY);
    assert.equal(isCreditExhaustedError(err), true);
    assert.equal(isRetryableError(err), true);
  });

  it('does NOT match an ordinary 400 bad request (still non-retryable)', () => {
    const err = sdkError(400, {
      type: 'error',
      error: { type: 'invalid_request_error', message: 'max_tokens: field required' },
    });
    assert.equal(isCreditExhaustedError(err), false);
    assert.equal(isRetryableError(err), false);
  });
});

describe('promo-first chain', () => {
  const ok = (label: string) => ({ label });

  it('serves from the promo key when it works', async () => {
    const calls: string[] = [];
    const res = await __runChainForTest(
      [
        { name: 'promo_1', client: ok('promo') },
        { name: 'primary', client: ok('paid') },
      ],
      async (c: any) => { calls.push(c.label); return c.label; },
    );
    assert.equal(res, 'promo');
    assert.deepEqual(calls, ['promo']);
  });

  it('falls back to the paid key when promo credit runs out', async () => {
    const calls: string[] = [];
    const res = await __runChainForTest(
      [
        { name: 'promo_1', client: ok('promo') },
        { name: 'primary', client: ok('paid') },
      ],
      async (c: any) => {
        calls.push(c.label);
        if (c.label === 'promo') throw sdkError(400, CREDIT_BODY);
        return c.label;
      },
    );
    assert.equal(res, 'paid');
    assert.deepEqual(calls, ['promo', 'paid']);
  });

  it('does NOT fall back on an ordinary bad request (same request would fail on paid too)', async () => {
    const calls: string[] = [];
    await assert.rejects(
      __runChainForTest(
        [
          { name: 'promo_1', client: ok('promo') },
          { name: 'primary', client: ok('paid') },
        ],
        async (c: any) => {
          calls.push(c.label);
          throw sdkError(400, { type: 'error', error: { type: 'invalid_request_error', message: 'bad' } });
        },
      ),
    );
    assert.deepEqual(calls, ['promo']);
  });
});
