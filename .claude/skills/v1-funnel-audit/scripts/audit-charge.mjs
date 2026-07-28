// v1-funnel-audit (charge) — price-variant CHARGE CORRECTNESS across every funnel.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-charge.mjs
//
// The highest-value V1 pricing guard, and the one the copy-preview (?close=55) and
// the unit test (priceVariantPool.test.ts) CANNOT give you: it closes the whole
// assignment→charge loop through the REAL endpoints.
//
// For each funnel it enrols a fresh seeker via POST /api/lead (which assigns the
// price variant on the conversation row), then hits POST /api/checkout for BOTH
// the main and the downsell, retrieves the resulting **Stripe TEST** Checkout
// Session, and asserts the amount Stripe will actually charge == the variant the
// seeker was quoted at lead capture. That is exactly the invariant the "45
// corruption" broke: a mistyped config key ("down  sellCents") nulled the row, so
// getVariantForEmail (what /api/checkout reads) silently fell back to $35/$25 while
// the funnel still displayed $45 — dead for two weeks, invisible to every existing
// test because none of them followed a real lead through to the Stripe amount.
//
// It also asserts the sliding close's THUMB-ONLY scoping as a hard check: non-thumb
// palm signs (hand-size, …) must NEVER draw 55-35_palm. This is the assertion form
// of the live-log TODO "every 55-35_palm must carry sign=thumb".
//
// SAFETY (why this is safe to run):
//   • LOCAL ONLY — refuses any BASE that isn't localhost/127.0.0.1 (dev+prod share
//     one DB; a remote target is never safe).
//   • Stripe TEST ONLY — loads STRIPE_SECRET_KEY from .env.sandbox and REFUSES to
//     run unless it is an sk_test_ key. Creating a Checkout Session charges nothing
//     (payment only happens if a human completes the hosted page); these are throw-
//     away test-mode objects touching no real card.
//   • Every outbound integration is muted by .env.sandbox; the DB is the :5433 sandbox.
import Stripe from 'stripe';
import { config as loadEnv } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

// Load the SANDBOX env explicitly (never the real .env, which carries sk_live).
loadEnv({ path: '.env.sandbox' });

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/charge';
const RUN = Date.now().toString(36);
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });
const money = (c) => `$${(c / 100).toFixed(2)}`;

// The funnel matrix under test. Prices are whatever the served pool assigns; the
// audit never hard-codes them (except the root sanity), it asserts charge==quote.
// `expectDeterministic` pins the root funnel, whose pool has a single weighted arm.
const CASES = [
  { funnel: undefined, sign: undefined, label: 'root',          n: 1, expectDeterministic: { variant: '35', main: 3500, downsell: 2500 } },
  { funnel: 'v1-fb',    sign: undefined, label: 'fb',            n: 3 },
  { funnel: 'v1-fb2',   sign: undefined, label: 'fb2',           n: 3 },
  { funnel: 'v1-gdn',   sign: undefined, label: 'gdn',           n: 3 },
  { funnel: 'v1-palm',  sign: 'thumb',    label: 'palm/thumb',    n: 4 },
  // The thumb-only scoping guard needs a batch to be convincing: with 55-35_palm at
  // weight 1 for thumb, a leak onto hand-size would show up fast across 8 draws.
  { funnel: 'v1-palm',  sign: 'hand-size', label: 'palm/hand-size', n: 8, scopingGuard: true },
  // Tarot ships a FIXED price (FIXED_FUNNEL_PRICES['v1-tarot']), not a weighted pool,
  // so it is deterministic like root: every seeker must get 35_tarot at $35/$25. This
  // is the only end-to-end proof of the tarot MONEY path — the lander and chat are
  // covered by tests/fb-tarot-*.spec.ts, but nothing else exercises checkout.
  { funnel: 'v1-tarot', sign: undefined, label: 'tarot',           n: 3,
    expectDeterministic: { variant: '35_tarot', main: 3500, downsell: 2500 },
    expectProductSuffix: ' - TAROT' },
];

