#!/usr/bin/env npx tsx
// lander-registry — regenerate fb-tarot/docs/lander-registry.md
//
//   npx tsx scripts/lander-registry.mts
//
// WHY IT IS GENERATED. The same reason copy-migration-checklist.md is: a hand-kept list of a
// hundred landers drifts within a fortnight, and this repo already has three tarot rosters that
// fall out of sync with each other. Everything below is DERIVED — the categories from the frame
// Sets in the server prompt, the landers from the registry, and the METHOD from the shape of the
// wired read itself. Nobody has to remember to tick anything, so the file cannot claim a lander
// is something the code says it is not.
//
// 🔴 HOW THE METHOD IS DETECTED, and why it needs no new field: it is WHICH ROSTER carries the
// hook. The Inherited Shadow ships as a SECOND roster beside the natural one rather than as an
// edit to it (option A, decided 2026-08-25 — see fb-tarot/docs/shadow-split-test-checklist.md):
//
//   natural   DECKS[deck].reads[hook]          — what serves today, on every lander
//   shadow    SHADOW_READS[deck][hook]         — the 70% arm of v1_tarot_shadow_2026
//
// ⚠ SO A LANDER SHOWING `natural + shadow` IS NOT HALF-MIGRATED — it is armed, and BOTH reads
// serve it: 70% shadow, 30% natural, while the experiment runs. Nothing is ever replaced, which
// is the whole reason option A was chosen: if the test is draft, paused or broken, the natural
// read is still the only thing anyone sees.
//
// An earlier version of this file detected the method from the FOLD instead — a '\n' in slot 0,
// since shadow puts [claim \n proof] where natural puts [picture]. That tell is still true of the
// copy, but it cannot see a shadow read any more, because DECKS.reads is never edited. Reading
// the rosters is exact rather than inferential, so it replaced it.
import { readFileSync, writeFileSync } from 'node:fs'
import { DECKS, HEADLINES, TAROT_HOOKS } from '../client/src/content/tarotReads'
import { SHADOW_READS } from '../client/src/content/tarotReadsShadow'

// ── Paths, named once and used everywhere, including inside the generated prose ─────────────
const PROMPTS = 'server/lib/prompts.ts'
const REGISTRY = 'client/src/content/tarotReads.ts'
const CHECKLIST = 'fb-tarot/docs/copy-migration-checklist.md'
const ARMED_DOC = '`fb-tarot/docs/shadow-split-test-checklist.md`'
const SELF = 'scripts/lander-registry.mts'
const OUT = 'fb-tarot/docs/lander-registry.md'

// ── The two methods, defined ONCE ───────────────────────────────────────────────────────────
// 🔴 Both the detection and the legend read from here. They used to be written out separately,
// which is the same two-copies-drift-apart problem this whole file exists to prevent.
const METHODS = {
  natural: { name: 'the Natural Tarot-Cut', bubbles: 7, doc: 'fb-tarot/docs/natural-tarot-cut.md' },
  shadow: { name: 'the Inherited Shadow', bubbles: 6, doc: 'fb-tarot/docs/inherited-shadow-cut.md' },
} as const
type Method = keyof typeof METHODS

const src = readFileSync(PROMPTS, 'utf8')

