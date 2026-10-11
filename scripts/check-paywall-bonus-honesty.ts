// PREVIEW ONLY — honesty check for the bonus-minute paywall packs (shared/paywall.ts).
// Every number a tile shows is a claim; this proves she always gets at least that.
//
//   npx tsx scripts/check-paywall-bonus-honesty.ts
//
// For every pack and every custom amount $10–$200 in $1 steps, on both screens:
//   A. floor(totalCoins / rate) >= shown total
//   B. bonusCoins >= shown free × rate
//   C. totals rise with price (actual coins strictly; shown whole minutes never fall)
//   D. price per minute never rises with price
// Exits 1 if A, B or C fail. D is reported separately: for custom amounts BETWEEN
// two packs it cannot hold under the "copy the bonus of the pack below" rule (the
// bonus is fixed while the price grows), so it is shown, not enforced.

import {
  buildBonusPreviewTiers,
  buildRepeatPreviewTiers,
  quoteCustomAmount,
  type BonusPreviewTier,
} from "../shared/paywall";
import { COINS_PER_MINUTE, CUSTOM_TOPUP_MAX_USD, coinsToClock } from "../shared/types";

const rate = COINS_PER_MINUTE;
let hardFails = 0;

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
        ((r.priceCents * rate) / r.totalCoins).toFixed(1).padStart(12),
      ].join(" | "),
    );
  }

  const custom: Row[] = [];
  for (let d = 10; d <= CUSTOM_TOPUP_MAX_USD; d++) {
    const q = quoteCustomAmount(d * 100, tiers, rate);
    custom.push({
      label: `custom $${d}`,
      priceCents: d * 100,
      coins: q.coins,
      bonusCoins: q.bonusCoins,
      totalCoins: q.totalCoins,
      freeShown: q.freeMinutesShown,
      totalShown: q.totalMinutesShown,
    });
  }

  const fails = { A: [] as string[], B: [] as string[], C: [] as string[], D: [] as string[] };
  for (const r of [...packs, ...custom]) {
    if (Math.floor(r.totalCoins / rate) < r.totalShown) fails.A.push(`${r.label}: ${Math.floor(r.totalCoins / rate)} < ${r.totalShown}`);
    if (r.bonusCoins < r.freeShown * rate) fails.B.push(`${r.label}: ${r.bonusCoins} < ${r.freeShown * rate}`);
  }
  // C/D across packs alone, then across packs + custom merged by price.
  const seqCheck = (rows: Row[], tag: string) => {
    const sorted = [...rows].sort((a, b) => a.priceCents - b.priceCents || a.label.localeCompare(b.label));
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1];
      const b = sorted[i];
      if (b.priceCents === a.priceCents) {
        if (b.totalCoins !== a.totalCoins || b.totalShown !== a.totalShown) fails.C.push(`${tag} ${a.label} vs ${b.label}: same price, different minutes`);
        continue;
      }
      if (b.totalCoins <= a.totalCoins) fails.C.push(`${tag} ${a.label}→${b.label}: actual total did not rise`);
      if (b.totalShown < a.totalShown) fails.C.push(`${tag} ${a.label}→${b.label}: shown total fell`);
      const pa = a.priceCents / a.totalCoins;
      const pb = b.priceCents / b.totalCoins;
      if (pb > pa + 1e-12) fails.D.push(`${tag} ${a.label}→${b.label}: ${(pa * rate).toFixed(1)}→${(pb * rate).toFixed(1)}¢/min`);
    }
  };
  seqCheck(packs, "[packs]");
  const packStrict = packs.every((r, i) => i === 0 || r.totalShown > packs[i - 1].totalShown);
  const packDFails = fails.D.length;
  seqCheck([...packs, ...custom], "[packs+custom]");

  console.log(`\nChecked ${packs.length} packs + ${custom.length} custom amounts ($10–$${CUSTOM_TOPUP_MAX_USD}).`);
  console.log(`A. floor(total/rate) >= shown total ............ ${fails.A.length ? "FAIL" : "PASS"}`);
  fails.A.slice(0, 5).forEach((f) => console.log("   " + f));
  console.log(`B. bonus coins >= shown free × rate ............ ${fails.B.length ? "FAIL" : "PASS"}`);
  fails.B.slice(0, 5).forEach((f) => console.log("   " + f));
  console.log(`C. totals rise with price (actual strictly, shown never falls; packs' shown strictly: ${packStrict ? "yes" : "NO"}) ... ${fails.C.length || !packStrict ? "FAIL" : "PASS"}`);
  fails.C.slice(0, 5).forEach((f) => console.log("   " + f));
  console.log(`D. ¢/min never rises with price — packs only ..... ${packDFails ? "FAIL" : "PASS"}`);
  const customD = fails.D.length - packDFails;
  console.log(`D. ¢/min never rises with price — packs+custom ... ${customD ? `NOT MET at ${customD} steps (expected; see note)` : "PASS"}`);
  if (customD) {
    // The worst custom ¢/min inside each band between two packs.
    const bands = new Map<string, Row>();
    for (const r of custom) {
      const base = [...packs].filter((p) => p.priceCents <= r.priceCents).pop()!;
      const worst = bands.get(base.label);
      if (!worst || r.priceCents / r.totalCoins > worst.priceCents / worst.totalCoins) bands.set(base.label, r);
    }
    for (const [base, r] of bands) {
      console.log(
        `   band from the ${base} pack: worst = ${r.label} at ${((r.priceCents * rate) / r.totalCoins).toFixed(1)}¢/min ` +
          `(${r.totalShown} min) — never above the flat ${rate}¢/min: ${(r.priceCents * rate) / r.totalCoins <= rate + 1e-9 ? "yes" : "NO"}`,
      );
    }
  }
  const above = custom.filter((r) => (r.priceCents * rate) / r.totalCoins > rate + 1e-9);
  console.log(`   custom ever worse than the flat ${rate}¢/min rate: ${above.length ? "YES — " + above.map((r) => r.label).join(", ") : "no"}`);
  console.log(`   samples: ${[20, 40, 49, 60, 99, 100, 200]
    .map((d) => custom.find((r) => r.priceCents === d * 100)!)
    .map((r) => `${r.label}=${coinsToClock(r.totalCoins, rate)}→"${r.freeShown ? `+${r.freeShown} FREE, ` : ""}${r.totalShown} min"`)
    .join(" · ")}`);

  hardFails += fails.A.length + fails.B.length + fails.C.length + (packStrict ? 0 : 1) + packDFails;
}

check("FIRST-TIMER (LongCopyPaywall)", buildBonusPreviewTiers(rate));
check("REPEAT BUYER (RepeatBuyerPaywall)", buildRepeatPreviewTiers(rate));

console.log(`\n${hardFails ? `HARD FAILURES: ${hardFails}` : "ALL HARD CHECKS PASS"}`);
process.exit(hardFails ? 1 : 0);
