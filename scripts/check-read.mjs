#!/usr/bin/env node
// check-read — the writing safeguard for /fb-tarot reads.
//
// WHY. Getting ONE lander right took four rounds of operator feedback (2026-08-18):
// bubbles too long · the echo turn too vague · sentences too complex · reading grade too
// high · a metaphor never cashed out. Sixty-five landers and eleven money landers are
// still to write. Every rule below is one of those four rounds, turned into something a
// machine catches before a human has to.
//
// Run on a draft BEFORE showing anyone:
//   node scripts/check-read.mjs --hook cards-will-commit          (a live lander)
//   node scripts/check-read.mjs --file draft.json                  (a draft: {headline, cards:{a:[...]}})
//
// 🔴 WHAT IT CANNOT CATCH. Warmth, rhythm, whether a line is worth saying. It is a floor,
// not a bar. "Takes a question by the ankles" passes rules 1-4 and is caught only by rule
// 6 because somebody thought to ban the construction. Read it aloud anyway.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const RULES = {
  MAX_WORDS: 25,        // the house rule, docs/test-ideas.md:16 + "max 25 words" in prompts.ts
  MAX_SENTENCES: 2,     // one idea per bubble
  // 🔴 REMOVED AS A GATE, 2026-08-23 (operator). Flesch-Kincaid is still COMPUTED and printed by
  // report(), because a genuinely hard line is worth seeing — but it no longer fails anything.
  //
  // WHY. The formula is 0.39*(words/sentence) + 11.8*(syllables/word). Both terms FALL when you
  // delete a real noun from a sentence, so the gate scored "Something holds this, dear" as
  // BETTER than "Something is holding your love life back, dear". Every grade failure made
  // deleting the noun the cheapest way to pass, and that is exactly how the copy of 2026-08-23
  // ended up saying "not a thing in you" and "nothing's waiting on you being different".
  // A gate that rewards the defect it is meant to prevent is worse than no gate.
  //
  // What replaces it is judgement, not another number: natural-tarot-cut.md §"The read-back".
  GRADE_IS_REPORT_ONLY: true,
  MAX_SYLLABLES: 3,     // 4+ syllable words are what push a short bubble to grade 9
  MAX_NEGATIVES: 2,     // per sentence — 3+ is the pile-up that stops parsing
}

