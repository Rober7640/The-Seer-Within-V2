#!/usr/bin/env node
// guard-tripwire-commit-vocab — prove the commit-vocab guards actually BITE.
//
//   node scripts/guard-tripwire-commit-vocab.mjs
//   node scripts/guard-tripwire-commit-vocab.mjs --case HER-FAULT
//
// WHY A FAMILY-SPECIFIC ONE. scripts/guard-tripwire.mjs injects into per-hook draft JSON under
// fb-tarot/docs/drafts/rewrites/ and expects tests/tarot-<family>-copy.test.ts. This family is
// authored as MANUSCRIPTS (the shape Joel's 44-lander batch used), so the injection target and
// the test filename are both different. The principle is identical and so is the safety rule.
//
// 🔴 RESTORE IS UNCONDITIONAL — try/finally plus signal handlers. An aborted run must never
// leave a poisoned manuscript on disk. Never `git checkout` to undo: that would also discard
// unrelated edits in the working tree.
//
// ⚠ EACH VIOLATION TRIPS EXACTLY ONE PATTERN. A case that trips several only proves that AT
// LEAST ONE of them works, and it keeps passing while the others rot.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const NAT = 'fb-tarot/docs/writeups/natural/REVIEW-commit-vocab-2026-08-27.md'
const SHA = 'fb-tarot/docs/writeups/shadow/REVIEW-commit-vocab-2026-08-27.md'
const TEST = 'tests/tarot-commit-vocab-manuscripts.test.ts'

// [label, file, findExactly, replaceWith, whichGuardShouldCatchIt]
const CATALOGUE = [
  ['HER-FAULT', NAT, "What you want isn't the excess here, dear.", 'You want too much here, dear.', 'commitment ban: too much'],
  ['NEVER-WILL', NAT, 'You didn\'t get the timing wrong.', 'He will never commit, dear.', 'commitment ban: never commit'],
  ['DATED', NAT, 'Looking ahead isn\'t the fault here.', 'This settles in a few weeks.', 'commitment ban: dated prediction'],
  ['GOOD-ENOUGH', NAT, "You're not the missing piece here.", 'You are good enough for him.', 'commitment ban: good enough'],

  ['OTHER-WOMAN', NAT, 'What you carried was real, dear. It was simply never named.', 'Another woman is in the way here.', 'played-the-wife: rules on a third woman'],
  ['MARRIAGE', NAT, "Holding that role didn't make you less.", 'He will propose to you.', 'played-the-wife: predicts a marriage'],
  ['MONEY-LEGAL', NAT, "You weren't wrong to carry it.", 'The mortgage is the real issue.', 'played-the-wife: money/legal'],
  ['WASTED', NAT, 'That\'s the gap your question is built on — the doing, without the naming.', 'Those years were wasted on him.', 'played-the-wife: rules the years wasted'],

  ['CONTACT', NAT, 'What arrived that fast was real, dear.', 'Ask him what he wants, dear.', 'connection: presumes contact'],
  ['CONVICT', NAT, "You didn't invent how quickly that landed.", 'He is a player, dear.', 'connection: convicts him'],
  ['DURATION', NAT, "No reader can set that length for you, dear.", 'It holds for another two years.', 'without-commitment: supplies a length'],

  ['MOTIVE', NAT, "It's one thing. Not the whole of him, and not you.", "He's afraid of it, dear.", 'stopping-him: names his motive'],
  ['REAL-MAN', NAT, "There's a warning on this card, and it isn't about you.", "He's real, dear.", 'stopping-him: affirms a man is real'],

  ['ORIGIN-MISSING', SHA, 'Something stands between you and the answer, near at hand. I don\'t think it began with you.', 'Something stands between you and the answer, near at hand.', 'shadow: mandatory origin finding'],
  ['HANDLE-ROTATION', SHA, 'Whatever has hold of this holds it lightly. I don\'t think this began with you.', 'Something stands between this and the rest. I don\'t think this began with you.', 'shadow: three handles rotated'],
  ['LOOP-PROPERTY', SHA, "Let me look closer at what's standing there…", 'Let me look closer at what began already…', 'shadow: beat 6 neutral pointer'],
  ['LOOP-REPEAT', SHA, 'Let me look closer at what has hold of it…', "Let me look closer at what's standing there…", 'shadow: no repeated pointer'],
  ['BEAT3-VERDICT', SHA, 'You asked whether you want more than is fair. What catches me is that nothing on that table is surplus.', "You asked whether you want more than is fair. It isn't you.", 'shadow: beat 3 opens, never answers'],

  ['BLIND', NAT, 'All three cards were face down. You turned the Magician — look at the cup, coin, blade and wand set out on his table.', 'You turned the Magician — look at the cup, coin, blade and wand set out on his table.', 'shape: face-down truth in beat 1'],
  ['FOOL-FOOT', NAT, 'The moment was true as you felt it.', 'His foot proves it, dear.', "shape: the Fool's foot as proof"],
  ['THREE-SENTENCES', NAT, 'A pause and a full stop are different things, dear.', 'One. Two. Three sentences here.', 'shape: two sentences or fewer'],
]

const only = process.argv.includes('--case') ? process.argv[process.argv.indexOf('--case') + 1] : null
const cases = only ? CATALOGUE.filter((c) => c[0] === only) : CATALOGUE
if (!cases.length) { console.error(`no such case: ${only}`); process.exit(2) }

const originals = new Map([[NAT, readFileSync(NAT, 'utf8')], [SHA, readFileSync(SHA, 'utf8')]])
const restore = () => { for (const [f, text] of originals) writeFileSync(f, text) }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restore(); process.exit(130) })

let bit = 0
const missed = []
try {
  for (const [label, file, find, replace, guard] of cases) {
    const text = originals.get(file)
    const occurrences = text.split(find).length - 1
    if (occurrences !== 1) {
      missed.push(`${label}: anchor matched ${occurrences}× (must be exactly 1) — fix the catalogue`)
      console.log(`⚠ ${label.padEnd(16)} anchor not unique (${occurrences}) — SKIPPED`)
      continue
    }
    writeFileSync(file, text.replace(find, replace))
    let failed = false
    try {
      execSync(`npx vitest run ${TEST} --testTimeout=300000 --maxWorkers=2`, { stdio: 'pipe' })
    } catch { failed = true }
    restore()
    if (failed) { bit++; console.log(`✔ ${label.padEnd(16)} guard BIT  — ${guard}`) }
    else { missed.push(`${label}: ${guard} did NOT fire`); console.log(`🔴 ${label.padEnd(16)} guard MISSED — ${guard}`) }
  }
} finally {
  restore()
}

console.log(`\n${bit}/${cases.length} guards bit.`)
if (missed.length) { console.log('\n🔴 NOT PROVEN:\n  ' + missed.join('\n  ')); process.exit(1) }
console.log('every ban in this family is proven to fire.')
