// Verify the 22 QUESTIONABLE buyer rows in the v1_order_bump_2026 cohort against
// STRIPE — the authoritative source for "paid". These are rows the tally counts as
// buyers (purchased AND upsell_offered) but whose main_paid_at is NULL or predates
// their exposure.
//
// READ-ONLY: only checkout.sessions.retrieve. No writes, no charges, $0.
//
// For each session we want two facts:
//   payment_status  — was it actually paid?
//   created         — was the session opened DURING the test, or is it a leftover
//                     from an earlier purchase that the tally is re-counting?
//
// Verdicts:
//   PHANTOM   paid, but the session was created before the experiment started
//             ⇒ an old purchase being counted as an in-test conversion
//   REAL      paid, session created in-window ⇒ a genuine buyer whose main_paid_at
//             failed to stamp (a webhook problem, separate from the tally bug)
//   ABANDONED not paid ⇒ never a conversion in either arm
import Stripe from 'stripe';
import fs from 'node:fs';

// Experiment start (cohort anchor), UTC.
const STARTED_AT = Date.parse('2026-08-05T06:15:31Z');

// LAST sk_live in .env wins — the file carries an sk_test line too, and every
// session below is cs_live_, which only resolves against a live key.
const keys = [...fs.readFileSync('.env', 'utf8')
  .matchAll(/^\s*STRIPE_SECRET_KEY\s*=\s*(sk_live_[A-Za-z0-9_]+)\s*$/gm)]
  .map((m) => m[1]);
if (!keys.length) { console.error('No live STRIPE_SECRET_KEY in .env'); process.exit(1); }
const stripe = new Stripe(keys[keys.length - 1]);

// variant | category | exposed_at | row_created | session
const ROWS = [
  ['A', 'nostamp', '08-05 14:35', '06-15', 'cs_live_a1Pv63FC0WYuEASrcQxC5gDM9pUHUWnYv0HgbFywhnxlUzvpE7HH6a8ikl'],
  ['A', 'nostamp', '08-05 17:05', '04-20', 'cs_live_a1AwP6IrxxBVS9uoyEt4ONi7AXUikyle2aCzs4CuV4gCs9l5qvjwPAVGHz'],
  ['A', 'nostamp', '08-05 17:30', '08-05', 'cs_live_a1WrS74CFMMEPzf8BQQQh0JQG9ETaZLcChLPrGuChnTsM86NzBoOrjW6Vl'],
  ['A', 'nostamp', '08-05 18:37', '06-27', 'cs_live_a19TCn4F9KJ1vRptUNJGWDW0ZafDGwx8Eyt3uQifaeoHPWrmSbA4iVHLm7'],
  ['A', 'nostamp', '08-05 20:53', '02-07', 'cs_live_a1qSqiEeVNHv7ySe65eIarWWd7edyL77SzVtJ2wCkT97IdHZXTmdKjcA7q'],
  ['A', 'nostamp', '08-05 21:57', '06-14', 'cs_live_a1DdTsoP51BVdoLLqvM9yFUEfVjNrNDEOiZrTb5qXiLJElqkP60pjdQ3as'],
  ['A', 'nostamp', '08-05 22:50', '07-22', 'cs_live_a11Pr3tTp08lsWQTkk207ZeJsDCEQqOBJKDuKCE9zifmftTv2HXUEJTgFI'],
  ['A', 'nostamp', '08-06 00:23', '08-04', 'cs_live_a1erz5QpSZeurEHPB3WLFA9IZahnkEYMICOMXLaC33vsXaTRB94JCsv0Tj'],
  ['A', 'nostamp', '08-06 00:32', '04-15', 'cs_live_a191GwooNaCyw5qVucsaS8Zc3YxFvCNhfcStHmuHzz4Or3ZBuWZefJrwMd'],
  ['A', 'nostamp', '08-06 00:58', '07-11', 'cs_live_a1crWYTvWdQ0bLZnUIGNnjEy4d4B7mNqmdO3AmS4Tyjpw5Yqg79QFZxtRZ'],
  ['A', 'nostamp', '08-06 01:52', '07-06', 'cs_live_a1CdX4RsTCs6vonF0pW86rH5XzfkAwR9JOsOFhAvNfT9Qc6zx2xzUxR76A'],
  ['A', 'preexp',  '08-05 13:57', '08-04', 'cs_live_a1PIaOLSzkwNxXG2DJQmkkgYjfWIiK2WRPJ5RJLxv3OjQz998enbLT7PGo'],
  ['A', 'preexp',  '08-06 00:58', '08-02', 'cs_live_a11W33avUxqqzWJfgns7y2S4Ldq0ongwuTasClSgsw3TkCe1x6WfejIdUX'],
  ['A', 'preexp',  '08-06 01:18', '08-04', 'cs_live_a1Bwmpmw5645eg7iomrdtc3R7cy8udG1v3VlkEJPlIPUJUISFgmgu6EEdm'],
  ['B', 'nostamp', '08-05 11:37', '02-01', 'cs_live_a1D3m9gz7lQrbH9OH9wxNnV5KlVHMfShrrM7vGarJwwBLcjk8tkCF0Kmaa'],
  ['B', 'nostamp', '08-05 17:04', '04-24', 'cs_live_a115u8NfEopApQFXlGP5b5PR9Ubhb2RtcIVx48s6MtFeoh4Zl57wIxm9NR'],
  ['B', 'nostamp', '08-05 18:18', '04-27', 'cs_live_b1Awo0G8bTGEg6TMtUcOUZgJzDgMsDUmvKBnDvXi1QIztfO0Xr5V4q4bwh'],
  ['B', 'nostamp', '08-05 21:15', '04-27', 'cs_live_a1hOKz0N6bgLUZEdZcv1lc21GTY3wxWiiy2Y1E0uMtCsJRct8linwAhcKP'],
  ['B', 'nostamp', '08-05 21:16', '06-02', 'cs_live_a1sv8qkHwQBik1rEODwvmY967D6lLI2TnvXUZIb41tl3NtmJ1zcWdCnmgx'],
  ['B', 'nostamp', '08-05 21:22', '06-29', 'cs_live_a1tHo8NxyTj36aB0qJ4NQFmZZkcP8H9JuRpmLCdYpYqLFgd7UM5nPmuCos'],
  ['B', 'nostamp', '08-06 00:57', '05-02', 'cs_live_a1i8cDHJv9cOsWbPfaKFGd3ljAy8yi7VebKfVxYOuUCMpPtk4mGtM30McT'],
  ['B', 'preexp',  '08-05 23:16', '08-02', 'cs_live_a1tgXjnL9hrSVJnHXrXvYU1VOEaor0Lxza1J9D8TUtSxqG4ZCNgdpxrfsF'],
];

