// PREVIEW ONLY — honesty check for the bonus-minute paywall packs (shared/paywall.ts).
// Every number a tile shows is a claim; this proves she always gets at least that,
// and that a bigger spend never buys a worse price per minute.
//
//   npx tsx scripts/check-paywall-bonus-honesty.ts
//
// Custom rule (operator-approved): a custom amount gets the SAME price per minute as
// the biggest pack at or below it on the FULL five-pack ladder (CUSTOM_RATE_LADDER),
// whichever screen she is on — see quoteCustomAmount.
//
// For every pack and every custom amount $10–$200 in $1 steps, on both screens:
//   A. floor(totalCoins / rate) >= shown total
//   B. bonusCoins >= shown free × rate
//   C. totals rise with price (actual coins strictly; shown whole minutes never fall;
//      the packs' shown totals strictly)
//   D. price per minute never rises with price. Coins are whole, so every quote is
//      rounded DOWN to a whole coin; D allows exactly that and nothing more: the
//      dearer amount must get at least floor(its price × the cheaper amount's coins
//      per cent). The raw per-coin wiggle that rounding leaves is printed, not enforced
//      (under one coin = under 0.2 s). The old "copy the pack's bonus" rule fails D.
//   E. custom at exactly a pack's price equals that pack (coins + both claims), for
//      all five packs on both screens — so a first-timer typing $100 gets 70 min
//   F. both screens quote every custom amount identically
//   G. the operator's approved table (her view at 299¢/min)
// Plus: A–D re-run for every CENT from $10.00 to $200.00 (the field takes cents).
// Exits 1 on any failure.

import {
  CUSTOM_RATE_LADDER,
  buildBonusPreviewTiers,
  buildBonusTiers,
  buildRepeatPreviewTiers,
  quoteCustomAmount,
  type BonusPreviewTier,
} from "../shared/paywall";
import { COINS_PER_MINUTE, CUSTOM_TOPUP_MAX_USD, coinsToClock } from "../shared/types";

const rate = COINS_PER_MINUTE;
const FULL_LADDER = buildBonusTiers(CUSTOM_RATE_LADDER, rate);
let hardFails = 0;

/** Operator-approved: typed dollars → [shown free, shown total] at 299¢/min. */
const APPROVED: [number, number, number][] = [
  [15, 0, 5],
  [25, 2, 11],
  [40, 6, 20],
  [45, 7, 22],
  [60, 15, 36],
  [75, 19, 45],
  [99, 26, 59],
  [150, 54, 105],
  [200, 73, 140],
];

interface Row {
  label: string;
  priceCents: number;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  freeShown: number;
  totalShown: number;
}

function packRow(t: BonusPreviewTier): Row {
  return {
    label: `$${t.priceUsd / 100}`,
    priceCents: t.priceUsd,
    coins: t.coins,
    bonusCoins: t.bonusCoins,
    totalCoins: t.totalCoins,
    freeShown: t.freeMinutesShown,
    totalShown: t.totalMinutesShown,
  };
}

/** Exactly what both paywalls call: quoteCustomAmount(cents, coinsPerMinute). */
function customRow(cents: number): Row {
  const q = quoteCustomAmount(cents, rate);
  return {
    label: `custom $${Number.isInteger(cents / 100) ? cents / 100 : (cents / 100).toFixed(2)}`,
    priceCents: cents,
    coins: q.coins,
    bonusCoins: q.bonusCoins,
    totalCoins: q.totalCoins,
    freeShown: q.freeMinutesShown,
    totalShown: q.totalMinutesShown,
  };
}

const shown = (r: Row) => (r.freeShown ? `+${r.freeShown} min FREE · ${r.totalShown} min total` : `${r.totalShown} min`);
const centsPerMin = (r: Row) => (r.priceCents * rate) / r.totalCoins;

