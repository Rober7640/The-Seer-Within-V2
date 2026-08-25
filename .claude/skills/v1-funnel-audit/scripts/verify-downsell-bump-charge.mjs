// Does the DOWNSELL bump card name the price Stripe actually bills?
//
//   node .claude/skills/v1-funnel-audit/scripts/verify-downsell-bump-charge.mjs
//
// 🔴 WHY THIS EXISTS SEPARATELY FROM audit-downsell-bump.mjs. That script fulfils
// /api/lead and /api/checkout itself, so it never sees what the SERVER builds — and
// that blindness is precisely how the card/charge split shipped and survived a 13/13
// green audit. This one mocks NOTHING: it drives the real /api/lead, the real
// /api/checkout, and then retrieves the created session from Stripe with the TEST key
// and reads the line items off it.
//
// WHAT IT PROVES
//   · every downsell bump session carries a SECOND line item at all
//   · that line's unit_amount equals what the offer CARD would have rendered
//   · metadata.bumpProduct is the downsell key on downsell, `double_reading` on main
//   · both price arms are actually drawn — see the sampling note below
//
// 🔴 IT FAILS IF ONLY ONE ARM WAS DRAWN. Unanimous agreement on a fallback value is
// exactly how a live mismatch hides: while v1_downsell_bump_price_2026 is draft, both
// the card and the charge fall back to $9.77 and agree perfectly, which tells you
// nothing about arm A. To exercise both arms, start the experiment on the SANDBOX
// database first (never production):
//
//   UPDATE experiments SET status='running', started_at=now()
//    WHERE key='v1_downsell_bump_price_2026';
//
// It also needs v1_bump_copy_2026 RUNNING with a `{"bump":true}` payload — that is
// what decides she is offered a bump at all. Seed only the price test and every
// checkout comes back with no bump line and the feature looks broken.
//
// LOCAL ONLY. It creates real Stripe TEST checkout sessions (never paid, never
// charged) and real conversations rows. It refuses to run against anything but
// localhost.

import Stripe from 'stripe';
import { resolveBumpCents, V1_BUMP_CENTS } from '../../../../shared/orderBump.ts';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5050';
const N = Number(process.env.SAMPLE || 16);
const FUNNEL = process.env.FUNNEL || 'v1-tarot';
const TIER = process.env.TIER === 'main' ? 'main' : 'downsell';

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox.`);
  process.exit(2);
}
if (!/^sk_test_/.test(process.env.STRIPE_SECRET_KEY || '')) {
  console.error('🔴 REFUSING to run without a Stripe TEST key. Run with --env-file=.env.sandbox.');
  process.exit(2);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const stamp = Math.floor(Date.now() / 1000);
const rows = [];

for (let i = 0; i < N; i++) {
  const email = `bumpverify-${stamp}-${i}@example.invalid`;
  const common = { email, firstName: 'Verify', bucket: 'love', funnel: FUNNEL };

  const lead = await fetch(`${BASE}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...common, tarotDeck: 'reunion', tarotHook: 'decode-him' }),
  }).then((r) => r.json());

  const checkout = await fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...common,
      type: TIER,
      tarotHook: 'decode-him',
      bumpOffered: true,
      bumpAccepted: true,
      bumpBucket: 'money',
    }),
  }).then((r) => r.json());

  // What the OFFER CARD renders, computed exactly as ChatPage.tsx does: the main
  // tier is a flat constant, the downsell reads the arm /api/lead sent. Deriving it
  // the same way is the point — if /api/lead stops sending the field, this recomputes
  // the same $9.77 fallback the card would show and the mismatch surfaces here.
  const cardCents =
    TIER === 'downsell' ? resolveBumpCents(lead.bumpCentsDownsell, 'downsell') : V1_BUMP_CENTS;

  const sid = String(checkout.url ?? '').match(/cs_test_[A-Za-z0-9]+/)?.[0];
  let charged = null;
  let bumpProduct = '(absent)';
  let mainCents = null;
  if (sid) {
    const session = await stripe.checkout.sessions.retrieve(sid, { expand: ['line_items'] });
    const items = session.line_items.data;
    // The bump line is the one whose name carries the leading "+" (V1_BUMP_PRODUCT_NAME
    // and every copy arm's productName start with it — deliberately, so the two lines
    // read as one purchase on the hosted page).
    charged = items.find((li) => li.description?.startsWith('+'))?.amount_total ?? null;
    mainCents = items.find((li) => !li.description?.startsWith('+'))?.amount_total ?? null;
    bumpProduct = session.metadata?.bumpProduct ?? '(absent)';
  }

  rows.push({ i, orderBump: lead.orderBump === true, cardCents, charged, bumpProduct, mainCents });
}

console.table(rows);

const fail = [];
const noLine = rows.filter((r) => r.charged === null);
if (noLine.length) fail.push(`${noLine.length}/${rows.length} sessions carried NO bump line item`);

const mismatched = rows.filter((r) => r.charged !== null && r.charged !== r.cardCents);
if (mismatched.length) {
  fail.push(
    `${mismatched.length}/${rows.length} would be SHOWN $${(mismatched[0].cardCents / 100).toFixed(2)} ` +
      `and CHARGED $${(mismatched[0].charged / 100).toFixed(2)}`,
  );
}

const armsDrawn = new Set(rows.map((r) => r.charged).filter((c) => c !== null));
if (TIER === 'downsell' && armsDrawn.size < 2) {
  fail.push(
    `only ONE price arm was drawn (${[...armsDrawn].join(', ') || 'none'}) — agreement here proves ` +
      'nothing. Start v1_downsell_bump_price_2026 on the sandbox DB and re-run.',
  );
}

const expectedProduct = TIER === 'downsell' ? 'double_strength_reading_ob' : 'double_reading';
const wrongProduct = rows.filter((r) => r.bumpProduct !== expectedProduct);
if (wrongProduct.length) {
  fail.push(
    `${wrongProduct.length}/${rows.length} stamped bumpProduct='${wrongProduct[0].bumpProduct}', ` +
      `expected '${expectedProduct}' on the ${TIER} tier`,
  );
}

console.log(`\ntier=${TIER}  funnel=${FUNNEL}  sample=${N}`);
console.log(`price arms drawn : ${[...armsDrawn].join(', ') || '(none)'}`);
console.log(`bumpProduct      : ${[...new Set(rows.map((r) => r.bumpProduct))].join(', ')}`);

if (fail.length) {
  console.log('\n🔴 FAIL');
  for (const f of fail) console.log(`   · ${f}`);
  process.exit(1);
}
console.log('\n✅ PASS — every card price matched its Stripe line, on both arms.');
