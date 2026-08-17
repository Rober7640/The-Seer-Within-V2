// Revenue produced by the emailed abandoned-reading sequence.
//
// WHY THIS EXISTS: the marker is written to Stripe as `metadata.src = 'recovery'`
// (see /api/checkout in server/routes.ts), but reading it back out of the Stripe
// Dashboard proved unreliable — the metadata filter is not where the UI docs say
// it is, and the global search bar did not accept the query syntax. The Search
// API does, unambiguously, so this asks it directly.
//
// It also queries BOTH Stripe accounts. Stripe object ids only resolve against
// the account that created them (A primary / B backup, see server/lib/
// stripeAccount.ts), so a single-account report silently under-counts whenever
// traffic has moved between them — the failure mode is a plausible-looking number
// that is simply wrong, which is worse than an error.
//
//   npx tsx scripts/recovery-revenue.ts             # last 30 days
//   npx tsx scripts/recovery-revenue.ts --days 7
//   npx tsx scripts/recovery-revenue.ts --all       # no date bound
//
// Read-only: it performs searches and nothing else.

import 'dotenv/config';
import Stripe from 'stripe';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const days = argv.includes('--all') ? null : Number(arg('days') ?? 30);

// Product key → the human label used in the report. Keyed on `metadata.product`,
// which is the value that must never be renamed (Mike's n8n filter exact-matches
// it), so these keys are stable in a way a description string would not be.
const LABELS: Record<string, string> = {
  energy_clearing_ritual: 'Front-end reading',
  protection_ritual: 'Upsell 1 — Protection Ritual',
  manifestation_bracelet: 'Upsell 2 — Manifestation Bracelet',
};

interface Row {
  account: string;
  product: string;
  funnel: string;
  amount: number;
  id: string;
  created: number;
}

async function searchAccount(label: string, key: string | undefined): Promise<Row[]> {
  if (!key) return [];
  const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });

  // `created` is expressed in the query itself rather than filtered afterwards, so
  // a wide window does not page through the whole account.
  const clauses = [`metadata['src']:'recovery'`, `status:'succeeded'`];
  if (days !== null) {
    clauses.push(`created>${Math.floor(Date.now() / 1000) - days * 86_400}`);
  }
  const query = clauses.join(' AND ');

  const rows: Row[] = [];
  let page: string | undefined;
  do {
    const res = await stripe.paymentIntents.search({ query, limit: 100, page });
    for (const p of res.data) {
      rows.push({
        account: label,
        product: p.metadata?.product ?? 'unknown',
        funnel: p.metadata?.funnel ?? 'v1',
        amount: p.amount,
        id: p.id,
        created: p.created,
      });
    }
    page = res.has_more ? (res.next_page ?? undefined) : undefined;
  } while (page);

  return rows;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function main() {
  const keyA = process.env.STRIPE_SECRET_KEY;
  const keyB = process.env.STRIPE_SECRET_KEY_B;

  if (!keyA && !keyB) {
    console.error('No STRIPE_SECRET_KEY (or _B) in the environment.');
    process.exit(1);
  }

  const mode = (keyA ?? keyB ?? '').startsWith('sk_live_') ? 'LIVE' : 'TEST';
  const window = days === null ? 'all time' : `last ${days} days`;

  const rows = [
    ...(await searchAccount('A', keyA)),
    ...(await searchAccount('B', keyB)),
  ];

  console.log(`\nRecovery revenue — ${window}   [Stripe ${mode} mode]`);
  console.log(`Accounts queried: ${[keyA && 'A', keyB && 'B'].filter(Boolean).join(' + ') || 'none'}`);
  console.log('─'.repeat(64));

  if (rows.length === 0) {
    // Not an error. Before the marker shipped, and for any window predating it,
    // zero is the correct answer rather than a sign the query is broken.
    console.log('No payments carry metadata.src = "recovery" in this window.');
    console.log('Expected if the change has not reached this account/mode yet.\n');
    return;
  }

  let total = 0;
  for (const key of Object.keys(LABELS)) {
    const of = rows.filter((r) => r.product === key);
    if (of.length === 0) continue;
    const sum = of.reduce((n, r) => n + r.amount, 0);
    total += sum;
    console.log(`  ${LABELS[key].padEnd(36)} ${String(of.length).padStart(3)} × ${usd(sum / of.length).padStart(8)} = ${usd(sum).padStart(10)}`);
  }

  const unknown = rows.filter((r) => !(r.product in LABELS));
  if (unknown.length > 0) {
    const sum = unknown.reduce((n, r) => n + r.amount, 0);
    total += sum;
    console.log(`  ${'Other / unrecognised product'.padEnd(36)} ${String(unknown.length).padStart(3)} ${' '.repeat(11)} = ${usd(sum).padStart(10)}`);
  }

  console.log('─'.repeat(64));
  console.log(`  ${'TOTAL'.padEnd(36)} ${String(rows.length).padStart(3)} payments ${usd(total).padStart(12)}`);

  // Per-funnel split: which lander's recovery emails are actually earning.
  const funnels = [...new Set(rows.map((r) => r.funnel))].sort();
  if (funnels.length > 1) {
    console.log('\n  By funnel:');
    for (const f of funnels) {
      const of = rows.filter((r) => r.funnel === f);
      const sum = of.reduce((n, r) => n + r.amount, 0);
      console.log(`    ${f.padEnd(34)} ${String(of.length).padStart(3)} payments ${usd(sum).padStart(12)}`);
    }
  }
  console.log();
}

main().catch((e) => {
  console.error('Failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
