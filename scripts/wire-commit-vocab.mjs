#!/usr/bin/env node
// wire-commit-vocab — apply every registry edit point for the six commitment landers.
//
//   node scripts/wire-commit-vocab.mjs
//
// Written as a script rather than by hand because the rosters are un-synced by design: the
// client registry, the shadow reads, the server vocab and the route validator all have to move
// together or the chat handoff 400s. It refuses to run twice.
//
// 🔴 TWO TRAPS THIS FILE EXISTS TO HOLD:
//
//  1. THE REGISTRY FILES ARE CRLF on a Windows checkout, and every anchor here is written with
//     LF. Unnormalised, each anchor matches ZERO times and it reads as a bad anchor rather than
//     a bad line ending. Load normalises; write restores the file's own convention.
//
//  2. COMMITMENT_AGEBAND_HOOKS AND TAROT_HOOKS END WITH THE IDENTICAL RUN
//     ("...how-much-longer-commit / commit-or-company / ]"), so a tail anchor matches twice and
//     would append the new hooks to whichever came first — silently filing two commitment
//     landers into the wrong roster. Array edits are anchored on the DECLARATION name.
//
// THE FOLDS (7 and 6 authored cuts -> 4 registry beats):
//   natural : 1 | 2 | 3+4+5+6 joined by newline | 7
//   shadow  : 1+2 joined by newline | 3 | 4+5 joined by newline | 6
import { readFileSync, writeFileSync } from 'node:fs'

const READS = 'client/src/content/tarotReads.ts'
const SHADOW_FILE = 'client/src/content/tarotReadsShadow.ts'
const ROUTES = 'server/routes.ts'
const PROMPTS = 'server/lib/prompts.ts'

const AGE = ['cards-expecting-too-much', 'cards-played-the-wife']
const CONN = ['cards-instant-connection-commit', 'cards-connection-without-commitment', 'cards-connection-heading-commit', 'cards-stopping-him-committing']
const ALL = [...AGE, ...CONN]

const OPENERS = {
  'cards-expecting-too-much': "Before I look closer, tell me… what has he said about the future that you've been holding on to?",
  'cards-played-the-wife': 'Before I look closer, tell me… what did you find yourself doing that nobody ever asked you to do?',
  'cards-instant-connection-commit': 'Before I look closer, tell me… what was it about that first meeting that you still come back to?',
  'cards-connection-without-commitment': 'Before I look closer, tell me… what keeps you holding on to this one?',
  'cards-connection-heading-commit': 'Before I look closer, tell me… what would it take for you to call this settled?',
  'cards-stopping-him-committing': 'Before I look closer, tell me… when did you first notice him stop short of it?',
}

const CONTEXT = {
  'cards-expecting-too-much': 'She is asking whether her own expectations are the problem, and usually indicts her timing in the same breath — whether she moved too early as well as whether she wants too much.',
  'cards-played-the-wife': 'She has carried the role of a wife without ever being given the title, and is asking why. She may be long-cohabiting, long-separated, or holding that role beside a woman who holds it in fact.',
  'cards-instant-connection-commit': 'The connection felt immediate to her and has not turned into anything he will name. She may not have seen or spoken to him for a long time.',
  'cards-connection-without-commitment': 'She is asking how much longer a strong connection can go on with nothing named, and is really asking whether to keep spending her life on it.',
  'cards-connection-heading-commit': 'She is asking whether this is moving toward something or staying exactly as it is, and is weighing whether to keep hoping.',
  'cards-stopping-him-committing': 'She has already decided something is in his way and wants it named. Underneath, she is asking whether that something is her.',
}

