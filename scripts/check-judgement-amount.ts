// Checks parseAmountCents — what 03 Judgement Day reads out of the amount box.
//
//   npx tsx scripts/check-judgement-amount.ts
//
// Prints PASS/FAIL per case and a total; exits 1 on any FAIL. No server, no DB.
//
// ⚠ The bug this guards: every comma used to be stripped, so "12,5" (twelve
// fifty, typed on a European keyboard) charged $125. One comma before one or two
// digits is now a decimal mark; commas only count as thousands in groups of 3.

import { parseAmountCents } from '../client/src/lib/judgementAmount'

const LONG = '9'.repeat(400)

// [what she typed, cents expected (null = invalid, the box stays in its invalid state)]
const CASES: [string, number | null][] = [
  // Works today, must not move.
  ['40', 4000],
  ['40.00', 4000],
  ['$40', 4000],
  [' 40 ', 4000],
  ['40.5', 4050],
  ['1,000', 100000],
  ['1,000.50', 100050],
  ['12,345', 1234500],
  ['12,345,678', 1234567800],

  // Comma as the decimal mark.
  ['12,5', 1250],
  ['40,00', 4000],
  ['$25,99', 2599],

  // Commas that are neither — refused, never guessed at.
  ['1,0000', null],
  ['1,2,3', null],
  ['1.000,50', null],
  ['12,,5', null],

  // Not money.
  ['', null],
  ['abc', null],
  ['-5', null],
  ['12.345', null],
  [LONG, null],

  // Parses; the floor (JUDGEMENT_MIN_CENTS) is a separate check and refuses it.
  ['0', 0],
]

const show = (s: string) => (s.length > 24 ? `"${s.slice(0, 12)}…" (${s.length} chars)` : JSON.stringify(s))

let failed = 0
for (const [input, expected] of CASES) {
  const got = parseAmountCents(input)
  const ok = got === expected
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${show(input).padEnd(28)} → ${String(got).padEnd(12)} expected ${expected}`)
}

console.log(`\n${CASES.length - failed}/${CASES.length} passed${failed ? `, ${failed} FAILED` : ''}`)
process.exit(failed ? 1 : 0)
