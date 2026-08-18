#!/usr/bin/env node
// audit-copy — READABILITY of every written /fb-tarot read, as a PASS/FAIL checklist.
//
// The sibling scripts here ask "does the funnel WORK". This one asks "can she READ it",
// which nothing checked until 2026-08-18 — the day a line saying "the card that takes a
// question by the ankles and shows you its underside" was found live, aimed at a 55+
// audience on phones. Getting one lander clean afterwards took four rounds of operator
// review. These rules are those four rounds, so the next seventy-five landers cost one.
//
// Shares its rule set with scripts/check-read.mjs (the drafting tool) by importing it, so
// the gate a writer runs and the gate the audit runs can never drift apart.
//
// Needs no browser, no server and no database — it reads the registry. Safe anywhere.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs             # report the whole deck
//   node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --hook X    # gate ONE lander (exit 1 on any problem)
//   node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --strict    # fail if ANY lander fails
//   node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --worst 15  # the migration queue

import { checkBubble, checkEcho, RULES } from '../../../../scripts/check-read.mjs'

const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const has = (n) => argv.includes(n)

const { DECKS, HEADLINES, openerB } = await import('../../../../client/src/content/tarotReads.ts')

const only = arg('--hook')
const rows = []

for (const [deck, cfg] of Object.entries(DECKS)) {
  for (const hook of Object.keys(cfg.reads)) {
    if (only && hook !== only) continue
    for (const card of Object.keys(cfg.reads[hook])) {
      // openerB is what Version B actually sends; the name-capture line is shared
      // boilerplate, not part of the read, so it is excluded from the score.
      const bubbles = openerB(deck, hook, card).slice(0, -1)
      const problems = [
        ...checkEcho(bubbles, HEADLINES[hook]),
        ...bubbles.flatMap((b, i) => checkBubble(b, i, HEADLINES[hook])),
      ]
      rows.push({ deck, hook, card, problems, bubbles })
    }
  }
}

if (!rows.length) { console.error(`no reads found${only ? ` for ${only}` : ''}`); process.exit(2) }

// ── per-lander roll-up ──────────────────────────────────────────────────────
const landers = new Map()
for (const r of rows) {
  const k = `${r.deck}/${r.hook}`
  const cur = landers.get(k) ?? { problems: 0, cards: 0 }
  landers.set(k, { problems: cur.problems + r.problems.length, cards: cur.cards + 1 })
}
const clean = [...landers.values()].filter((l) => l.problems === 0).length

console.log(`\n${'═'.repeat(78)}\nCOPY READABILITY — ${landers.size} landers, ${rows.length} card reads`)
console.log(`rules: ≤${RULES.MAX_WORDS} words · ≤${RULES.MAX_SENTENCES} sentences · grade ≤${RULES.MAX_GRADE} · ≤${RULES.MAX_SYLLABLES} syllables · ≤${RULES.MAX_NEGATIVES} negatives\n`)

if (only) {
  // Single-lander gate: print every problem, exit non-zero on any.
  for (const r of rows) {
    console.log(`  ${r.problems.length ? '✗' : '✓'} ${r.deck} / card ${r.card}`)
    for (const p of r.problems) console.log(`      └─ ${p}`)
  }
  const total = rows.reduce((a, r) => a + r.problems.length, 0)
  console.log(`\n  ${total === 0 ? `✓ PASS — ${only} is clean. Read it aloud before shipping.` : `✗ FAIL — ${total} problems in ${only}`}`)
  process.exit(total === 0 ? 0 : 1)
}

// ── whole-deck report ───────────────────────────────────────────────────────
const worst = [...landers.entries()].sort((a, b) => b[1].problems - a[1].problems)
const n = Number(arg('--worst') ?? 12)
console.log(`  CLEAN: ${clean}/${landers.size} landers  (${(clean / landers.size * 100).toFixed(0)}%)\n`)
console.log(`  worst ${Math.min(n, worst.length)} — the migration queue:`)
for (const [k, v] of worst.slice(0, n)) {
  if (!v.problems) break
  console.log(`    ${String(v.problems).padStart(4)} problems   ${k}`)
}

// Which rule is doing the most damage tells you what to fix first.
const byRule = {}
for (const r of rows) for (const p of r.problems) {
  const key = /^\d+ words/.test(p) ? 'bubble over word limit'
    : /sentences —/.test(p) ? 'more than one idea per bubble'
    : /reading grade/.test(p) ? 'reading grade too high'
    : /long words:/.test(p) ? 'four-syllable words'
    : /negatives/.test(p) ? 'stacked negatives'
    : /no echo of the ad/.test(p) ? 'no echo of the ad'
    : 'banned construction'
  byRule[key] = (byRule[key] ?? 0) + 1
}
console.log(`\n  by rule:`)
for (const [k, v] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(5)}  ${k}`)

const failed = landers.size - clean
console.log(`\n${'═'.repeat(78)}`)
if (has('--strict')) {
  console.log(failed === 0 ? '✓ PASS — every lander is readable' : `✗ FAIL — ${failed} landers below the bar`)
  process.exit(failed === 0 ? 0 : 1)
}
console.log(`REPORT ONLY — ${failed} landers below the bar. Gate a single lander with --hook, or --strict once migrated.`)
