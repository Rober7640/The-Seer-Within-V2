// Run against the LOCAL Postgres only:
//   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seer npx tsx --test --test-force-exit server/lib/gatewaySplitByLander.db.test.ts
// The Stripe-vs-Payments.AI "by lander" table: each lander's numbers are right, and
// every column adds up to the pooled per-arm table the dashboard already shows.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.DATABASE_URL ?? '';
if (!/@(127\.0\.0\.1|localhost):5433\//.test(url)) {
  throw new Error('refusing to run: DATABASE_URL must be the local :5433 test DB');
}

const KEY = `test_gw_by_lander_${Date.now()}`;
const START = new Date(Date.now() - 3600_000);
const exposedAt = new Date(Date.now() - 1800_000);
const paidAt = new Date(Date.now() - 900_000);
const paidBefore = new Date(Date.now() - 2400_000); // BEFORE the exposure ⇒ not a test buyer

type Buyer = {
  variant: 'stripe' | 'paymentsai';
  funnel: string | null;
  hook: string | null;
  paid?: Date;
  gateway?: 'stripe' | 'paymentsai';
  main?: number;
  bump?: number;
  u1?: number;
  u2?: number;
};

// Two tarot landers + root, both arms, incl. a no-buy checkout, a fallback-to-Stripe
// buyer in the PAI arm, and one who paid before entering the test.
const PEOPLE: Buyer[] = [
  { variant: 'stripe', funnel: 'v1-tarot', hook: 'cards-meant-alone', paid: paidAt, gateway: 'stripe', main: 3500, bump: 1277, u1: 4700 },
  { variant: 'stripe', funnel: 'v1-tarot', hook: 'cards-meant-alone' },
  { variant: 'paymentsai', funnel: 'v1-tarot', hook: 'cards-meant-alone', paid: paidAt, gateway: 'paymentsai', main: 3500 },
  { variant: 'paymentsai', funnel: 'v1-tarot', hook: 'cards-meant-alone', paid: paidAt, gateway: 'stripe', main: 2500, bump: 1277 },
  { variant: 'stripe', funnel: 'v1-tarot', hook: 'cards-come-back', paid: paidAt, gateway: 'stripe', main: 3500, u2: 4700 },
  { variant: 'paymentsai', funnel: 'v1-tarot', hook: 'cards-come-back' },
  { variant: 'paymentsai', funnel: 'v1-tarot', hook: 'cards-come-back', paid: paidBefore, gateway: 'stripe', main: 2500 },
  { variant: 'stripe', funnel: null, hook: null, paid: paidAt, gateway: 'stripe', main: 3500 },
];