const TENDENCY = {
  'cards-expecting-too-much': 'that what she wants is reasonable and her timing was not the mistake. NEVER rule that she expects too much and NEVER rule that he should have committed by now — the first blames her, the second is a verdict on a man you have never met. NEVER give a date. Route the "why" to where HE has not spoken, and affirm HER right to want a future named',
  'cards-played-the-wife': 'that the role she carried was real work and was never given a name. NEVER mention, imply or rule on another woman. NEVER predict a marriage, a proposal or an engagement. NEVER discuss money, property, a home or legal standing. NEVER rule that the years were wasted or that she has nothing to show. Read her POSITION — a role nobody put a word to — and affirm what she actually did',
  'cards-instant-connection-commit': 'that what she felt at the start was real and that the speed of a feeling is not a promise about his pace. NEVER assume they are still in contact, have met recently, or can speak — she may be describing a man she has not seen in years. NEVER convict him of using her and NEVER pronounce that he will never commit',
  'cards-connection-without-commitment': 'that the strength of the connection was never what was in doubt. NEVER supply a length, a number, a date or a season — refusing the number IS the answer here. NEVER assume ongoing contact. Affirm that the not-knowing is the weight she has been carrying, and that no reader can hand her a limit',
  'cards-connection-heading-commit': 'that a pause is not the same as a full stop, and that nothing has been decided out loud. NEVER answer either half of her question — do not promise it is heading for commitment and do not pronounce that it will stay as it is. NEVER assume ongoing contact. Read the fact that she has been given neither answer',
  'cards-stopping-him-committing': 'that whatever is in his way, it is not her. NEVER name his motive, his fear or his reason — the card cannot supply one. NEVER affirm that a man she has met only online is real or genuine. NEVER rule on another relationship he may be in. NEVER confirm what a previous reader told her. Answer the fear underneath, which is that she is the thing lacking',
}

const HOOK_UNION = `
  // Commitment age-matrix additions (2026-08-27). Same angle as the twelve above.
  //
  // 🔴 'cards-expecting-too-much' carries a phrase its own guard bans. "too much" is on the
  // whole-beat blame list for this angle, so the read PARAPHRASES her question rather than
  // quoting the ad — the one lander on the funnel where message scent is deliberately inexact.
  //
  // 🔴 'cards-played-the-wife' reaches an audience its headline does not describe. The VOC pull
  // (2026-08-27) is dominated by women whose rival holds the wife role in fact, marriages ended
  // after decades, and live property disputes. Raised with the operator; he chose to keep the
  // lander, so four bans carry the safety instead — see TAROT_HOOK_TENDENCY and
  // tests/tarot-commit-vocab-manuscripts.test.ts.
  | 'cards-expecting-too-much' // Am I expecting too much, or should he have committed by now?
  | 'cards-played-the-wife' // I've played the wife without the commitment. Why?
  // Commitment CONNECTION-VOCAB hooks (2026-08-27). Their own angle, 'commitment-connection' —
  // one angle per keyword, the convention the soulmate keyword families already use, because
  // there the keyword IS the variable under test.
  //
  // 🔴 NOT folded into 'commitment-ageband'. That family varies the AGE BAND, which lives in the
  // ad set and never in the copy. This one varies a WORD, and the word is in every headline.
  //
  // 🔴 "this connection" is very often NOT a current relationship — the corpus uses it for men
  // not seen in twenty years ("no contact between us for 20 years"). No read here may presume
  // contact, a meeting, or that she can speak to him.
  //
  // ⚠ 'cards-stopping-him-committing' is the family's CONTROL: the same commitment-obstacle
  // question with the keyword removed. It is deliberately the odd one out.
  | 'cards-instant-connection-commit' // The connection was instant. So why won't he commit?
  | 'cards-connection-without-commitment' // How long can a connection this strong go without commitment?
  | 'cards-connection-heading-commit' // Is this connection heading for commitment, or staying as it is?
  | 'cards-stopping-him-committing' // Something is stopping him from committing. What is it?`

const CONNECTION_ARRAY = `

// The commitment CONNECTION-VOCAB roster (2026-08-27). Its own reporting label so it can be read
// against the twelve age-matrix landers and the three original commitment hooks rather than
// pooling into either. Without this array these fall through to 'decode-him' (see angleForHook)
// and vanish as a family in PostHog and in the gate's per-lander table.
export const COMMITMENT_CONNECTION_HOOKS: TarotHook[] = [
  'cards-instant-connection-commit',
  'cards-connection-without-commitment',
  'cards-connection-heading-commit',
  'cards-stopping-him-committing',
]`

// ── manuscripts ──────────────────────────────────────────────────────────────
function manuscript(path) {
  const landers = new Map()
  let cur = null
  for (const line of readFileSync(path, 'utf8').replace(/\r/g, '').split('\n')) {
    if (line.startsWith('### `cards-')) {
      cur = { hook: line.split('`')[1], headline: line.split('*"')[1].slice(0, -2), read: {} }
      landers.set(cur.hook, cur)
      continue
    }
    if (!cur || !line.startsWith('| **')) continue
    const m = line.match(/^\| \*\*(\d)\*\* [^|]*\|(.+)\|\s*$/)
    if (!m) continue
    cur.read[Number(m[1])] = m[2].split('|').map((c) => c.trim()).filter(Boolean)
  }
  return landers
}