async function postJson(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status} ${text.slice(0, 200)}`);
  return json;
}

// Enrol a seeker and read back the variant + quoted prices the funnel assigned.
async function lead(email, funnel, sign) {
  const body = { email, firstName: 'Claire', bucket: 'love' };
  if (funnel) body.funnel = funnel;
  if (sign) body.sign = sign;
  const res = await postJson('/api/lead', body);
  return {
    variant: res.priceVariant,
    mainCents: res.priceDollars != null ? res.priceDollars * 100 : null,
    downsellCents: res.downsellDollars != null ? res.downsellDollars * 100 : null,
  };
}

// Run /api/checkout for real, then retrieve the Stripe session it created and read
// the amount Stripe will actually charge + the priceVariant it stamped in metadata.
async function chargedAmount(stripe, email, funnel, type) {
  const body = { email, firstName: 'Claire', bucket: 'love', type };
  if (funnel) body.funnel = funnel;
  const res = await postJson('/api/checkout', body);
  const url = res?.url || '';
  if (url === '/success' || url === '/success') {
    throw new Error('checkout returned the MOCK url — Stripe is not configured in the sandbox (STRIPE_SECRET_KEY missing?)');
  }
  let sessionId = (url.match(/cs_test_[A-Za-z0-9]+/) || [])[0];
  if (/cs_live_/.test(url)) throw new Error(`🔴 checkout produced a LIVE session (${url.slice(0, 40)}…) — sandbox is misconfigured, ABORTING`);
  // Fallback: if the id isn't in the URL, find the seeker's most recent test session.
  if (!sessionId) {
    const custs = await stripe.customers.list({ email, limit: 1 });
    if (custs.data[0]) {
      const sess = await stripe.checkout.sessions.list({ customer: custs.data[0].id, limit: 1 });
      sessionId = sess.data[0]?.id;
    }
  }
  if (!sessionId) throw new Error(`could not resolve a Stripe session id from checkout (url=${url.slice(0, 60)})`);
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
  return {
    amount: session.amount_total,
    unit: session.line_items?.data?.[0]?.amount_total ?? session.amount_total,
    metaVariant: session.metadata?.priceVariant ?? null,
    // The customer-facing line-item name. Carries the funnel's productSuffix
    // (" - PALM", " - TAROT", …) — the token Mike's n8n/PDF fulfilment filters on,
    // so a missing suffix silently misroutes an order.
    productName: session.line_items?.data?.[0]?.description ?? null,
  };
}

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox.`);
    process.exit(2);
  }
  if (!STRIPE_KEY.startsWith('sk_test_')) {
    console.error(`🔴 REFUSING: STRIPE_SECRET_KEY in .env.sandbox is not an sk_test_ key (got "${STRIPE_KEY.slice(0, 8)}…"). This audit must only ever touch Stripe TEST mode. Run scripts/make-sandbox-env.mjs first.`);
    process.exit(2);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const stripe = new Stripe(STRIPE_KEY);
  console.log(`\nv1-funnel-audit (charge) — base=${BASE}  Stripe=TEST  run=${RUN}\n`);

  const distribution = {}; // label → { variant: count }
  for (const c of CASES) {
    const dist = {};
    const mismatches = [];       // charge != quote
    const metaMismatches = [];   // stripe metadata variant != assigned
    const leakedToScoped = [];   // scoping guard: non-thumb sign drew 55-35_palm
    const productNameMismatches = []; // stripe line item missing the funnel's productSuffix
    let checkedMain = 0, checkedDown = 0;

    for (let i = 0; i < c.n; i++) {
      const email = `charge+${c.label.replace(/\W+/g, '-')}-${i}-${RUN}@example.com`;
      const assigned = await lead(email, c.funnel, c.sign);
      dist[assigned.variant] = (dist[assigned.variant] || 0) + 1;

      if (c.scopingGuard && assigned.variant === '55-35_palm') {
        leakedToScoped.push(email);
      }

      const main = await chargedAmount(stripe, email, c.funnel, 'main');
      checkedMain++;
      if (main.amount !== assigned.mainCents) {
        mismatches.push(`${c.label}#${i} MAIN quote=${money(assigned.mainCents)} charged=${money(main.amount)} (variant ${assigned.variant})`);
      }
      if (main.metaVariant !== assigned.variant) {
        metaMismatches.push(`${c.label}#${i} stripe.metadata.priceVariant=${main.metaVariant} assigned=${assigned.variant}`);
      }

      const down = await chargedAmount(stripe, email, c.funnel, 'downsell');
      checkedDown++;
      if (down.amount !== assigned.downsellCents) {
        mismatches.push(`${c.label}#${i} DOWNSELL quote=${money(assigned.downsellCents)} charged=${money(down.amount)} (variant ${assigned.variant})`);
      }

      // The funnel's productSuffix must reach the Stripe line item. It is what
      // identifies the order downstream (fulfilment filters on this token), so a
      // funnel whose suffix silently went missing would look fine in every other
      // check here — same price, same variant — and still misroute the order.
      if (c.expectProductSuffix) {
        for (const [kind, s] of [['MAIN', main], ['DOWNSELL', down]]) {
          if (!String(s.productName ?? '').includes(c.expectProductSuffix)) {
            productNameMismatches.push(
              `${c.label}#${i} ${kind} product name "${s.productName}" is missing "${c.expectProductSuffix}"`);
          }
        }
      }

      if (c.expectDeterministic) {
        const d = c.expectDeterministic;
        check(`[${c.label}] deterministic pool → variant ${d.variant} @ ${money(d.main)}/${money(d.downsell)}`,
          assigned.variant === d.variant && assigned.mainCents === d.main && assigned.downsellCents === d.downsell &&
          main.amount === d.main && down.amount === d.downsell,
          `assigned=${assigned.variant} quote=${money(assigned.mainCents)}/${money(assigned.downsellCents)} charged=${money(main.amount)}/${money(down.amount)}`);
      }
    }

    distribution[c.label] = dist;
    const distStr = Object.entries(dist).map(([v, n]) => `${v}×${n}`).join(', ');

    check(`[${c.label}] Stripe MAIN charge == quoted price for all ${checkedMain} seekers`,
      mismatches.filter((m) => /MAIN/.test(m)).length === 0,
      mismatches.filter((m) => /MAIN/.test(m)).join(' · ') || `variants: ${distStr}`);
    check(`[${c.label}] Stripe DOWNSELL charge == quoted price for all ${checkedDown} seekers`,
      mismatches.filter((m) => /DOWNSELL/.test(m)).length === 0,
      mismatches.filter((m) => /DOWNSELL/.test(m)).join(' · ') || `variants: ${distStr}`);
    check(`[${c.label}] Stripe metadata.priceVariant == assigned variant`,
      metaMismatches.length === 0, metaMismatches.join(' · ') || `variants: ${distStr}`);

    if (c.expectProductSuffix) {
      check(`[${c.label}] Stripe line item carries "${c.expectProductSuffix}" (fulfilment routes on it)`,
        productNameMismatches.length === 0,
        productNameMismatches.join(' · ') || `all ${checkedMain + checkedDown} sessions named correctly`);
    }

    if (c.scopingGuard) {
      check(`[${c.label}] THUMB-ONLY scoping: non-thumb sign NEVER draws 55-35_palm (${c.n} draws)`,
        leakedToScoped.length === 0,
        leakedToScoped.length ? `🔴 LEAK: ${leakedToScoped.length}/${c.n} hand-size seekers drew the thumb-only sliding close` : `variants: ${distStr}`);
      check(`[${c.label}] every charge stayed at the control price (no $55 on hand-size)`,
        !Object.keys(dist).includes('55-35_palm') && mismatches.length === 0,
        `variants: ${distStr}`);
    }
  }

  const passed = checks.filter((c) => c.pass).length, failed = checks.length - passed;
  const distLines = Object.entries(distribution)
    .map(([label, d]) => `- ${label}: ${Object.entries(d).map(([v, n]) => `${v}×${n}`).join(', ')}`).join('\n');
  const report =
    `# v1-funnel-audit (charge) — price-variant charge correctness\n\n` +
    `Base: ${BASE} · Stripe: TEST · run ${RUN} · ${passed}/${checks.length} passed` +
    `${failed ? ` · 🔴 ${failed} FAILED` : ' · ✅ ALL PASS'}\n\n` +
    `Each seeker is enrolled via /api/lead, then /api/checkout (main + downsell) is run for real and the\n` +
    `resulting **Stripe TEST** session is retrieved; the charge must equal the price the lead was quoted.\n\n` +
    `## Checks\n${checks.map((c) => `- ${c.pass ? '✅' : '🔴'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`).join('\n')}\n\n` +
    `## Variant distribution observed\n${distLines}\n`;
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log('\n' + report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 CHARGE AUDIT ERROR:', e.message); process.exit(2); });
