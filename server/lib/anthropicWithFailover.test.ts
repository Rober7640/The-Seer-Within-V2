// Run: npx tsx --test server/lib/anthropicWithFailover.test.ts
// Pure unit tests — fake clients, no network, no API keys needed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import {
  isCreditExhaustedError,
  isRetryableError,
  __runChainForTest,
  withThinkingOff,
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

describe('three promo keys in order', () => {
  const chain = [
    { name: 'promo_1' as const, client: { label: 'p1' } },
    { name: 'promo_2' as const, client: { label: 'p2' } },
    { name: 'promo_3' as const, client: { label: 'p3' } },
    { name: 'primary' as const, client: { label: 'paid' } },
  ];

  it('tries promo_1 → promo_2 → promo_3 → paid as each runs out of credit', async () => {
    const calls: string[] = [];
    const res = await __runChainForTest(chain, async (c: any) => {
      calls.push(c.label);
      if (c.label !== 'paid') throw sdkError(400, CREDIT_BODY);
      return c.label;
    });
    assert.equal(res, 'paid');
    assert.deepEqual(calls, ['p1', 'p2', 'p3', 'paid']);
  });

  it('stops at promo_2 when promo_1 is spent but promo_2 still has credit', async () => {
    const calls: string[] = [];
    const res = await __runChainForTest(chain, async (c: any) => {
      calls.push(c.label);
      if (c.label === 'p1') throw sdkError(400, CREDIT_BODY);
      return c.label;
    });
    assert.equal(res, 'p2');
    assert.deepEqual(calls, ['p1', 'p2']);
  });

  it('skips a promo key whose account lacks the model (404 model:) and moves on', async () => {
    const calls: string[] = [];
    const res = await __runChainForTest(
      [chain[2], chain[3]],
      async (c: any) => {
        calls.push(c.label);
        if (c.label === 'p3') {
          throw sdkError(404, { type: 'error', error: { type: 'not_found_error', message: 'model: claude-sonnet-4-5-20250929' } });
        }
        return c.label;
      },
    );
    assert.equal(res, 'paid');
    assert.deepEqual(calls, ['p3', 'paid']);
  });
});

describe('withThinkingOff (shared by V1 and V2 clients)', () => {
  it('turns thinking off for Sonnet 5.5 and Haiku 5.5', () => {
    assert.deepEqual(withThinkingOff({ model: 'claude-sonnet-5-5' }).thinking, { type: 'between_tools' });
    assert.deepEqual(withThinkingOff({ model: 'claude-haiku-5-5' }).thinking, { type: 'disabled' });
  });
  it('leaves an explicit caller setting alone', () => {
    assert.deepEqual(withThinkingOff({ model: 'claude-sonnet-5-5', thinking: { type: 'adaptive' } }).thinking, { type: 'adaptive' });
  });
});