describe('gateway split — by lander', async () => {
  const { db } = await import('./db');
  const { tallyGatewaySplit, assembleGatewayByLander } = await import('./experiments');
  const { conversations, experimentExposures } = await import('@shared/schema');
  const { sql, eq } = await import('drizzle-orm');
  const tag = KEY;

  const cleanup = async () => {
    await db.delete(experimentExposures).where(eq(experimentExposures.experimentKey, KEY));
    await db.delete(conversations).where(sql`${conversations.email} like ${'%' + tag + '%'}`);
  };
  before(async () => {
    await cleanup();
    let i = 0;
    for (const p of PEOPLE) {
      i++;
      const [c] = await db
        .insert(conversations)
        .values({
          email: `p${i}+${tag}@example.com`,
          firstName: 'T',
          mainPaidAt: p.paid ?? null,
          paymentGateway: p.gateway ?? null,
          mainPurchaseAmount: p.main ?? null,
          bumpAmountCents: p.bump ?? null,
          upsellPurchased: !!p.u1,
          upsellAmount: p.u1 ?? null,
          upsell2Purchased: !!p.u2,
          upsell2Amount: p.u2 ?? null,
        })
        .returning({ id: conversations.id });
      await db.insert(experimentExposures).values({
        experimentKey: KEY,
        subjectId: `s${i}-${tag}`,
        variant: p.variant,
        surface: 'checkout',
        context: { conversationId: c.id, funnel: p.funnel, hook: p.hook, deck: null, type: 'main' },
        createdAt: exposedAt,
      });
    }
  });
  after(cleanup);

  it('splits each arm by lander with the right numbers', async () => {
    const g = await tallyGatewaySplit({ key: KEY, startISO: START.toISOString(), controlKey: 'stripe', treatmentKey: 'paymentsai' });
    const label = g.byLander.map((l) => `${l.funnel}|${l.hook}|${l.checkouts}`);
    assert.deepEqual(label, ['v1-tarot|cards-meant-alone|4', 'v1-tarot|cards-come-back|3', 'null|null|1']);

    const alone = g.byLander[0];
    assert.deepEqual(alone.arms.map((a) => a.variant), ['stripe', 'paymentsai']);
    const [aS, aP] = alone.arms;
    assert.equal(aS.checkouts, 2); assert.equal(aS.buyers, 1);
    assert.equal(aS.totalRevenueUsd, 94.77); // 35 + 12.77 + 47
    assert.equal(aS.revPerCheckoutUsd, 47.39);
    assert.equal(aP.checkouts, 2); assert.equal(aP.buyers, 2);
    assert.equal(aP.paidOnPaymentsai, 1); assert.equal(aP.paidOnStripe, 1);
    assert.equal(aP.mainRevenueUsd, 60); assert.equal(aP.bumpRevenueUsd, 12.77);

    const back = g.byLander[1];
    const [bS, bP] = back.arms;
    assert.equal(bS.buyers, 1); assert.equal(bS.upsell2RevenueUsd, 47);
    assert.equal(bP.checkouts, 2);
    assert.equal(bP.buyers, 0, 'paid BEFORE the exposure is not counted, exactly like the pooled table');

    const root = g.byLander[2];
    assert.deepEqual(root.arms.map((a) => [a.variant, a.checkouts]), [['stripe', 1], ['paymentsai', 0]], 'missing arm shown as zero');
  });

  it('every lander column adds up to the pooled per-arm table', async () => {
    const g = await tallyGatewaySplit({ key: KEY, startISO: START.toISOString(), controlKey: 'stripe', treatmentKey: 'paymentsai' });
    for (const pooled of g.gatewayDetail) {
      const slices = g.byLander.map((l) => l.arms.find((a) => a.variant === pooled.variant)!);
      const sum = (f: (a: typeof pooled) => number) => Math.round(slices.reduce((s, a) => s + f(a), 0) * 100) / 100;
      for (const k of ['checkouts', 'buyers', 'paidOnStripe', 'paidOnPaymentsai', 'upsell1Buyers', 'upsell2Buyers',
        'mainRevenueUsd', 'bumpRevenueUsd', 'upsell1RevenueUsd', 'upsell2RevenueUsd', 'totalRevenueUsd'] as const) {
        assert.equal(sum((a) => a[k] as number), pooled[k], `${pooled.variant} ${k}`);
      }
    }
  });

  it('assembleGatewayByLander (pure): control first, zero-filled, busiest first', () => {
    const rows = assembleGatewayByLander(
      [
        { variant: 'paymentsai', funnel: 'v1-tarot', hook: 'b', viewers: 1 },
        { variant: 'paymentsai', funnel: 'v1-tarot', hook: 'a', viewers: 3, buyers: 1, main_cents: 3500 },
        { variant: 'stripe', funnel: 'v1-tarot', hook: 'a', viewers: 2 },
      ],
      'stripe',
      'paymentsai',
    );
    assert.deepEqual(rows.map((r) => [r.hook, r.checkouts]), [['a', 5], ['b', 1]]);
    assert.deepEqual(rows[1].arms.map((a) => [a.variant, a.checkouts]), [['stripe', 0], ['paymentsai', 1]]);
    assert.equal(rows[0].arms[1].revPerCheckoutUsd, 11.67);
  });
});