/** A–D over a set of rows. Returns failure lists + the raw rounding wiggle. */
function checkRows(rows: Row[]) {
  const f = { A: [] as string[], B: [] as string[], C: [] as string[], D: [] as string[] };
  let wiggleSteps = 0;
  let wiggleMax = 0;
  for (const r of rows) {
    if (Math.floor(r.totalCoins / rate) < r.totalShown) f.A.push(`${r.label}: ${Math.floor(r.totalCoins / rate)} < ${r.totalShown}`);
    if (r.bonusCoins < r.freeShown * rate) f.B.push(`${r.label}: ${r.bonusCoins} < ${r.freeShown * rate}`);
  }
  const sorted = [...rows].sort((a, b) => a.priceCents - b.priceCents || a.label.localeCompare(b.label));
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (b.priceCents === a.priceCents) {
      if (b.totalCoins !== a.totalCoins || b.totalShown !== a.totalShown || b.freeShown !== a.freeShown)
        f.C.push(`${a.label} vs ${b.label}: same price, different minutes`);
      continue;
    }
    if (b.totalCoins <= a.totalCoins) f.C.push(`${a.label}→${b.label}: actual total did not rise`);
    if (b.totalShown < a.totalShown) f.C.push(`${a.label}→${b.label}: shown total fell`);
    const floorAtARate = Math.floor((b.priceCents * a.totalCoins) / a.priceCents);
    if (b.totalCoins < floorAtARate)
      f.D.push(`${a.label}→${b.label}: ${centsPerMin(a).toFixed(1)}→${centsPerMin(b).toFixed(1)}¢/min (${b.totalCoins} < ${floorAtARate} coins)`);
    const rise = centsPerMin(b) - centsPerMin(a);
    if (rise > 1e-9) {
      wiggleSteps++;
      wiggleMax = Math.max(wiggleMax, rise);
    }
  }
  return { f, wiggleSteps, wiggleMax };
}

const pf = (n: number) => (n ? "FAIL" : "PASS");
const customByScreen = new Map<string, Row[]>();

function check(screen: string, tiers: BonusPreviewTier[]) {
  console.log(`\n=== ${screen} (rate ${rate}¢/min) ===`);
  console.log("price | coins | bonus coins (clock) | actual total | shown free | shown total | ¢/shown min | ¢/actual min");
  const packs = tiers.map(packRow);
  for (const r of packs) {
    console.log(
      [
        r.label.padEnd(5),
        String(r.coins).padStart(5),
        `${String(r.bonusCoins).padStart(5)} (${coinsToClock(r.bonusCoins, rate)})`.padEnd(19),
        coinsToClock(r.totalCoins, rate).padStart(12),
        (r.freeShown ? `+${r.freeShown} min FREE` : "—").padStart(10),
        `${r.totalShown} min`.padStart(11),
        (r.priceCents / r.totalShown).toFixed(1).padStart(11),
        centsPerMin(r).toFixed(1).padStart(12),
      ].join(" | "),
    );
  }

  const custom: Row[] = [];
  for (let d = 10; d <= CUSTOM_TOPUP_MAX_USD; d++) custom.push(customRow(d * 100));
  customByScreen.set(screen, custom);

  // A–D: packs alone (C also needs the packs' shown totals strictly rising), then
  // packs + custom merged by price.
  const packOnly = checkRows(packs);
  const packStrict = packs.every((r, i) => i === 0 || r.totalShown > packs[i - 1].totalShown);
  const merged = checkRows([...packs, ...custom]);
  const A = [...packOnly.f.A, ...merged.f.A];
  const B = [...packOnly.f.B, ...merged.f.B];
  const C = [...packOnly.f.C, ...merged.f.C];
  const D = [...packOnly.f.D, ...merged.f.D];

  // E: custom at every pack price on the FULL ladder equals that pack.
  const E: string[] = [];
  for (const p of FULL_LADDER.map(packRow)) {
    const c = customRow(p.priceCents);
    const same =
      c.coins === p.coins &&
      c.bonusCoins === p.bonusCoins &&
      c.totalCoins === p.totalCoins &&
      c.freeShown === p.freeShown &&
      c.totalShown === p.totalShown;
    if (!same) E.push(`custom ${p.label} = "${shown(c)}" (${c.totalCoins}) but the ${p.label} pack = "${shown(p)}" (${p.totalCoins})`);
  }
  // …and this screen's own tiles agree with the full ladder at the same price.
  for (const p of packs) {
    const full = FULL_LADDER.find((t) => t.priceUsd === p.priceCents);
    if (!full || full.totalCoins !== p.totalCoins || full.freeMinutesShown !== p.freeShown || full.totalMinutesShown !== p.totalShown)
      E.push(`${p.label} tile on this screen differs from the full ladder's ${p.label} pack`);
  }

  // G: the approved table.
  const G: string[] = [];
  for (const [d, free, total] of APPROVED) {
    const c = custom.find((r) => r.priceCents === d * 100)!;
    if (c.freeShown !== free || c.totalShown !== total) G.push(`$${d}: got "${shown(c)}", approved +${free} · ${total}`);
  }

  console.log(`\nChecked ${packs.length} packs + ${custom.length} custom amounts ($10–$${CUSTOM_TOPUP_MAX_USD}, $1 steps).`);
  console.log(`A. shown total <= actual (floor(total/rate)) ............ ${pf(A.length)}`);
  A.slice(0, 5).forEach((x) => console.log("   " + x));
  console.log(`B. shown free <= actual bonus (bonus >= free × rate) .... ${pf(B.length)}`);
  B.slice(0, 5).forEach((x) => console.log("   " + x));
  console.log(`C. totals rise (actual strictly, shown never falls, packs strictly: ${packStrict ? "yes" : "NO"}) ... ${pf(C.length + (packStrict ? 0 : 1))}`);
  C.slice(0, 5).forEach((x) => console.log("   " + x));
  console.log(`D. price per minute never rises (packs + custom) ........ ${pf(D.length)}`);
  D.slice(0, 5).forEach((x) => console.log("   " + x));
  console.log(
    `   raw rounding wiggle (not enforced): ${merged.wiggleSteps} of ${packs.length + custom.length - 1} steps rise, ` +
      `worst +${merged.wiggleMax.toFixed(3)}¢/min — each from rounding down under one coin`,
  );
  console.log(`E. custom at a pack price = that pack (all 5 packs) ...... ${pf(E.length)}`);
  E.slice(0, 5).forEach((x) => console.log("   " + x));
  console.log(`G. operator's approved table ............................ ${pf(G.length)}`);
  G.slice(0, 9).forEach((x) => console.log("   " + x));
  const above = custom.filter((r) => centsPerMin(r) > rate + 1e-9);
  console.log(`   custom ever worse than the flat ${rate}¢/min rate: ${above.length ? "YES — " + above.map((r) => r.label).join(", ") : "no"}`);
  console.log("   her view:");
  for (const d of [10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 99, 100, 150, 200]) {
    const r = custom.find((x) => x.priceCents === d * 100)!;
    console.log(`     $${String(d).padEnd(4)} ${shown(r).padEnd(30)} actual ${coinsToClock(r.totalCoins, rate).padStart(6)} · ${centsPerMin(r).toFixed(1)}¢/min`);
  }

  hardFails += A.length + B.length + C.length + (packStrict ? 0 : 1) + D.length + E.length + G.length;
}