const natural = manuscript('fb-tarot/docs/writeups/natural/REVIEW-commit-vocab-2026-08-27.md')
const shadow = manuscript('fb-tarot/docs/writeups/shadow/REVIEW-commit-vocab-2026-08-27.md')

const NL = String.fromCharCode(10)
const foldNatural = (r, i) => [r[1][i], r[2][i], [r[3][i], r[4][i], r[5][i], r[6][i]].join(NL), r[7][i]]
const foldShadow = (r, i) => [[r[1][i], r[2][i]].join(NL), r[3][i], [r[4][i], r[5][i]].join(NL), r[6][i]]

const q = (s) => JSON.stringify(s)
const readBlock = (hook, fold, src) =>
  `    '${hook}': {\n` +
  ['a', 'b', 'c'].map((letter, i) =>
    `      ${letter}: [\n` + fold(src.get(hook).read, i).map((b) => `        ${q(b)},`).join('\n') + '\n      ],'
  ).join('\n') +
  '\n    },'

// ── file helpers ─────────────────────────────────────────────────────────────
const files = new Map()
const wasCRLF = new Map()
function load(f) {
  if (!files.has(f)) {
    const raw = readFileSync(f, 'utf8')
    wasCRLF.set(f, raw.includes('\r\n'))
    files.set(f, raw.replace(/\r\n/g, '\n'))
  }
  return files.get(f)
}
function once(text, anchor, what) {
  const n = text.split(anchor).length - 1
  if (n !== 1) { console.error(`🔴 ${what}: anchor matched ${n}× (need exactly 1)`); process.exit(1) }
}
/** Insert into the array declared as `decl`, just before its closing bracket. */
function inArray(file, decl, addition, after = '') {
  const text = load(file)
  const at = text.indexOf(decl)
  if (at < 0) { console.error(`🔴 not found: ${decl}`); process.exit(1) }
  const close = text.indexOf('\n]', at)
  files.set(file, text.slice(0, close) + addition + '\n]' + after + text.slice(close + 2))
}
/** Insert into the object literal declared as `decl`, just before its closing brace. */
function inObject(file, decl, addition) {
  const text = load(file)
  const at = text.indexOf(decl)
  if (at < 0) { console.error(`🔴 not found: ${decl}`); process.exit(1) }
  const close = text.indexOf('\n}', at)
  files.set(file, text.slice(0, close) + '\n' + addition + text.slice(close))
}

if (load(READS).includes("'cards-expecting-too-much'")) {
  console.error('🔴 already wired — refusing to run twice.')
  process.exit(2)
}

// 1 · the TarotHook union
{
  const a = "  | 'cards-commit-or-company' // Does he want to commit, or does he just want company?"
  once(load(READS), a, 'TarotHook union')
  files.set(READS, load(READS).replace(a, a + HOOK_UNION))
}

// 2 · the angle arrays — BY NAME (see trap 2 at the top of this file)
inArray(READS, 'export const COMMITMENT_AGEBAND_HOOKS: TarotHook[] = [', "\n  'cards-expecting-too-much',\n  'cards-played-the-wife',", CONNECTION_ARRAY)

// 3 · the TarotAngle union
{
  const a = "  | 'commitment-ageband'"
  once(load(READS), a, 'TarotAngle union')
  files.set(READS, load(READS).replace(a, a + "\n  | 'commitment-connection'"))
}

// 4 · angleForHook
{
  const a = "  if (COMMITMENT_AGEBAND_HOOKS.includes(hook)) return 'commitment-ageband'"
  once(load(READS), a, 'angleForHook')
  files.set(READS, load(READS).replace(a, a + "\n  if (COMMITMENT_CONNECTION_HOOKS.includes(hook)) return 'commitment-connection'"))
}

// 5 · TAROT_HOOKS
inArray(READS, 'export const TAROT_HOOKS: TarotHook[] = [', '\n' + ALL.map((h) => `  '${h}',`).join('\n'))

