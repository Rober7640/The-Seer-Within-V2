// /fb-read Version C eval — live LLM, real endpoint, printed transcripts.
//
// Everything she reads on Version C is graded, not only the generated half:
//
//   WRITTEN    the opening bubble (the picture) + the open question. Two lines,
//              and on Version C they are her ENTIRE first impression — she reads
//              them and then types. They carry more weight per word than anything
//              the model writes, so they get the same guards plus two of their own.
//   GENERATED  the model's reply to what she typed.
//
// The written half is checked here rather than only at build time because the
// build sees the copy alone; this sees it in the sequence she actually reads, next
// to the reply it has to set up.
//
//   node improve-v1/fb-read/evals/run-eval.mjs [--base http://localhost:5000]
//
// Needs the dev server up (npm run dev) and a live ANTHROPIC_API_KEY: this calls
// the real model on purpose. A mocked eval cannot catch the failures that matter
// here — inventing a man, promising a date, or re-describing the picture.

import { readsFor, READ_QUESTION, READ_HOOKS, HEADLINES, DEVICES } from '../../../shared/readDevices.ts'
import { isReadWritten } from '../../../shared/readCopy.ts'

// --dry runs the WRITTEN checks only and makes no model calls, so copy edits can
// be checked for free. The generated half still needs a live run before shipping.
const dry = process.argv.includes('--dry')

const base = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:5000'

// Answers lifted from the shape of real V1 `concern` text: specific, lower-case,
// unpunctuated, and carrying a detail the reply has to reflect back. The last
// one in each device is deliberately awkward — a bare fragment, or a woman who
// mentions a man — because that is where guards break.
const ANSWERS = {
  'love-again': [
    "my husband left in march after 22 years and i dont know who i am without him",
    "ive been on my own six years now and im starting to think thats just it for me",
    "i keep going over what i could have done differently. i cant switch it off",
  ],
  // On this hook she is answering "what brings him to mind", so the answers name
  // a trigger. The last is the one that most invites the banned reply — she asks
  // outright whether he thinks of her, and the guard says answer neither way.
  'still-think': [
    "his brother still likes my posts and every time i see it i wonder",
    "sundays mostly. we always did the shop together on a sunday",
    "do you think he ever thinks about me at all or has he just moved on completely",
  ],
  // She is answering "what first made you wonder". The third is the trap: she
  // volunteers that she feels stupid for noticing, which invites both banned
  // replies at once — agreeing she is imagining it, or naming what he is hiding.
  'hiding-something': [
    "he takes his phone into the other room now. he never used to do that",
    "theres a couple of hours on a saturday he wont account for and if i ask he changes the subject",
    "nothing i can point to. i just get this feeling and then i feel stupid for having it",
  ],
}

// 🔴 THE GUARDS ARE NOT DEFINED HERE ANY MORE.
//
// They used to be, and that was the problem: this is a test file, so it ran when
// somebody ran it, and the live reflect path shipped whatever the model said
// unread. Every predicate below now comes from shared/readGuards.ts, which the
// SERVER imports too — so a guard tightened for the eval tightens production in
// the same commit, and neither can drift from the other.
//
// The eval keeps its own QUALITY checks (restating the opening, word counts, bare
// pronouns, and art coherence on the written half). Those are worth failing a
// build over and not worth failing a live reading over.
import {
  BANS,
  HIDING_BANS,
  MAN_IN_HER_WORDS,
  MAN_PRESUPPOSED,
  CANCELLED_BY,
  asserts,
  assertsAboutHim,
  assertsSoftened,
  firesHidingBan,
  namesWrongMark,
} from '../../../shared/readGuards.ts'