const fmt = (unix) => new Date(unix * 1000).toISOString().slice(5, 16).replace('T', ' ');
const tally = { PHANTOM: 0, REAL: 0, ABANDONED: 0, ERROR: 0 };
const byArm = { A: { PHANTOM: 0, REAL: 0, ABANDONED: 0, ERROR: 0 },
                B: { PHANTOM: 0, REAL: 0, ABANDONED: 0, ERROR: 0 } };

console.log('arm cat      exposed      row    session created  paid?      total  lines  VERDICT');
console.log('─'.repeat(92));

for (const [arm, cat, exposed, rowCreated, id] of ROWS) {
  let verdict, created = '—', paid = '—', total = '—', lines = '—';
  try {
    const s = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
    created = fmt(s.created);
    paid = s.payment_status;
    total = s.amount_total != null ? '$' + (s.amount_total / 100).toFixed(2) : '—';
    lines = String(s.line_items?.data?.length ?? '?');
    if (s.payment_status !== 'paid') verdict = 'ABANDONED';
    else if (s.created * 1000 < STARTED_AT) verdict = 'PHANTOM';
    else verdict = 'REAL';
  } catch (e) {
    verdict = 'ERROR';
    paid = (e?.raw?.code || e?.code || 'err').slice(0, 22);
  }
  tally[verdict]++; byArm[arm][verdict]++;
  console.log(
    `${arm}   ${cat.padEnd(8)} ${exposed}  ${rowCreated}  ${created.padEnd(14)} ` +
    `${String(paid).padEnd(10)} ${String(total).padStart(7)} ${String(lines).padStart(5)}  ${verdict}`);
}

console.log('\n' + '─'.repeat(92));
console.log(`TOTAL   phantom ${tally.PHANTOM}   real ${tally.REAL}   abandoned ${tally.ABANDONED}   error ${tally.ERROR}`);
for (const arm of ['A', 'B']) {
  const b = byArm[arm];
  console.log(`  arm ${arm}: phantom ${b.PHANTOM}, real ${b.REAL}, abandoned ${b.ABANDONED}, error ${b.ERROR}`);
}
console.log('\nPHANTOM + ABANDONED must come OUT of the buyer count in their arm.');
console.log('REAL stays in — but its NULL main_paid_at is a webhook gap worth its own fix.');