// The frame Sets, read out of the server prompt rather than re-typed here — a second copy is
// exactly the drift this file exists to prevent.
const setOf = (name: string) => {
  const m = src.match(new RegExp(`${name}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`))
  return new Set((m ? m[1] : '').match(/'[^']+'/g)?.map((s) => s.slice(1, -1)) ?? [])
}
const FRAMES: Array<[string, string]> = [
  ['money', 'MONEY_TAROT_HOOKS'],
  ['soulmate × keyword', 'SOULMATE_KEYWORD_TAROT_HOOKS'],
  ['soulmate × age band', 'SOULMATE_AGEBAND_TAROT_HOOKS'],
  ['soulmate × after loss', 'AFTER_LOSS_TAROT_HOOKS'],
  ['soulmate × where', 'SOULMATE_WHERE_TAROT_HOOKS'],
  ['loneliness', 'LONELINESS_TAROT_HOOKS'],
  ['self-frame', 'SELF_FRAME_TAROT_HOOKS'],
]
const MEMBERS = new Map(FRAMES.map(([label, set]) => [label, setOf(set)]))
const SET_NAME = new Map(FRAMES)
const UNFRAMED = 'decode-him'

const PRAYER = setOf('MONEY_PRAYER_TAROT_HOOKS')
const PROTECTED = new Set(['cards-feels', 'cards-return']) // invariant 4 — never rewritten

const frameOf = (h: string) => FRAMES.find(([label]) => MEMBERS.get(label)!.has(h))?.[0] ?? UNFRAMED
// Every deck carrying this hook in EITHER roster. Unioned rather than read off DECKS alone so a
// deck that somehow carried only a shadow read could not vanish from this table unmentioned.
const decksFor = (h: string) =>
  Object.keys(DECKS as any).filter(
    (id) => (DECKS as any)[id].reads[h] || (SHADOW_READS as any)[id]?.[h],
  )
// `natural` first, then `shadow`, so an armed lander reads "natural + shadow" — the order the
// arms are actually weighted in, control first.
const methodsOf = (h: string): Method[] => {
  const set = new Set<Method>()
  for (const id of Object.keys(DECKS as any)) {
    if ((DECKS as any)[id].reads[h]) set.add('natural')
    if ((SHADOW_READS as any)[id]?.[h]) set.add('shadow')
  }
  return [...set]
}

// The landers with a shadow read wired — the population of v1_tarot_shadow_2026.
const armed = (TAROT_HOOKS as readonly string[]).filter((h) => methodsOf(h).includes('shadow'))

// 🔴 INVARIANT 4, ENFORCED RATHER THAN DOCUMENTED. `cards-feels` and `cards-return` are protected
// controls: never rewritten, never armed. They are the only unchanged baseline the funnel has, and
// cards-return alone carries most of the tarot traffic — arming it would leave nothing to compare
// any of this against. Generating the table is the moment the whole roster is in hand, so it is
// the cheapest place to catch it, and a non-zero exit stops a docs regen from quietly blessing it.
const armedProtected = armed.filter((h) => PROTECTED.has(h))
if (armedProtected.length) {
  console.error(
    `\n⛔ a PROTECTED control has a shadow read wired: ${armedProtected.join(', ')}\n` +
      '   Invariant 4 — protected controls are never rewritten and never armed.\n' +
      '   Remove the draft from fb-tarot/docs/drafts/shadow/ and re-run\n' +
      '   npx tsx scripts/shadow-drafts-to-registry.mts\n',
  )
  process.exit(1)
}

const byFrame: Record<string, string[]> = {}
for (const h of TAROT_HOOKS as readonly string[]) (byFrame[frameOf(h)] ??= []).push(h)

const order = [...FRAMES.map(([label]) => label), UNFRAMED].filter((f) => byFrame[f]?.length)
const total = (TAROT_HOOKS as readonly string[]).length
const tally = order.map((f) => `${f} **${byFrame[f].length}**`).join(' · ')
const methodLegend = (Object.keys(METHODS) as Method[])
  .map((m) => `\`${m}\` = ${METHODS[m].name}, ${METHODS[m].bubbles} bubbles`)
  .join(' · ')

const out: string[] = [
  '# /fb-tarot — every lander, by category',
  '',
  `> 🤖 **GENERATED — do not hand-edit.** Rewrite it with \`npx tsx ${SELF}\`.`,
  `> Categories come from the frame Sets in \`${PROMPTS}\`, landers from the registry in`,
  `> \`${REGISTRY}\`, and the METHOD from which roster carries the read —`,
  '> so this file cannot claim a lander is something the code says it is not.',
  '',
  `**${total} landers.** ${tally}`,
  '',
  `**${armed.length} armed** for the Inherited Shadow (\`natural + shadow\` below): ${ARMED_DOC}`,
  '',
  '**A lander is one hook.** Most live only on `return-mhf`, the face-down deck every live ad',
  'points at; some also have `arcana-mfh` / `arcana-eef` / `decode-him` variants, and an edit has',
  'to be applied to every deck carrying the hook or the parity test fails.',
  '',
  '| Column | Means |',
  '|---|---|',
  `| **Method** | ${methodLegend}. Derived from which roster carries the read, not from a field |`,
  '| `natural + shadow` | **ARMED** — both reads serve this lander while `v1_tarot_shadow_2026` runs, 70% shadow / 30% natural. Nothing was replaced |',
  '| **Decks** | every deck carrying this hook, in either roster |',
  '| ⛔ | a protected control — never rewritten, never armed (invariant 4) |',
  '| ✝ | carries an extra ban that exists nowhere else on the funnel |',
  '',
  ...(Object.keys(METHODS) as Method[]).map((m) => `- \`${m}\` → \`${METHODS[m].doc}\``),
  '',
  `Copy-gate state is not here — that is \`${CHECKLIST}\`,`,
  'which is generated the same way. This file answers *what exists and what shape is it in*;',
  'that one answers *is the copy clean*.',
  '',
]
for (const f of order) {
  const hooks = byFrame[f]
  const set = SET_NAME.get(f)
  out.push(`## ${f} — ${hooks.length}`, '')
  out.push(
    set ? `Frame Set: \`${set}\` (\`${PROMPTS}\`)` : `No frame Set — these fall through to the default \`${UNFRAMED}\` clause.`,
    '',
  )
  out.push('| | Hook | Ad headline | Method | Decks |', '|---|---|---|---|---|')
  for (const h of [...hooks].sort()) {
    const flag = PROTECTED.has(h) ? '⛔' : PRAYER.has(h) ? '✝' : ''
    const method = methodsOf(h).join(' + ') || '—'
    out.push(`| ${flag} | \`${h}\` | ${(HEADLINES as any)[h]} | ${method} | ${decksFor(h).join(' · ')} |`)
  }
  out.push('')
}
writeFileSync(OUT, out.join('\n'))
console.log(`wrote ${OUT} — ${total} landers across ${order.length} categories`)