check("FIRST-TIMER (LongCopyPaywall)", buildBonusPreviewTiers(rate));
check("REPEAT BUYER (RepeatBuyerPaywall)", buildRepeatPreviewTiers(rate));

// F: both screens, every custom amount, identical.
const [first, repeat] = [...customByScreen.values()];
const F = first.filter((r, i) => {
  const o = repeat[i];
  return r.priceCents !== o.priceCents || r.totalCoins !== o.totalCoins || r.bonusCoins !== o.bonusCoins || r.freeShown !== o.freeShown || r.totalShown !== o.totalShown;
});
console.log(`\nF. both screens quote every custom amount identically ($10–$${CUSTOM_TOPUP_MAX_USD}) ... ${pf(F.length)}`);
F.slice(0, 5).forEach((r) => console.log(`   ${r.label} differs`));
hardFails += F.length;

// A–D again at cent resolution (she can type 99.99): custom only, then with the full ladder.
const everyCent: Row[] = [];
for (let c = 1000; c <= CUSTOM_TOPUP_MAX_USD * 100; c++) everyCent.push(customRow(c));
const cent = checkRows([...FULL_LADDER.map(packRow), ...everyCent]);
const centFails = cent.f.A.length + cent.f.B.length + cent.f.C.length + cent.f.D.length;
console.log(
  `   every cent $10.00–$${CUSTOM_TOPUP_MAX_USD}.00 (${everyCent.length} amounts + 5 packs): ` +
    `A ${pf(cent.f.A.length)} · B ${pf(cent.f.B.length)} · C ${pf(cent.f.C.length)} · D ${pf(cent.f.D.length)}`,
);
[...cent.f.A, ...cent.f.B, ...cent.f.C, ...cent.f.D].slice(0, 5).forEach((x) => console.log("   " + x));
hardFails += centFails;

console.log(`\n${hardFails ? `HARD FAILURES: ${hardFails}` : "ALL HARD CHECKS PASS"}`);
process.exit(hardFails ? 1 : 0);