// Does the reply just say the opening bubble again? Compared on 4-word runs,
// stopwords kept — a genuine restatement reuses the phrasing, not just the nouns.
function echoesOpening(opening, reply) {
  const runs = (s) => {
    const w = s.toLowerCase().match(/[a-z']+/g) ?? []
    return new Set(w.slice(0, -3).map((_, i) => w.slice(i, i + 4).join(' ')))
  }
  const a = runs(opening), b = runs(reply)
  const shared = [...b].filter((r) => a.has(r))
  return shared
}

// ── SELF-TEST ───────────────────────────────────────────────────────────────
// This eval has been loosened three times, each time because it flagged a move
// the approved copy makes deliberately. That is exactly how a guard decays into
// decoration, so the loosening has to be provable rather than trusted: these
// cases assert it still catches the thing it exists to catch.
if (process.argv.includes('--selftest')) {
  const cases = [
    // [text, should the guard fire?]
    ['He thinks of you more than you know, dear.',            true],
    ['You cross his mind more often than he lets on.',        true],
    ['Part of him still carries this.',                       true],
    ['He has not forgotten you.',                             true],
    ['He does not think about you any more.',                 true],
    ['He still loves you.',                                   true],
    // …and still passes the moves the copy is built on
    ["You're not asking if he loves you.",                    false],
    ['You asked whether you cross his mind at all.',          false],
    ['You didn\'t ask whether he loves you.',                 false],
    ['What happened is not stored in his memory alone.',      false],
  ]
  const hidingCases = [
    ['There is another woman, dear.',                         true],
    ['Check his phone when he leaves the room.',              true],
    ['You are overthinking this.',                            true],
    ['He is hiding something from you.',                      true],
    ['He has nothing to hide.',                               true],
    ['You are not imagining it.',                             false],
    // contracted negations — the hole that failed cut 3 of this very hook
    ["Meeting one isn't the same as imagining it.",            false],
    ["He doesn't have anything to hide from you.",             true],
    ['The edge you keep meeting is real.',                    false],
    ['Something stops where the picture stops.',              false],
  ]
  // The wrong-mark check and the claim bans, both of which match vocabulary the
  // sanctioned copy also uses. Every "must pass" line below is a real sentence the
  // live model produced that an earlier version of these checks failed.
  const markCases = [
    // arm-A vocabulary asserted — this cup has no road and no heart
    ['That road in your cup doesn\'t end at the rim. It keeps going.',  true],
    ['The heart sits low... rooted, but shadowed.',                     true],
    ['There is a heart in yours, low near the middle.',                 true],
    // …and the moves the copy depends on
    ['The tree sits halfway up — not at the rim, not far off.',         false],
    ['Not at the rim where things are fresh. Deeper, where patterns live.', false],
    ['Your heart came through it whole.',                              false],
    ['the answered heart',                                             false],
  ]
  const claimCases = [
    ["He'll come back to you before long.",                            true],
    ['Not whether he loves you... not whether he\'ll return.',          false],
  ]

  let bad = 0
  for (const [text, expected] of markCases) {
    const RETIRED = ['road', 'trail', 'rim']
    const fired =
      RETIRED.some((w) => asserts(text, new RegExp(`\\b${w}s?\\b`, 'i'))) ||
      asserts(text, /\b(a|the)\s+heart\b/i)
    const ok = fired === expected
    if (!ok) bad++
    console.log(`  ${ok ? '✓' : '✗'} ${expected ? 'must fire ' : 'must pass'}  ${text}`)
  }
  for (const [text, expected] of claimCases) {
    const b = BANS.find((x) => x.name === 'promises his return')
    const fired = b.re.test(text) && asserts(text, b.re)
    const ok = fired === expected
    if (!ok) bad++
    console.log(`  ${ok ? '✓' : '✗'} ${expected ? 'must fire ' : 'must pass'}  ${text}`)
  }
  cases.push(...markCases, ...claimCases)

  for (const [text, expected] of cases.slice(0, 10)) {
    const fired = Boolean(assertsAboutHim(text) || assertsSoftened(text))
    const ok = fired === expected
    if (!ok) bad++
    console.log(`  ${ok ? '✓' : '✗'} ${expected ? 'must fire ' : 'must pass'}  ${text}`)
  }
  for (const [text, expected] of hidingCases) {
    const fired = Boolean(firesHidingBan(text))
    const ok = fired === expected
    if (!ok) bad++
    console.log(`  ${ok ? '✓' : '✗'} ${expected ? 'must fire ' : 'must pass'}  ${text}`)
  }
  cases.push(...hidingCases)
  console.log(`\n  ${cases.length - bad}/${cases.length} self-test cases correct`)
  process.exit(bad ? 1 : 0)
}

const results = []
let ran = 0

for (const hook of READ_HOOKS) {
 for (const [device, cfg] of Object.entries(DEVICES)) {
  for (const option of cfg.options) {
    if (!isReadWritten(device, hook, option)) {
      console.log(`\n${'━'.repeat(78)}\n${hook} · ${device} · ${option}\n  — skipped, reading not published`)
      continue
    }
    const bubbles = readsFor(device, hook, option)
    const opening = bubbles[0]
    const question = READ_QUESTION[hook]
    const pool = ANSWERS[hook]
    const answer = pool[ran % pool.length]
    ran++

    const res = dry ? null : await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'readReflect',
        readDevice: device,
        readHook: hook,
        readCard: option,
        userData: {},
        input: answer,
      }),
    })

    const label = `${hook} · ${device} · ${option} · ${cfg.reading[option]}`
    if (res && !res.ok) {
      console.log(`\n${'━'.repeat(78)}\n${label}\n  HTTP ${res.status} — ${await res.text()}`)
      results.push({ label, ok: false, issues: [`HTTP ${res.status}`] })
      continue
    }

    const messages = res ? (await res.json()).messages : []
    const joined = messages.join(' ')

    // ── WRITTEN half ────────────────────────────────────────────────────
    // Same bans, plus two that only apply to copy we authored.
    const written = []
    for (const b of BANS) if (b.re.test(`${opening} ${question}`)) written.push(`opening/question: ${b.name}`)

    const ow = opening.trim().split(/\s+/).length
    const os = opening.split(/[.!?…]+/).filter((s) => s.trim()).length
    if (ow > 25) written.push(`opening is ${ow} words`)
    if (os > 2) written.push(`opening is ${os} sentences`)
    // Never open on a bare pronoun — she has to be told WHAT, not referred to it.
    if (/^(It|That|This|They)\b/.test(opening.trim())) written.push('opening starts on a bare pronoun')

    // 🔴 THE OPENING BUBBLE MUST DESCRIBE THE ART.
    // `mark` is what the server injects into the prompt and what the Version-A
    // greeting renders; the opening bubble is what she READS while looking at the
    // panel. If someone edits one and not the other, the reading names a thing
    // that is not in the picture — the single failure this whole funnel's art
    // brief exists to prevent, and one no type checker can see.
    // Shared with the wrong-mark check in the GENERATED half below.
    const STOP = new Set(['the','one','where','with','from','your','you','and','out','into','near','side','that','this','a','an','of','on','in','re'])
    const content = (cfg.mark[option].toLowerCase().match(/[a-z']{3,}/g) ?? []).filter((w) => !STOP.has(w))
    const lowerOpening = opening.toLowerCase()
    const missing = content.filter((w) => !lowerOpening.includes(w.replace(/s$/, '')))
    if (missing.length > content.length / 2) {
      written.push(`opening does not describe the art (mark words absent: ${missing.join(', ')})`)
    }

    // ── GENERATED half ──────────────────────────────────────────────────
    const issues = []
    for (const b of BANS) {
      if (!b.re.test(joined)) continue
      // A claim only counts when it is not sitting behind a negation. Fourth time
      // this eval has cried wolf and always the same way — see the note above
      // MIND_CLAIM. It fired 'promises his return' on "not whether he'll
      // return", which is cut 6 naming her smaller ask.
      if (b.claim && !asserts(joined, b.re)) continue
      issues.push(b.name)
    }
    const claim = assertsAboutHim(joined)
    if (claim) issues.push(`speaks for him ("${claim}")`)
    // A man is invented only when neither the headline nor her answer put him there.
    if (!MAN_PRESUPPOSED.has(hook) && !MAN_IN_HER_WORDS.test(answer) && /\b(he|him|his)\b/i.test(joined)) {
      issues.push('invents a man')
    }
    // still-think forbids reporting his mind in EITHER direction, softened included.
    // The softened forms get the SAME assertion test as the flat ones. Not a
    // special case — the guard bans stating his mind, and "whether you cross his
    // mind at all" states nothing; it quotes her question, which is the move the
    // approved copy makes on purpose. See --selftest: the assertion still bites.
    if (hook === 'still-think') {
      const soft = assertsSoftened(joined)
      if (soft) issues.push(`reports his mind ("${soft}")`)
    }
    if (hook === 'hiding-something') {
      const hit = firesHidingBan(joined)
      if (hit) issues.push(hit)
    }
    const echo = echoesOpening(opening, joined)
    if (echo.length) issues.push(`restates the opening ("${echo[0]}")`)

    // 🔴 THE GENERATED HALF MUST NAME THE RIGHT MARK, and until now nothing checked
    // it. Art coherence was tested on the WRITTEN opening only, so the model was
    // free to answer a bird with a paragraph about a road and the run still
    // printed a tick.
    //
    // It is not hypothetical. On the first live run after the arm-B rewrite, a
    // stale dev server was still serving the old registry, and the model replied
    // to a woman who had tapped BIRD with "that road in your cup doesn't end at
    // the rim", and to one who had tapped ANCHOR with "the heart sits low". Both
    // scored GENERATED clean. 18/18, and two of the transcripts described a cup
    // that does not exist.
    //
    // What is banned is naming ANOTHER option's mark, or a mark this device
    // retired. The right mark is not required — the model is often better off
    // moving past the picture to her, which the prompt explicitly asks for — but
    // naming the wrong one is always an error.
    const wrongMark = namesWrongMark(device, option, joined)
    if (wrongMark.length) issues.push(`names a mark that is not in her cup (${wrongMark.join(', ')})`)
    messages.forEach((m, i) => {
      const w = m.trim().split(/\s+/).length
      if (w > 25) issues.push(`msg ${i + 1} is ${w} words`)
    })

    console.log(`\n${'━'.repeat(78)}`)
    console.log(label)
    console.log('─'.repeat(78))
    console.log(`  AD       ${HEADLINES[hook]}`)
    console.log(`  EVELYN   ${opening}`)
    console.log(`  EVELYN   ${question}`)
    console.log(`           ${written.length ? '✗ WRITTEN  ' + written.join(' · ') : '✓ WRITTEN  clean'}`)
    console.log(`\n  SHE      ${answer}\n`)
    for (const m of messages) console.log(`  EVELYN   ${m}`)
    if (!dry) console.log(`           ${issues.length ? '✗ GENERATED  ' + issues.join(' · ') : '✓ GENERATED  clean'}`)

    const all = [...written, ...issues]
    results.push({ label, ok: !all.length, issues: all })
  }
 }
}

console.log(`\n${'━'.repeat(78)}\nSUMMARY`)
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.label}${r.ok ? '' : ' — ' + r.issues.join(' · ')}`)
const bad = results.filter((r) => !r.ok).length
console.log(`\n  ${results.length - bad}/${results.length} clean`)
process.exit(bad ? 1 : 0)
