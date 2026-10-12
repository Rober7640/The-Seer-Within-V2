#!/usr/bin/env npx tsx
// check-parse-dollar-input — proves the paywall's Custom Amount parser.
//
//   npx tsx scripts/check-parse-dollar-input.ts
//
// Each case is what she types (or pastes) into the field. "shows" is what the
// field displays after the keystroke filter; cents/invalid are what the paywall
// would charge. Exits non-zero on any mismatch.

import { cleanDollarInput, parseDollarInput } from "../client/src/lib/parseDollarInput";

type Case = { input: string; shows: string; cents: number; invalid: boolean; why: string };

const cases: Case[] = [
  { input: "12,5", shows: "12,5", cents: 1250, invalid: false, why: "comma decimal = $12.50, not $125" },
  { input: "12.5", shows: "12.5", cents: 1250, invalid: false, why: "dot decimal = $12.50" },
  { input: "25", shows: "25", cents: 2500, invalid: false, why: "whole dollars" },
  { input: "030", shows: "030", cents: 3000, invalid: false, why: "leading zero = $30" },
  { input: "0", shows: "0", cents: 0, invalid: false, why: "zero (below the floor, Continue stays off)" },
  { input: "1.000,00", shows: "1.000,00", cents: 0, invalid: true, why: "two separators: can't tell the decimal point" },
  { input: "$1,000.00", shows: "1,000.00", cents: 0, invalid: true, why: "$ dropped; two separators remain" },
  { input: "12,345", shows: "12,345", cents: 0, invalid: true, why: "3 decimals refused, never $12.34" },
  { input: "abc", shows: "", cents: 0, invalid: false, why: "letters can't be typed; field stays empty" },
  { input: "-5", shows: "5", cents: 500, invalid: false, why: "minus can't be typed; field shows 5 (below the $10 floor)" },
  // Extra edges.
  { input: "12,50", shows: "12,50", cents: 1250, invalid: false, why: "two comma decimals" },
  { input: "19.99", shows: "19.99", cents: 1999, invalid: false, why: "no float drift (19.99 stays 1999)" },
  { input: "12,", shows: "12,", cents: 1200, invalid: false, why: "mid-typing: trailing comma" },
  { input: ",5", shows: ",5", cents: 50, invalid: false, why: "no whole part" },
  { input: "", shows: "", cents: 0, invalid: false, why: "empty" },
  { input: " 25 ", shows: "25", cents: 2500, invalid: false, why: "spaces dropped" },
  { input: "12.345", shows: "12.345", cents: 0, invalid: true, why: "3 decimals with a dot too" },
  { input: "200,01", shows: "200,01", cents: 20001, invalid: false, why: "just over the $200 max (the paywall blocks it)" },
  { input: "9".repeat(20), shows: "9".repeat(20), cents: 0, invalid: true, why: "absurdly long paste" },
];

let failures = 0;
for (const c of cases) {
  const shows = cleanDollarInput(c.input);
  const got = parseDollarInput(c.input);
  const ok = shows === c.shows && got.cents === c.cents && got.invalid === c.invalid;
  if (!ok) failures++;
  const result = got.invalid ? "INVALID" : `$${(got.cents / 100).toFixed(2)}`;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${JSON.stringify(c.input).padEnd(24)} shows ${JSON.stringify(shows).padEnd(12)} -> ${result.padEnd(9)} ${c.why}` +
      (ok ? "" : `   (wanted shows ${JSON.stringify(c.shows)}, cents ${c.cents}, invalid ${c.invalid})`),
  );
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
process.exit(failures ? 1 : 0);
