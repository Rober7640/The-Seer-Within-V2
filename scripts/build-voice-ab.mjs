// build-voice-ab — regenerate fb-tarot/docs/voice-ab/ from the SETTLED doc examples.
//
//   node scripts/build-voice-ab.mjs
//
// 🔴 IT READS THE DOC, never a hardcoded copy. An earlier throwaway version of this script
// kept its own copy of the candidate cells and silently rebuilt the blind file from stale
// text after the doc had moved on. Parsing natural-tarot-cut.md is what makes "regenerate"
// mean regenerate.
//
// Control = the EXACT production read (openerB, minus name capture). Candidate = column a of
// that lander's worked example, plus one soulmate lander written to the same spec.
// Labels are shuffled with a fixed seed so the key is reproducible. Nothing here is wired.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { openerB, HEADLINES } from '../client/src/content/tarotReads.ts'

const DOC = 'fb-tarot/docs/natural-tarot-cut.md'
const OUT = 'fb-tarot/docs/voice-ab'
const CARD = 'a'

// column a of each worked example, parsed out of the doc
const doc = readFileSync(DOC, 'utf8')
const names = [...doc.matchAll(/^### \d · `([^`]+)`/gm)].map((m) => m[1])
const blocks = doc.split(/^### \d · /m).slice(1)
const cand = {}
names.forEach((name, i) => {
  const rows = [...blocks[i].matchAll(/^\| \*\*(\d)\*\*[^|]*\|(.+)\|\s*$/gm)]
  cand[name] = rows.map((r) => r[2].split('|').map((c) => c.trim()).filter(Boolean)[0])
})
// the required 4th case: a soulmate lander with no man in it, written to the same spec
cand['cards-heal-first'] = [
  "The backs gave nothing away. You turned the Magician — look at his table, all four things out at once.",
  "You asked if healing comes first, before your soulmate. Nothing on this card is lined up in order.",
  "There's no before. Nothing on that table is waiting its turn.",
  "The card doesn't lay out an order for any of it.",
  "You've been running yours in order, though. This first, then that, then love.",
  "That's the shape of your question — love placed last, and still waiting.",
  "Let me see what put love at the end of that list…",
]

// deterministic shuffle (no Math.random — the key has to be reproducible)
let seed = 20260825
const flip = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) < 0.5

const blind = ['# /fb-tarot Natural — blind voice comparison', '',
  'Two versions of the same read: same question, same deck, same card (**a · the Magician**),',
  'same seven cuts. One is **exactly what production serves today**; the other is a candidate',
  'written from the settled Natural spec. Labels are randomised per lander.', '',
  '🔴 Nothing here is wired. `cards-feels` is a protected control and appears read-only.',
  '🔴 The key is in `ANSWER-KEY.md` — do not open it until you have marked a preference.', '',
  'For each lander: does it sound like a person speaking · does the opener make you look at the',
  'card · does cut 3 actually answer · is anything hedged, poetic, or invented.', '']
const key = ['# ANSWER KEY — blind voice comparison', '', '| Lander | Sample 1 | Sample 2 |', '|---|---|---|']

for (const hook of Object.keys(cand)) {
  const prod = openerB('return-mhf', hook, CARD).slice(0, -1)   // drop name capture
  let pair = [['PRODUCTION (live today)', prod], ['CANDIDATE (settled spec)', cand[hook]]]
  if (flip()) pair = [pair[1], pair[0]]
  blind.push(`## \`${hook}\``, '', `**Ad:** ${HEADLINES[hook]}  ·  **Card a — the Magician**`, '')
  pair.forEach(([, cuts], i) => {
    blind.push(`### Sample ${i + 1}  ·  ${cuts.length} messages, ${cuts.join(' ').split(/\s+/).length} words`, '')
    cuts.forEach((c, j) => blind.push(`${j + 1}. ${c}`))
    blind.push('')
  })
  key.push(`| \`${hook}\` | ${pair[0][0]} | ${pair[1][0]} |`)
}
mkdirSync(OUT, { recursive: true })
writeFileSync(`${OUT}/BLIND-COMPARISON.md`, blind.join('\n'))
writeFileSync(`${OUT}/ANSWER-KEY.md`, key.join('\n') + '\n\n🔴 Read only after marking a preference on every lander.\n')
console.log(key.slice(4).join('\n'))
