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
//   node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --checklist # (re)write the migration checklist doc

import { checkBubble, checkEcho, RULES } from '../../../../scripts/check-read.mjs'
import { writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const has = (n) => argv.includes(n)

const { DECKS, HEADLINES, openerB, angleForHook } = await import('../../../../client/src/content/tarotReads.ts')

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

// ── --checklist: (re)write fb-tarot/docs/copy-migration-checklist.md ─────────
// WHY GENERATED. Eighty-two rows ticked by hand drift from the code inside one session,
// and a checklist that lies is worse than none — somebody skips a lander because a stale
// [x] said it was done. The tick is DERIVED: clean == [x]. Re-running this IS the update.
//
// Grouped by FAMILY (angleForHook) because that is the unit of work: 3 hooks x 3 cards,
// one guard file, and the "beat 3 shares no 6-word run with its siblings" test compares
// WITHIN the family — so a family written together cannot collide with itself.
//
// NOTES are the standing warnings that a score can never derive. They live here, next to
// the row, rather than in a handoff somebody has to remember to re-read.
const NOTES = {
  'cards-someone-else': '⚠️ STUDY FIRST — best converter on the funnel (9.8%). A grade-5 pass could remove what works.',
  // ✅ RESOLVED 2026-08-19. The openerB test was made split-aware rather than gutted: it
  // accepts either copy shape, asserts the open loop and name capture by position from the
  // END, and measures the WHOLE served read instead of beat 3 alone.
  'cards-really-soulmate': '⚠️ STUDY FIRST — Version B serves this static read with no model call, so every guard in its file is the whole safety net.',
  'cards-who-hurt-me': '⚠️ heaviest hook on the funnel — never minimise, never convict, never blame her.',
  'cards-still-miss-him': '⚠️ sibling of cards-who-hurt-me — never minimise the named harm.',
  'cards-feels-off': '⚠️ submits HER JUDGEMENT for a verdict. Split the question; do not answer it.',
}
const DECK_NOTES = {
  'decode-him': '🔴 B2 — decode-him-strip.png is the fb-PALM thumb strip, not tarot art, and there is no revealStrip. These 4 cannot take a picture line until the art is settled or the deck is retired.',
}

// ── Track B: the money batch ────────────────────────────────────────────────
// Hard-coded because these hooks do NOT exist in the registry yet — the checklist has to
// show work that is not built, or the operator sees "6/88" and thinks that is the job.
// Every row moves to the generated section above the moment its hook is wired.
// Source of truth: fb-tarot/docs/drafts/money-block.draft.md.
const MONEY = [
  ['money-retiring (55–64)', [
    ['cards-blocked-retiring', 'Why is my money still blocked this close to retiring?'],
    ['cards-nest-egg', 'How long has something been blocking me from a nest egg?'],
    ['cards-too-late', 'Is something blocking my money, or did I just leave it too late?'],
  ]],
  ['money-working (65+)', [
    ['cards-still-working', 'Why am I still working when the money should have come by now?'],
    ['cards-how-much-longer', 'How much longer will something keep blocking my money?'],
    ['cards-out-of-time', 'Is something still blocking my money, or have I run out of time?'],
  ]],
  ['money-energy', [
    ['cards-my-energy', 'Is my energy blocking my money?'],
    ['cards-money-wont-stay', "What does my energy say about why money won't stay?"],
    ['cards-energy-how-long', 'How long has my energy been working against my money?'],
  ]],
  ['money-prayer', [
    ['cards-prayed-years', "I've prayed about money for years. What's still blocking it?"],
    ['cards-prayers-unanswered', 'How long will my prayers for money keep going unanswered?'],
  ]],
]

// Hooks with a signed-off-pending DRAFT. Three states, not two: a lander can be un-started,
// DRAFTED (copy written and gated, waiting on a human), or wired. Collapsing the middle state
// is how a finished rewrite gets forgotten between sessions.
const DRAFTS_DIR = new URL('../../../../fb-tarot/docs/drafts/rewrites/', import.meta.url)
const drafted = new Set()
try {
  for (const f of readdirSync(DRAFTS_DIR)) {
    if (!f.endsWith('.json')) continue
    drafted.add(JSON.parse(readFileSync(new URL(f, DRAFTS_DIR), 'utf8')).hook)
  }
} catch { /* no drafts yet */ }

// The method every lander goes through — READ FROM THE CANONICAL DOC, not held here.
//
// 🔴 It used to be a 158-line array in this file, and the comment above the push() said it
// "lives in SKILL.md too … repeated here on purpose". Three copies (this const, the skill,
// and the generated checklist) had already begun to disagree by 2026-08-19, which is the
// exact failure this generator exists to prevent for landers. One source now:
// fb-tarot/docs/natural-tarot-cut.md. The checklist still carries the full text inline —
// the operator's page stays self-contained — it just no longer OWNS it.
const METHOD_DOC = new URL('../../../../fb-tarot/docs/natural-tarot-cut.md', import.meta.url)
const FRAMEWORK = (() => {
  let raw
  try {
    raw = readFileSync(METHOD_DOC, 'utf8')
  } catch {
    // 🔴 Loud, not silent. A checklist emitted with no method is a checklist that teaches
    // nobody anything, and it would still print a green tick.
    console.error('ABORT: fb-tarot/docs/natural-tarot-cut.md is missing — the checklist cannot be written without it.')
    process.exit(2)
  }
  // Drop the HTML provenance comment and the doc's own H1/preamble; the checklist supplies
  // its own heading level and the '## How a lander gets rewritten' section starts the body.
  const body = raw.replace(/^<!--[\s\S]*?-->\n*/, '')
  const from = body.indexOf('## How a lander gets rewritten')
  if (from < 0) {
    console.error('ABORT: natural-tarot-cut.md no longer contains "## How a lander gets rewritten".')
    process.exit(2)
  }
  // trailing '' so the generated worked example below does not jam against the last line
  return [...body.slice(from).trimEnd().split('\n'), '']
})()

// The clearing copy, read from the client rather than pasted — it is the payoff bubble 7
// sets up, and a quoted-but-stale version of it would teach the wrong target.
function pitchLines() {
  try {
    const src = readFileSync(new URL('../../../../client/src/hooks/useConversation.ts', import.meta.url), 'utf8')
    const want = [/"(I know exactly what needs to be cleared[^"]*)"/, /`(What you need, \$\{firstName\}[^`]*)`/, /"(I'll trace the roots of this block[^"]*)"/]
    return want.map((re) => src.match(re)?.[1]).filter(Boolean)
      .map((l) => l.replace('${firstName}', 'Sarah'))
  } catch { return [] }
}

if (has('--checklist')) {
  const fams = new Map()
  for (const r of rows) {
    const fam = angleForHook(r.hook)
    if (!fams.has(fam)) fams.set(fam, new Map())
    const byLander = fams.get(fam)
    const k = `${r.deck}/${r.hook}`
    const cur = byLander.get(k) ?? { deck: r.deck, hook: r.hook, problems: 0 }
    cur.problems += r.problems.length
    byLander.set(k, cur)
  }
  const famRows = [...fams.entries()].map(([fam, m]) => {
    const ls = [...m.values()].sort((a, b) => b.problems - a.problems)
    return { fam, ls, clean: ls.filter((l) => !l.problems).length, problems: ls.reduce((a, l) => a + l.problems, 0) }
  }).sort((a, b) => b.problems - a.problems)

  const totalClean = famRows.reduce((a, f) => a + f.clean, 0)
  const totalLanders = famRows.reduce((a, f) => a + f.ls.length, 0)
  const totalProblems = famRows.reduce((a, f) => a + f.problems, 0)
  const bar = (c, n) => '█'.repeat(Math.round(c / n * 20)) + '░'.repeat(20 - Math.round(c / n * 20))

  const out = []
  out.push('# /fb-tarot copy migration — checklist')
  out.push('')
  out.push('Two tracks: **A** rewrites the 88 landers already live; **B** builds the 11 new money landers.')
  out.push('')
  out.push('> 🤖 **GENERATED — do not hand-edit.** Rewrite it with')
  out.push('> `node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --checklist`.')
  out.push('> The tick is derived from the gate, not from anyone remembering to tick it, so this file')
  out.push('> can never claim a lander is done when the code says otherwise.')
  out.push('')
  out.push(`\`${bar(totalClean, totalLanders)}\`  **${totalClean} / ${totalLanders} landers clean** · ${totalProblems} gate problems left`)
  out.push('')
  out.push(`Rules: ≤${RULES.MAX_WORDS} words · ≤${RULES.MAX_SENTENCES} sentences · grade ≤${RULES.MAX_GRADE} · ≤${RULES.MAX_SYLLABLES} syllables · ≤${RULES.MAX_NEGATIVES} negatives per sentence · echo the ad in bubbles 1–2 · no banned constructions.`)
  out.push('')
  out.push('**A lander is one deck × one hook.** Most hooks live only on `return-mhf` (the default')
  out.push('face-down deck every live ad points at); a few also have `arcana-mfh` / `arcana-eef` /')
  out.push('`decode-him` variants, and an edit must be applied to **every** deck carrying the hook or')
  out.push('the parity test fails.')
  out.push('')
  out.push('**Three states per lander:** blank = not started · 📝 DRAFTED = copy written and gated,')
  out.push('waiting on your go (read it in `fb-tarot/docs/drafts/rewrites/PREVIEW.md`) · `[x]` = wired')
  out.push('and passing. Nothing is wired before you have seen it.')
  out.push('')
  out.push(`📝 awaiting sign-off right now: ${drafted.size ? [...drafted].map((h) => '`' + h + '`').join(', ') : 'nothing'}`)
  out.push('')
  out.push('🔴 **Known content bug, `decode-him` deck.** All four of its hooks open with the SAME')
  out.push('beat 1 per card ("You turned the Sun, dear — the card of what stands in the light." serves')
  out.push('cards-honest, cards-return, cards-feels AND cards-cheating). Every other family has a test')
  out.push('forbidding this; decode-him has no guard file, so it was never caught. Each rewrite there')
  out.push('must write a fresh beat 1 — `scripts/preview-rewrite.mjs` fails the preview if it collides.')
  out.push('')
  // ── The framework, in the doc the operator actually opens ─────────────────
  // It lives in SKILL.md too, for whoever is doing the work. It is repeated here on
  // purpose: the checklist is the page somebody opens to decide what to do next, and a
  // method that is one click away is a method that gets skipped.
  out.push(...FRAMEWORK)

  // A worked example, READ LIVE FROM THE REGISTRY rather than pasted — so it can never
  // drift from what the funnel actually sends, which is the failure every hand-written
  // example in this repo eventually hit.
  const JOBS = ['THE PICTURE', 'THE BRIDGE', 'THE ANSWER', 'THE HIDDEN LAYER',
                'THE CONTRADICTION', 'THE RECOGNITION', 'THE NEXT MYSTERY']
  // Written about the JOB, not the line, so it stays true whichever read is rendered.
  const WHY = [
    'She is looking at that card while she reads this. Every detail is on the art, so she checks it in one second without deciding to. That is the credit everything after it spends.',
    'Her question back, so she knows she is on the right page — then the card in plain English, because that is what makes the next line evidence rather than an opinion.',
    'The clearest line on the page, and it answers the fear rather than the headline. The CARD carries it; a stranger asserting it carries nothing.',
    'Adds something she could not see. If this restates cut 3 in different words, the read has stalled and she can feel it.',
    'The turn. Why his behaviour does not match the answer she just got — this is what is left unresolved, and it is the only reason there is anything to buy.',
    'Her own week handed back to her. Not "you were right about him" (that is the psychic ruling on her) but the specific thing she has watched happen.',
    'Not an absence. Something is **sitting between** them, named narrowly enough that she already knows what the next question is. Objects can be moved.',
  ]
  // Prefer a DRAFT, because drafts are written to the formula by construction. The wired
  // landers predate it — cards-return's middle bubbles were written before "the gap" and
  // "the reason why" had names, so it maps loosely and makes a poor demonstration.
  let ex = null, exLabel = null, exHead = null
  try {
    // Prefer a lander already written to the Natural Tarot-Cut, so the worked example
    // demonstrates the framework above rather than the shape it replaced.
    const pick = [...drafted].find((h) => {
      try {
        return /Natural Tarot-Cut/.test(readFileSync(new URL(`${h}.json`, DRAFTS_DIR), 'utf8'))
      } catch { return false }
    })
    const d = pick ?? [...drafted][0]
    if (d) {
      const j = JSON.parse(readFileSync(new URL(`${d}.json`, DRAFTS_DIR), 'utf8'))
      const deck = Object.keys(j.decks)[0]
      ex = j.decks[deck].a
      exLabel = `\`${d}\` on \`${deck}\`, card a — DRAFTED, not yet live`
      exHead = j.headline ?? HEADLINES[d]
    }
  } catch { /* fall through to the registry */ }
  if (!ex) {
    ex = openerB('return-mhf', 'cards-return', 'a').slice(0, -1)
    exLabel = '`cards-return` on `return-mhf`, card a — live'
    exHead = HEADLINES['cards-return']
  }
  if (ex.length === JOBS.length) {
    out.push(`### Worked example — ${exLabel}`)
    out.push('')
    out.push(`The ad asked **"${exHead}"**. Bubble by bubble:`)
    out.push('')
    ex.forEach((b, i) => {
      out.push(`**${i + 1} · ${JOBS[i]}**`)
      out.push('')
      out.push(`> ${b}`)
      out.push('')
      out.push(WHY[i])
      out.push('')
    })
    out.push('### Why cut 7 matters — the thread landing')
    out.push('')
    out.push('Forty turns later Evelyn says this, and it is already in the code:')
    out.push('')
    for (const line of pitchLines()) out.push(`> "${line}"`)
    out.push('')
    out.push('With an ABSENCE in cut 7, *"the shadow that\'s been blocking your path"* is the first')
    out.push('she has heard of any shadow. A block appears at minute eight and a ritual is sold to')
    out.push('remove it.')
    out.push('')
    out.push('With an OBSTRUCTION, she was told something was in the way in the first thirty seconds —')
    out.push('by the card, before Evelyn had anything to sell. The pitch is not a swerve. It is Evelyn')
    out.push('finally naming the thing the card already showed her.')
    out.push('')
    out.push('### The whole arc')
    out.push('')
    out.push('| Cut | What she does |')
    out.push('|---|---|')
    out.push("| 1 | *That's really what's on the card* |")
    out.push('| 2 | *I picked this one* |')
    out.push('| 3 | *So there IS an answer* |')
    out.push("| 4 | *And there's more to it than I knew* |")
    out.push("| 5 | *But that's not the whole of it* |")
    out.push("| 6 | *That's exactly what my week has been like* |")
    out.push("| 7 | *…so THAT's what's in the way* |")
    out.push('| ↓ | **"I know exactly what needs to be cleared."** |')
    out.push('')
    out.push('Cuts 1–6 buy her trust. Cut 7 hands the sale a thread to pull. That is the')
    out.push('difference between a lander that validates her and a lander that sells.')
    out.push('')
    out.push('⚠️ **Cut 7 is the one piece with no evidence behind it.** Cuts 1–6 were checked')
    out.push('against 400 real concerns, and that check changed the copy. The obstruction framing is')
    out.push('reasoning from how the offer works, not an observation — and at this traffic')
    out.push('(96% on three hooks) a test will not settle it either. Ship it knowing that.')
    out.push('')
    out.push('⚠️ **Most drafts in the queue predate this framework.** Everything written before')
    out.push('2026-08-19 — the wired `cards-return` / `cards-will-commit` / `cards-feels`, and the bulk')
    out.push('of the drafts awaiting sign-off — was built to REFUSE rather than answer, because the')
    out.push('guards required it. They pass the gate and they read well. They are not the thing to')
    out.push('copy. Copy the worked example above, which is written to the cuts.')
    out.push('')
    out.push('---')
    out.push('')
  }
  out.push('Full version, with the reasoning behind each rule:')
  out.push('`.claude/skills/v1-funnel-audit/SKILL.md` § "Migrating a lander".')
  out.push('')
  out.push('Work top-down: families are ordered by how much unreadable copy they hold.')
  out.push('')
  out.push('---')
  out.push('')
  out.push('# Track A — the 88 live landers')
  out.push('')
  for (const f of famRows) {
    out.push(`## ${f.fam} — ${f.clean}/${f.ls.length} clean · ${f.problems} problems`)
    out.push('')
    // Not every family has one. decode-him / trust / self-frame are the SEED hooks — they
    // predate the per-family guard convention, so the busiest copy on the funnel is also
    // the least guarded. Say that out loud rather than linking a file that is not there.
    // The four money angles share ONE guard file — they take the same seven bans, and what
    // differs between them is the reporting label and the per-hook finding, not the guard.
    // Without this the doc claimed the money copy had no guard file and was "the least
    // protected on the funnel", which was the opposite of true.
    const guard = f.fam.startsWith('money-')
      ? 'tests/tarot-money-block-copy.test.ts'
      : `tests/tarot-${f.fam}-copy.test.ts`
    out.push(existsSync(new URL(`../../../../${guard}`, import.meta.url))
      ? `\`${guard}\` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.`
      : `⚠️ **No dedicated guard file** (\`${guard}\` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.`)
    out.push('')
    const seenDeckNote = new Set()
    for (const l of f.ls) {
      const tick = l.problems ? ' ' : 'x'
      const tail = !l.problems ? '· clean'
        : drafted.has(l.hook) ? `· **${l.problems}** · 📝 **DRAFTED — awaiting sign-off**`
        : `· **${l.problems}**`
      const deckTag = l.deck === 'return-mhf' ? '' : ` \`${l.deck}\``
      out.push(`- [${tick}] \`${l.hook}\`${deckTag} — "${HEADLINES[l.hook]}" ${tail}`)
      // Deck notes print ONCE per family — the same red paragraph on four consecutive
      // rows stops being read by the third.
      const deckNote = l.problems && !seenDeckNote.has(l.deck) ? DECK_NOTES[l.deck] : null
      if (deckNote) seenDeckNote.add(l.deck)
      const note = NOTES[l.hook] ?? deckNote
      if (note && l.problems) out.push(`      ${note}`)
    }
    out.push('')
  }
  // ── Track B section ────────────────────────────────────────────────────────
  const built = new Set(rows.map((r) => r.hook))
  out.push('---')
  out.push('')
  out.push('# Track B — the money batch (not built yet)')
  out.push('')
  out.push('The first non-love territory on the funnel. Deck: `return-mhf`, face-down, no new art.')
  out.push('Draft + the 7 bans + the wiring list: `fb-tarot/docs/drafts/money-block.draft.md`.')
  out.push('')
  out.push('🔴 **The 33 reveals in that draft must be REWRITTEN, not just wired.** Scored against this')
  out.push('gate they carry ~176 problems — the same failure rate `cards-return` had before its')
  out.push('rewrite. Track B\'s copy work is the four steps above, run on 11 new hooks: pull the VOC,')
  out.push('find the fear under the question, write the seven cuts, chain them, gate and preview.')
  out.push('')
  out.push('Two of the steps land differently on money and are worth flagging before drafting:')
  out.push('')
  out.push('- **Step 1 has no data yet.** These hooks have never run, so `voc-by-hook.mjs` returns')
  out.push('  nothing. The nearest real corpus is `docs/v1-money-bucket-voc.md` — 10,514 money')
  out.push('  concerns from V1, already themed. Read that instead of skipping the step.')
  out.push('- **Cut 7 is easier here, and cuts 4-6 are harder.** The block IS the headline, so the')
  out.push('  obstruction practically writes itself. The hinge is the problem: cuts 4, 5 and 6 are')
  out.push('  written around a person and there is nobody here to contradict. Use the money')
  out.push('  translation in the framework above — cut 3 answers her fear about HERSELF ("it was')
  out.push('  never you"), cut 5 becomes the EARNING against the KEEPING, and cut 6 names the')
  out.push("  near-miss, which is the VOC's own sentence: *\"I feel I am close to money only to have")
  out.push('  it vanish."*')
  out.push('- **Cut 3 must not concede the self-blame the `money-energy` headlines offer** ("Is my')
  out.push('  energy blocking my money?"). Affirm the noticing, refuse the fault, exactly as')
  out.push('  `hidden-intuition` splits it — and note that **none of the seven money bans was')
  out.push('  loosened** on 2026-08-19. The directional argument does not reach a family where she')
  out.push('  can act on the reading with her own savings.')
  out.push('')
  out.push('**Structural work these 11 need that no love lander did:**')
  out.push('')
  out.push('- [x] `hookToBucket()` returns `\'money\'` for the 11 — done 2026-08-19, `tarotReads.ts`.')
  out.push('      This is the load-bearing one: it sets `userData.bucket`, which steers the whole V1 chat')
  out.push('      after the opener. V1 already has a full money path (`MONEY_BUCKET_PROMPT`), so the flip')
  out.push('      routes her into an established path rather than needing new prompt work.')
  out.push('- [x] Per-hook tap instruction — done 2026-08-19: `hookInstruction` on `CardSetConfig`, read via')
  out.push('      `instructionFor()` in `TarotBridge.tsx`. The deck line says *"Think of the man on your mind."*')
  out.push('- [x] Money frame in `buildTarotReflectPrompt` — done 2026-08-19, tested FIRST. **Insurance, not a pillar.** Version C is')
  out.push('      unreachable on tarot today (`/fb-tarot/c` 302s to `/b`), so this only runs if a hook is')
  out.push('      ever enrolled in the version experiment.')
  out.push('- [x] 4 angles, 4 family arrays, `TAROT_HOOKS` / `HEADLINES` / `TAROT_QUESTION`,')
  out.push('      `TAROT_HOOK_CONTEXT` / `TAROT_HOOK_TENDENCY`, `validHooks` in `routes.ts`, `STATUS.md`.')
  out.push('- [x] `tests/tarot-money-block-copy.test.ts` — written 2026-08-19, and every one of the 7 bans was fed a deliberate violation and fired (no amount/date/source · never name a')
  out.push('      person as the block · no financial advice · never blame her · never "too late" and never a')
  out.push('      promised arrival · never rule on God · never presume her finances).')
  out.push('')
  for (const [fam, hooks] of MONEY) {
    out.push(`## ${fam} — 0/${hooks.length} built`)
    out.push('')
    for (const [h, headline] of hooks)
      out.push(`- [${built.has(h) ? 'x' : ' '}] \`${h}\` — "${headline}" · 3 reveals`)
    out.push('')
  }
  const path = new URL('../../../../fb-tarot/docs/copy-migration-checklist.md', import.meta.url)
  writeFileSync(path, out.join('\n'))
  console.log(`wrote fb-tarot/docs/copy-migration-checklist.md — ${totalClean}/${totalLanders} clean, ${totalProblems} problems left`)
  process.exit(0)
}

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