// 6 · HEADLINES  ·  7 · the opener map
inObject(READS, 'export const HEADLINES: Record<TarotHook, string> = {',
  '  // Commitment age-matrix + connection-vocab (2026-08-27).\n' + ALL.map((h) => `  '${h}': ${q(natural.get(h).headline)},`).join('\n'))
inObject(READS, 'const TAROT_QUESTION: Record<TarotHook, string> = {',
  '  // Commitment age-matrix + connection-vocab (2026-08-27). Every opener invites HER account\n' +
  '  // rather than demanding proof, and echoes its headline without quoting a banned phrase.\n' +
  ALL.map((h) => `  '${h}': ${q(OPENERS[h])},`).join('\n'))

// 8 · the natural reads, into RETURN_MHF
{
  const text = load(READS)
  const deckAt = text.indexOf('const RETURN_MHF: CardSetConfig = {')
  const readsAt = text.indexOf('\n  reads: {', deckAt)
  if (deckAt < 0 || readsAt < 0) { console.error('🔴 RETURN_MHF reads not found'); process.exit(1) }
  const insertAt = readsAt + '\n  reads: {'.length
  const banner = `
    // ── Commitment age-matrix + connection-vocab (2026-08-27) ────────────────────
    // Natural Tarot-Cut. Seven authored cuts folded 1 | 2 | 3+4+5+6 | 7, from
    // fb-tarot/docs/writeups/natural/REVIEW-commit-vocab-2026-08-27.md — approved copy,
    // folded verbatim. Guarded by tests/tarot-commit-vocab-manuscripts.test.ts, every ban of
    // which was proven to fire by scripts/guard-tripwire-commit-vocab.mjs.
`
  files.set(READS, text.slice(0, insertAt) + banner + ALL.map((h) => readBlock(h, foldNatural, natural)).join('\n') + text.slice(insertAt))
}

// 9 · the shadow reads
{
  const text = load(SHADOW_FILE)
  const a = "  'return-mhf': {"
  once(text, a, 'SHADOW_READS return-mhf')
  const insertAt = text.indexOf(a) + a.length
  const banner = `
    // ── Commitment age-matrix + connection-vocab (2026-08-27) ────────────────────
    // Inherited Shadow. Six authored beats folded 1+2 | 3 | 4+5 | 6, from
    // fb-tarot/docs/writeups/shadow/REVIEW-commit-vocab-2026-08-27.md — approved copy,
    // transferred verbatim. Beat 5 carries one handle (position, timing or manner, once each
    // across the three cards) plus the mandatory origin finding.
`
  files.set(SHADOW_FILE, text.slice(0, insertAt) + banner + ALL.map((h) => readBlock(h, foldShadow, shadow)).join('\n') + text.slice(insertAt))
}

// 10 · the route validator
{
  const text = load(ROUTES)
  const a = '"cards-commit-or-company"]'
  once(text, a, 'validHooks')
  files.set(ROUTES, text.replace(a, `"cards-commit-or-company", ${ALL.map((h) => `"${h}"`).join(', ')}]`))
}

// 11 · the server vocab
inObject(PROMPTS, 'const TAROT_HOOK_CONTEXT: Record<string, string> = {',
  '  // Commitment age-matrix + connection-vocab (2026-08-27).\n' + ALL.map((h) => `  '${h}': ${q(CONTEXT[h])},`).join('\n'))
inObject(PROMPTS, 'const TAROT_HOOK_TENDENCY: Record<string, string> = {',
  `  // Commitment age-matrix + connection-vocab (2026-08-27).
  //
  // ⚠ The twelve age-matrix landers shipped on 2026-08-26 with NO entry here at all, so they
  // inherit DEFAULT_TAROT_TENDENCY. These six do not, because four of them carry bans the
  // default cannot express — no other woman, no length, no motive, no presumed contact — and a
  // guard file stricter than the tendency means Version B and Version C contradict each other
  // on the same lander.\n` + ALL.map((h) => `  '${h}': ${q(TENDENCY[h])},`).join('\n'))

for (const [f, text] of files) writeFileSync(f, wasCRLF.get(f) ? text.replace(/\n/g, '\r\n') : text)
console.log(`wired ${ALL.length} landers across ${files.size} files:\n  ${[...files.keys()].join('\n  ')}`)