const words = (s) => s.match(/[A-Za-z']+/g) ?? []
const sentences = (s) => s.trim().split(/(?<=[.!?…])\s+/).filter(Boolean)
const syllables = (w) => {
  const t = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!t) return 0
  let n = (t.match(/[aeiouy]+/g) ?? []).length
  if (t.endsWith('e') && n > 1 && !/(le|ee)$/.test(t)) n -= 1
  return Math.max(n, 1)
}
const grade = (s) => {
  const w = words(s), sn = sentences(s)
  if (!w.length || !sn.length) return 0
  return 0.39 * (w.length / sn.length) + 11.8 * (w.reduce((a, x) => a + syllables(x), 0) / w.length) - 15.59
}

// Constructions that hand her a metaphor without cashing it out, or pad the line. Each one
// is lifted from copy the operator rejected — none is invented.
const BANNED = [
  [/\bthe card of the\b/i, 'abstraction wrapper — say what it means about HIM, not "the card of the X"'],
  // 🔴 "waiting" REMOVED 2026-08-24 (operator). "The waiting" is ordinary speech — she says it
  // herself — where "the hoping" and "the wanting" are not. The frozen reference read uses it:
  // "This card makes me look at the waiting in your question."
  [/\bthe (hoping|wanting|knowing|feeling|leaving)\b/i, 'verb turned into a noun — say "you kept hoping", not "the hoping you have kept up"'],
  [/\bwhat it does say is\b|\bwhat it says is that\b/i, 'filler — cut straight to the point'],
  [/\bthe situation\b|\bcircumstance\b|\bthe matter\b/i, 'vague noun — name the actual thing'],
  [/\bwhich is telling\b|\bthe fact that\b|\bit is worth\b/i, 'explaining your own explanation'],
  [/\bnothing here has\b|\bnothing here is\b/i, '"here" is vague — nothing WHAT?'],
]

export function checkBubble(text, i, headlineWords) {
  const out = []
  const w = words(text).length
  if (w > RULES.MAX_WORDS) out.push(`${w} words (max ${RULES.MAX_WORDS})`)
  const sn = sentences(text)
  if (sn.length > RULES.MAX_SENTENCES) out.push(`${sn.length} sentences — more than one idea (max ${RULES.MAX_SENTENCES})`)
  // reading grade is REPORTED by report(), never failed here — see RULES above
  // 🔴 EXACT-HEADLINE-ECHO EXCEPTION (operator, 2026-08-25). A word that is in the lander's own
  // headline is never a "long word": beat 3 has to say her question back, so the echo gate and
  // this rule otherwise ask for opposite things. Found on cards-prayers-unanswered — "How long
  // will my prayers for money keep going unanswered?" — where "unanswered" cannot be avoided.
  // Scoped to EXACT words from that headline; it loosens nothing else.
  const fromHeadline = new Set(words(String(headlineWords ?? '')).map((x) => x.toLowerCase()))
  const big = words(text).filter((x) => syllables(x) > RULES.MAX_SYLLABLES && !fromHeadline.has(x.toLowerCase()))
  if (big.length) out.push(`long words: ${[...new Set(big)].join(', ')}`)
  for (const s of sn) {
    const n = (s.replace(/n['’]t\b/gi, ' not ').match(/\b(no|not|never|nothing|nobody|none|neither|nor|without|cannot)\b/gi) ?? []).length
    if (n > RULES.MAX_NEGATIVES) out.push(`${n} negatives in one sentence (max ${RULES.MAX_NEGATIVES})`)
  }
  // Message 1 is allowed the house "the card of…" form; nowhere else is.
  for (const [re, why] of BANNED) {
    if (re.test(text) && !(i === 0 && /the card of the/i.test(re.source))) out.push(`"${text.match(re)[0]}" — ${why}`)
  }
  return out
}

// The echo check: does she hear her own ad question back in the first two bubbles?
const STOP = new Set('is my the a an it or i ive did just this close to what does say why how long has been from me still will keep about years for going in of and something he him her ever'.split(' '))
// `window` = how many opening bubbles may carry the echo. It is 2 for the Natural Tarot-Cut,
// where cut 2 is the bridge that says her question back. The Inherited Shadow opens on a CLAIM
// and a PROOF about the card — her question is beat 3's job — so a shadow draft is checked
// across three. Same rule, moved to where the beat moved; see inherited-shadow-cut.md §beats.
export function checkEcho(bubbles, headline, window = 2) {
  if (!headline) return []
  const key = words(headline).map((w) => w.toLowerCase()).filter((w) => !STOP.has(w) && w.length > 2)
  if (!key.length) return []
  const opening = bubbles.slice(0, window).join(' ').toLowerCase()
  const hit = key.filter((k) => opening.includes(k.slice(0, 5)))
  return hit.length ? [] : [`no echo of the ad in bubbles 1-${window} — she clicked "${headline}", say it back to her`]
}

export function report(label, headline, bubbles) {
  let fails = 0
  console.log(`\n${'═'.repeat(84)}\n${label}${headline ? `\n  ad: "${headline}"` : ''}`)
  const echo = checkEcho(bubbles, headline)
  for (const e of echo) { fails++; console.log(`  ✗ ECHO  ${e}`) }
  bubbles.forEach((b, i) => {
    const probs = checkBubble(b, i, headline)
    const tag = probs.length ? '✗' : '✓'
    console.log(`  ${tag} ${String(i + 1).padStart(2)}. [${String(words(b).length).padStart(2)}w g${grade(b).toFixed(1).padStart(5)}] ${b.slice(0, 62)}${b.length > 62 ? '…' : ''}`)
    for (const p of probs) { fails++; console.log(`        └─ ${p}`) }
  })
  console.log(`\n  ${fails === 0 ? '✓ PASS' : `✗ ${fails} problem${fails === 1 ? '' : 's'}`}`)
  return fails
}

// ── entry — CLI only when run directly, so the audit skill can import the rules ──
// 🔴 pathToFileURL, NOT `file://${argv[1]}`. This repo lives under "Fun Projects", and a
// space is percent-encoded in import.meta.url but not in argv[1] — so the naive compare
// never matched, the CLI branch never ran, and `--hook`/`--file` exited 0 printing
// NOTHING. A gate that silently passes is worse than no gate. Found 2026-08-18.
// (argv[1] is undefined under `node -e`, where nothing is the entry point — hence the ?? '')
if (import.meta.url !== pathToFileURL(process.argv[1] ?? '').href) { /* imported: export only */ } else {
const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }

let total = 0
if (arg('--file')) {
  const d = JSON.parse(readFileSync(arg('--file'), 'utf8'))
  for (const [card, bubbles] of Object.entries(d.cards)) total += report(`card ${card}`, d.headline, bubbles)
} else if (arg('--hook')) {
  const { DECKS, HEADLINES, openerB } = await import('../client/src/content/tarotReads.ts')
  const hook = arg('--hook'), deck = arg('--deck') ?? 'return-mhf'
  if (!DECKS[deck]?.reads?.[hook]) { console.error(`no reads for ${hook} on ${deck}`); process.exit(2) }
  for (const card of Object.keys(DECKS[deck].reads[hook]))
    total += report(`${deck} / ${hook} / card ${card}`, HEADLINES[hook], openerB(deck, hook, card).slice(0, -1))
} else {
  console.error('usage: check-read.mjs --hook <hook> [--deck <deck>]  |  --file <draft.json>')
  process.exit(2)
}
console.log(`\n${'═'.repeat(84)}\nTOTAL: ${total === 0 ? 'PASS — but read it aloud before you ship it' : `${total} problems`}`)
process.exit(total === 0 ? 0 : 1)
}
