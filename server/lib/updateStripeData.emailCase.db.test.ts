// Run against the LOCAL Postgres only:
//   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seer npx tsx --test server/lib/updateStripeData.emailCase.db.test.ts
// A sale must land on the buyer's existing chat row even when the order email's
// capitals differ from what she typed (the Payments.AI orphan-row bug, 30 Oct 2026).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.DATABASE_URL ?? '';
if (!/@(127\.0\.0\.1|localhost):5433\//.test(url)) {
  throw new Error(`refusing to run: DATABASE_URL must be the local :5433 test DB, got ${url.replace(/:[^:@]*@/, ':***@')}`);
}

const tag = `emailcase-${Date.now()}`;
const typed = `Cai.Test+${tag}@Example.com`; // what she typed in chat
const lower = typed.toLowerCase(); // what the PAI order carries

describe('updateStripeData matches the buyer row whatever the capitals', async () => {
  const { db, updateStripeData } = await import('./db');
  const { conversations } = await import('@shared/schema');
  const { sql } = await import('drizzle-orm');

  const rowsFor = () =>
    db.select().from(conversations).where(sql`lower(${conversations.email}) = ${lower}`);
  const cleanup = () => db.delete(conversations).where(sql`lower(${conversations.email}) like ${'%' + tag + '%'}`);

  before(cleanup);
  after(cleanup);

  it('PAI sale with a lower-cased email updates her capitalised chat row (no orphan)', async () => {
    const [chat] = await db
      .insert(conversations)
      .values({ email: typed, firstName: 'Cai', bucket: 'love', priceVariant: '35_tarot' })
      .returning({ id: conversations.id });

    await updateStripeData(lower, {
      paymentGateway: 'paymentsai',
      stripeSessionId: `txn_${tag}`,
      stripeCustomerId: `cus_${tag}`,
      mainPurchaseAmount: 3500,
    });

    const rows = await rowsFor();
    assert.equal(rows.length, 1, 'no second (orphan) row was created');
    assert.equal(rows[0].id, chat.id);
    assert.equal(rows[0].paymentGateway, 'paymentsai');
    assert.equal(rows[0].stripeSessionId, `txn_${tag}`);
    assert.equal(rows[0].mainPurchaseAmount, 3500);
    assert.equal(rows[0].priceVariant, '35_tarot', 'price variant kept');
    assert.equal(rows[0].email, typed, 'her typed email is not rewritten');
  });

  it('exact-case match still wins (the Stripe path is unchanged)', async () => {
    await updateStripeData(typed, {
      paymentGateway: 'stripe',
      stripeSessionId: `cs_${tag}`,
      stripeCustomerId: `cus_${tag}`,
      mainPurchaseAmount: 4200,
    });
    const rows = await rowsFor();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].stripeSessionId, `cs_${tag}`);
  });

  it('a buyer with no row at all still gets a new row', async () => {
    const fresh = `new+${tag}@example.com`;
    await updateStripeData(fresh, {
      paymentGateway: 'paymentsai',
      stripeSessionId: `txn_new_${tag}`,
      stripeCustomerId: `cus_new_${tag}`,
      mainPurchaseAmount: 3500,
    });
    const rows = await db.select().from(conversations).where(sql`${conversations.email} = ${fresh}`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].stripeSessionId, `txn_new_${tag}`);
  });
});
