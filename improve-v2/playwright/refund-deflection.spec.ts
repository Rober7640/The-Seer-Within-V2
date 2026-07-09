/**
 * Refund / billing deflection — DETERMINISTIC end-to-end regression.
 *
 * The feature: a refund/chargeback/cancel message is short-circuited BEFORE the
 * LLM and answered with a fixed support template (server/lib/refundDeflection.ts).
 * Because the reply is a fixed string, we can assert it EXACTLY — an exact match
 * is proof the message never reached the model. Ordinary reading chat must NOT be
 * deflected.
 *
 * Arm-agnostic: the deflection lives in code, independent of A/B prompt arm.
 */
import { test, expect } from '@playwright/test';
import { REFUND_TEMPLATE, isRefundRequest } from '../../server/lib/refundDeflection';
import { freshEvelynSession, say, EvelynSession } from './helpers';

test.describe('V2 refund/billing deflection', () => {
  let s: EvelynSession;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    s = await freshEvelynSession(page, 'Rita');
    await page.close();
  });

  const REFUND_PHRASINGS = [
    'How do I request a refund?',
    'I want my money back',
    'this is a chargeback',
    'please cancel my subscription',
    'stop charging me',
    'I want to dispute this charge',
    'refund me please',
    'there is an unauthorized charge on my card',
  ];

  for (const phrase of REFUND_PHRASINGS) {
    test(`deflects to the fixed template: "${phrase}"`, async ({ page }) => {
      const res = await say(page, s, phrase);
      // Exact-match proves the LLM was never called.
      expect(res.message).toBe(REFUND_TEMPLATE);
      expect(res.blocked).toBe(true);
      expect(res.sessionActive).toBe(true);
      // Template gives the real path: support email + refund policy page.
      expect(res.message).toContain('support@cosmonumerology.com');
      expect(res.message).toContain('/refund');
    });
  }

  test('a refund message does NOT deduct coins (short-circuit before billing)', async ({ page }) => {
    const before = await say(page, s, 'reading please'); // establish a baseline balance
    const after = await say(page, s, 'actually I want a refund');
    expect(after.message).toBe(REFUND_TEMPLATE);
    // The deflection returns before the credit checkpoint, so balance is unchanged.
    expect(after.creditsRemaining).toBe(before.creditsRemaining);
  });

  test('ordinary reading chat is NOT deflected', async ({ page }) => {
    const res = await say(page, s, 'Will he come back to me?');
    expect(res.message).not.toBe(REFUND_TEMPLATE);
    expect(res.message.length).toBeGreaterThan(20); // a real reading came back
    expect(res.blocked).toBeFalsy();
  });

  test('false-positive guard: emotional money talk is NOT deflected', async ({ page }) => {
    const res = await say(page, s, 'my money worries have been so heavy lately, I can barely sleep');
    expect(res.message).not.toBe(REFUND_TEMPLATE);
    expect(res.message.length).toBeGreaterThan(20);
  });

  // Pure-function coverage of the detector (fast, no server) — documents intent
  // and guards the keyword set against regressions.
  test('isRefundRequest() classifies correctly', async () => {
    for (const p of REFUND_PHRASINGS) expect(isRefundRequest(p)).toBe(true);
    for (const ok of [
      'my money worries are heavy',
      'should I cancel my wedding?',
      'will he come back to me',
      'tell me about my career',
      'I want to cancel my plans with him',
    ]) {
      expect(isRefundRequest(ok)).toBe(false);
    }
  });
});
