#!/usr/bin/env npx tsx
// wire-money-alone-commit-2026-08-25 — fold the two approved REVIEW manuscripts (44 new
// hooks: 11 money-age-energy, 21 alone-age/energy + vocab-matrix, 12 commit-age-matrix) into
// the registry, both arms. Verbatim-verified against the manuscripts. Reuses the existing
// MONEY_TAROT_HOOKS / LONELINESS_TAROT_HOOKS frames as-is (no new guard prose) and the default
// decode-him fallthrough for the commit family (no frame Set), per operator instruction
// 2026-08-25: "no guard".
//
//   npx tsx scripts/wire-money-alone-commit-2026-08-25.mts [--check]
import { readFileSync, writeFileSync } from 'node:fs'

const NATURAL_MS = 'fb-tarot/docs/drafts/natural/REVIEW-money-alone-commit-2026-08-25.md'
const SHADOW_MS = 'fb-tarot/docs/drafts/shadow/REVIEW-money-alone-commit-2026-08-25.md'
const REG = 'client/src/content/tarotReads.ts'
const PROMPTS = 'server/lib/prompts.ts'
const ROUTES = 'server/routes.ts'
const SHADOW_DIR = 'fb-tarot/docs/drafts/shadow/'
const CHECK = process.argv.includes('--check')

// ── per-hook metadata: family, TAROT_QUESTION (all 44), TAROT_HOOK_CONTEXT + TENDENCY ─────
// (money + loneliness only — commit relies on the existing decode-him fallthrough / DEFAULT
// tendency, same as several existing decode-him hooks with no bespoke entry).
type Family = 'money' | 'loneliness' | 'commit'
type Meta = { family: Family; question: string; context?: string; tendency?: string }

const META: Record<string, Meta> = {
  // ── money-age-energy (11) — reuse MONEY_TAROT_HOOKS as-is ──────────────────────────────
  'cards-money-time-running-out': {
    family: 'money',
    question: "Before I look closer, tell me… what does 'running out of time' actually feel like day to day for you?",
    context: 'She feels time pressing in on her money situation and is asking whether her own energy is what has kept it blocked.',
    tendency: "that her energy was never the missing tool, and time feeling short does not make her energy the block. NEVER let the pressure of time become a reason to blame her energy, and never turn 'running out of time' into a countdown or a length of time",
  },
  'cards-money-has-to-last': {
    family: 'money',
    question: "Before I look closer, tell me… what is it that has to last, and for how long?",
    context: 'She is stretching what she already has and asking what is keeping more money from reaching her.',
    tendency: "that what she already has was never proof there is no more coming, and stretching it carefully is not why the rest is blocked. NEVER treat 'has to last' as evidence she must have less, and never suggest budgeting or cutting back as the fix",
  },
  'cards-trusted-loss-blocking-money': {
    family: 'money',
    question: 'Before I look closer, tell me… what did you lose, and how did trusting them play into it?',
    context: 'She lost money through someone she trusted, and is asking whether that loss is still the reason money stays blocked now.',
    tendency: 'that the loss does not have permanent hold over what comes next, without naming, describing or judging the person she trusted. NEVER identify, characterize or excuse that person, NEVER suggest anything about them returns or is recovered, and never treat the past loss as proof nothing new can arrive',
  },
  'cards-working-money-by-now': {
    family: 'money',
    question: "Before I look closer, tell me… what did you think you'd have by now that you don't?",
    context: 'She is still working past the point she expected to have more to show for it, and is asking what has kept the money from matching the effort.',
    tendency: "that her continued effort was never the failure, and working past 'by now' does not mean she did something wrong. NEVER let 'should have by now' become a deadline the card enforces, and never suggest she should have worked differently",
  },
  'cards-nothing-put-away': {
    family: 'money',
    question: "Before I look closer, tell me… what does 'nothing put away' feel like when you think about it?",
    context: 'She has nothing saved and is asking whether her own energy explains why nothing stays.',
    tendency: 'that her energy is not a missing tool and having nothing put away is not a verdict on her. NEVER agree that her energy blocks her money, never mindset, vibration, deserving or self-sabotage, and never hand her a saving practice or financial instruction',
  },
  'cards-money-cant-stop-working': {
    family: 'money',
    question: "Before I look closer, tell me… what would it take for you to be able to stop?",
    context: 'She cannot yet stop working and is asking what is still holding her money back regardless.',
    tendency: 'that needing to keep working is not itself the block, and the block is separate from whether she works more or less. NEVER tell her to keep working or to stop, and never treat her continued work as either the cause or the fix',
  },
  'cards-earn-and-gone': {
    family: 'money',
    question: 'Before I look closer, tell me… where do you notice it going, when it goes?',
    context: 'She earns money and watches it disappear, and is asking what is blocking it from staying.',
    tendency: 'that earning it was never the failure — the block sits after the earning, not in her ability to make it. NEVER suggest she spends carelessly or should budget differently, and never turn this into financial advice about saving or spending',
  },
  'cards-talk-myself-out': {
    family: 'money',
    question: "Before I look closer, tell me… what's the last thing you talked yourself out of?",
    context: 'She describes talking herself out of things and is asking whether that explains what is blocking her money.',
    tendency: "that her own hesitation is not enough on its own to explain the block. NEVER let her self-described hesitation become the full verdict, and never hand her a confidence practice or tell her to act differently",
  },
  'cards-paycheck-to-paycheck': {
    family: 'money',
    question: "Before I look closer, tell me… what would 'getting started' actually look like for you?",
    context: 'She is living paycheck to paycheck and cannot get a financial start going, and is asking whether her energy is why.',
    tendency: 'that her energy is not the missing piece keeping her from starting. NEVER agree her energy blocks the start, never mindset or vibration language, and never hand her a budgeting or savings instruction',
  },
  'cards-money-reach-me': {
    family: 'money',
    question: 'Before I look closer, tell me… who is it you keep comparing yourself to when you think this?',
    context: 'She sees others getting ahead financially and is asking why the money has not reached her the same way.',
    tendency: "that other people's progress says nothing about a lack in her. NEVER compare her to anyone else's outcome as a verdict on her, and never rank or measure her against what others appear to have",
  },
  'cards-paying-what-i-owe': {
    family: 'money',
    question: 'Before I look closer, tell me… what are you paying down right now that weighs on you most?',
    context: 'She keeps paying down what she owes and is asking why the money still will not move.',
    tendency: "that meeting her obligations responsibly is not what is holding the money back. NEVER turn her payments into the accusation, and never give repayment or financial advice about what to pay, stop paying or change",
  },

  // ── alone-age/energy + vocab matrix (21) — reuse LONELINESS_TAROT_HOOKS as-is ───────────
  'cards-destined-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… when did being alone first start feeling like something decided rather than something happening?',
    context: 'She feels her solitude has been decided for her and is asking why that feeling has taken hold.',
    tendency: 'that nothing has assigned her to solitude — the feeling of destiny is not evidence of one. NEVER say she is destined to be alone or destined for someone, and never speak of fate, plan or purpose in either direction',
  },
  'cards-how-long-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what makes the waiting feel open-ended rather than temporary?',
    context: 'She is asking for a length of time on how much longer she will be alone.',
    tendency: 'that no length can honestly be given, and the open question is not itself a life sentence. NEVER give a date, a duration or any number of days, weeks, months or years, and never say or imply forever in either direction',
  },
  'cards-love-not-happened-yet': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… is there a moment you keep going back to, wondering if that was the chance?',
    context: 'She is asking whether she let a chance at love slip past or whether it simply has not arrived yet.',
    tendency: 'that love is not something she used up in one missed moment. NEVER say she missed her chance and never promise a chance is still coming on any timeline, and never name or hint at who or when',
  },
  'cards-alone-for-years': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what do you think has kept you here the longest?',
    context: 'She has been alone for years and is asking what is keeping her there.',
    tendency: 'that the years alone are not proof she caused her own solitude. NEVER let the length of time become evidence against her, and never give a date or promise for when it changes',
  },
  'cards-more-years-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what would count as something changing, for you?',
    context: 'She is asking for a count of years before her situation changes.',
    tendency: 'that no number of years can honestly be given, and the wait is not itself a permanent sentence. NEVER give a count, a date or any duration, and never call the wait endless or promise its end',
  },
  'cards-held-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… does it feel like something is holding you, or like this has just become normal?',
    context: 'She is asking whether something specific is holding her in solitude or whether this has simply become her life.',
    tendency: "that being alone now is not a fixed identity or a final verdict on her life. NEVER confirm 'this is just my life now' as permanent, and never name a person, cause or date holding her there",
  },
  'cards-empty-house-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what changed in the house that made the quiet louder?',
    context: 'Her house has emptied out and being alone feels harder now than it used to.',
    tendency: 'that feeling it more now is not a weakness or a sign she is failing at being alone. NEVER invent who or what left the house, and never suggest a fix, activity or practice for the empty space',
  },
  'cards-alone-a-decade': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what has the last ten years taught you about waiting?',
    context: 'She has been alone for ten years and is asking how much longer that continues.',
    tendency: 'that ten years is not proof of forever, and no further length can honestly be given. NEVER give a date, a duration or a number of years, and never call a decade evidence that nothing changes',
  },
  'cards-too-late-or-now': {
    family: 'loneliness',
    question: "Before I look closer, tell me… when you think 'too late', what exactly do you picture missing?",
    context: 'She is asking whether love has become too late for her or whether her current solitude is just where she stands right now.',
    tendency: 'that her present is not a verdict that love is over. NEVER say it is too late for her, and never give a date or promise of when love arrives',
  },
  'cards-alone-heavier-now': {
    family: 'loneliness',
    question: "Before I look closer, tell me… what's different about how it feels now compared to before?",
    context: 'Being alone has started to feel heavier to her than it did before, and she is asking why.',
    tendency: 'that feeling the weight more now is not a flaw or a failure to cope. NEVER invent a cause or event to explain the change, and never suggest she is handling it wrong',
  },
  'cards-alone-rest-of-life': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… when you picture the rest of your life, what part of it worries you most?',
    context: 'She is asking directly whether she will be alone for the rest of her life.',
    tendency: 'that no verdict can honestly be given on the rest of her life, in either direction. NEVER say she will be alone forever and NEVER promise she will not, and never give any date or timeframe',
  },
  'cards-meant-alone-still-time': {
    family: 'loneliness',
    question: "Before I look closer, tell me… what makes 'meant to be' feel more likely than 'not yet'?",
    context: 'She is asking whether solitude was meant for her or whether there is still time for that to change.',
    tendency: 'that nothing has assigned her to solitude and no countdown can honestly be given either. NEVER say she is meant to be alone, never speak of fate or destiny, and never give a length of remaining time',
  },
  'cards-know-not-destined-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what would actually convince you, if something did?',
    context: 'She wants to know how long until she can be sure she is not destined to be alone.',
    tendency: 'that nothing has destined her to solitude, and no timeline can honestly certify that either way. NEVER call her destined to be alone, never give a date or length of time, and never promise certainty will arrive on a schedule',
  },
  'cards-destined-or-not-yet': {
    family: 'loneliness',
    question: "Before I look closer, tell me… which one do you catch yourself believing on your hardest days?",
    context: "She is choosing between two explanations: that she's destined to be alone, or that love simply has not happened for her yet.",
    tendency: 'that neither destiny nor a countdown can honestly be confirmed — nothing has been decided about her either way. NEVER call her destined to be alone, and never promise or date when love happens',
  },
  'cards-god-with-me-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… how does your faith sit alongside the loneliness, most days?',
    context: 'She holds onto her faith that God is with her and is asking why she is still alone despite that.',
    tendency: 'that her faith is not the reason she is alone, and this reading does not speak for God. NEVER rule on what God intends or has decided for her, never say her faith explains the solitude, and never give a date or length of time',
  },
  'cards-god-mean-me-alone': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what have you been asking for in your prayers about this?',
    context: 'She is asking how much longer she believes God intends for her to remain alone.',
    tendency: 'that this reading cannot speak for what God intends or give a length of time. NEVER claim to know what God means by her solitude, never say it is a test, lesson or punishment, and never give a date or duration',
  },
  'cards-gods-intention-alone': {
    family: 'loneliness',
    question: "Before I look closer, tell me… which feels more true lately — that it's intended, or that someone's coming?",
    context: 'She is asking whether her solitude is God\'s intention for her, or whether someone is coming.',
    tendency: "that this reading cannot rule on God's intention or promise a person's arrival. NEVER claim to know God's plan for her, and never promise or name someone coming",
  },
  'cards-love-never-stays': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… looking back, is there a pattern to how it ends, or does each one feel different?',
    context: 'She has had love end more than once and is asking why it never stays with her.',
    tendency: "that separate endings are not proof of a defect in her. NEVER let 'never' become a verdict on her character, and never judge, name or excuse the people who left",
  },
  'cards-connection-kept-alive': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what have you been doing to keep it going, that they have not?',
    context: 'She has been the only one keeping a connection going and is asking why that fell to her alone.',
    tendency: 'that wanting the connection and carrying it were not her mistake. NEVER judge, name or explain the other person\'s motives, and never tell her to let go or keep holding on',
  },
  'cards-wait-on-connection': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what are you actually waiting for them to do?',
    context: 'She is waiting on an uncertain connection and asking how much longer that wait continues.',
    tendency: 'that no length of time can honestly be given for this wait, and the decision of whether to keep waiting stays hers. NEVER give a date or duration, and never choose for her whether to stay or move on',
  },
  'cards-real-connection-coming': {
    family: 'loneliness',
    question: 'Before I look closer, tell me… what would tell you it was real, if it did arrive?',
    context: 'She is asking whether a real connection is on its way or whether she remains alone.',
    tendency: 'that being alone now does not prove she lacks the capacity for real connection. NEVER promise someone is coming, and never confirm she stays alone permanently',
  },

  // ── commit-age-matrix (12) — no frame Set, same decode-him fallthrough as cards-wont-commit.
  // No context/tendency entries: relies on the existing DEFAULT_TAROT_TENDENCY, same as several
  // sibling decode-him hooks with no bespoke entry. Operator instruction 2026-08-25: "no guard".
  'cards-picking-noncommittal-men': { family: 'commit', question: "Before I look closer, tell me… looking back, what do the men you've picked tend to have in common?" },
  'cards-time-to-commit-before-moving-on': { family: 'commit', question: "Before I look closer, tell me… what would tell you it's time to stop waiting?" },
  'cards-slow-commit-or-wasting-time': { family: 'commit', question: 'Before I look closer, tell me… what does he do that makes it hard to tell which one it is?' },
  'cards-doing-wrong-wont-commit': { family: 'commit', question: "Before I look closer, tell me… what's the story you tell yourself about why he hasn't committed?" },
  'cards-wait-commit-this-time': { family: 'commit', question: "Before I look closer, tell me… what's different about waiting this time than before?" },
  'cards-scared-or-never-commit': { family: 'commit', question: 'Before I look closer, tell me… what have you seen in him that makes you wonder which one it is?' },
  'cards-wont-commit-years-together': { family: 'commit', question: "Before I look closer, tell me… what has he said, if anything, about why he hasn't?" },
  'cards-years-before-commitment': { family: 'commit', question: 'Before I look closer, tell me… what would commitment actually need to look like, coming from him?' },
  'cards-commitment-uncertain-years': { family: 'commit', question: "Before I look closer, tell me… what's stayed the same the whole time you've been uncertain?" },
  'cards-no-time-to-waste-commit': { family: 'commit', question: 'Before I look closer, tell me… what makes the time feel like it\'s running out for you both?' },
  'cards-how-much-longer-commit': { family: 'commit', question: 'Before I look closer, tell me… what have you been telling yourself while you wait?' },
  'cards-commit-or-company': { family: 'commit', question: 'Before I look closer, tell me… what does he do that makes you wonder which one it is?' },
}

const ORDER = Object.keys(META)
if (ORDER.length !== 44) throw new Error(`expected 44 hooks in META, got ${ORDER.length}`)

// ── generic table parser (matches natural-36-to-registry.mts / shadow drafts exactly) ──────
function parseManuscript(path: string, rowCount: number) {
  const md = readFileSync(path, 'utf8')
  const blocks = md.split(/^### `/m).slice(1)
  const out: Record<string, { headline: string; cards: Record<string, string[]> }> = {}
  for (const b of blocks) {
    const hook = b.slice(0, b.indexOf('`'))
    const headMatch = b.match(/— \*"(.+?)"\*/)
    if (!headMatch) throw new Error(`${hook}: no headline found`)
    const rows = [...b.matchAll(/^\| \*\*(\d)\*\* [^|]*\|(.+)\|\s*$/gm)]
    if (!rows.length) continue
    const grid: Record<string, Record<number, string>> = {}
    for (const r of rows) {
      const cells = r[2].split('|').map((c) => c.trim()).filter(Boolean)
      ;['a', 'b', 'c'].forEach((card, i) => {
        if (cells[i]) (grid[card] ??= {})[Number(r[1])] = cells[i]
      })
    }
    const per: Record<string, string[]> = {}
    for (const card of ['a', 'b', 'c']) {
      const seq = Array.from({ length: rowCount }, (_, i) => grid[card]?.[i + 1])
      if (seq.some((x) => !x)) throw new Error(`${hook}/${card}: missing a row (expected ${rowCount})`)
      per[card] = seq as string[]
    }
    out[hook] = { headline: headMatch[1], cards: per }
  }
  return out
}

const naturalParsed = parseManuscript(NATURAL_MS, 7)
const shadowParsed = parseManuscript(SHADOW_MS, 6)

console.log(`natural manuscript: ${Object.keys(naturalParsed).length} landers`)
console.log(`shadow manuscript:  ${Object.keys(shadowParsed).length} landers`)

for (const hook of ORDER) {
  if (!naturalParsed[hook]) throw new Error(`${hook}: missing from natural manuscript`)
  if (!shadowParsed[hook]) throw new Error(`${hook}: missing from shadow manuscript`)
  if (naturalParsed[hook].headline !== shadowParsed[hook].headline) {
    throw new Error(`${hook}: headline mismatch\n  natural: ${naturalParsed[hook].headline}\n  shadow:  ${shadowParsed[hook].headline}`)
  }
}
if (Object.keys(naturalParsed).length !== 44) throw new Error(`natural manuscript has ${Object.keys(naturalParsed).length} landers, expected 44`)
if (Object.keys(shadowParsed).length !== 44) throw new Error(`shadow manuscript has ${Object.keys(shadowParsed).length} landers, expected 44`)
console.log('✓ 44/44 hooks present in both manuscripts, headlines match')

const HEADLINE: Record<string, string> = {}
for (const hook of ORDER) HEADLINE[hook] = naturalParsed[hook].headline

// ── 1. write shadow JSON drafts (same shape as the 37 existing files) ──────────────────────
for (const hook of ORDER) {
  const d = shadowParsed[hook]
  const draft = {
    hook,
    headline: d.headline,
    method: 'inherited-shadow',
    note: `Wired 2026-08-25 from ${SHADOW_MS} — approved copy, transferred verbatim. Reuses the existing ${META[hook].family === 'money' ? 'MONEY_TAROT_HOOKS' : META[hook].family === 'loneliness' ? 'LONELINESS_TAROT_HOOKS' : 'default decode-him'} frame; no new guard.`,
    decks: { 'return-mhf': { a: d.cards.a, b: d.cards.b, c: d.cards.c } },
  }
  if (!CHECK) writeFileSync(`${SHADOW_DIR}${hook}.json`, JSON.stringify(draft, null, 2) + '\n')
}
console.log(CHECK ? 'shadow drafts parsed only (--check)' : `wrote ${ORDER.length} shadow draft JSON files`)

// ── 2. patch client/src/content/tarotReads.ts ───────────────────────────────────────────────
let reg = readFileSync(REG, 'utf8')

const findOnce = (needle: string, label: string) => {
  const i = reg.indexOf(needle)
  if (i === -1) throw new Error(`anchor not found: ${label}`)
  if (reg.indexOf(needle, i + 1) !== -1) throw new Error(`anchor not unique: ${label}`)
  return i
}

// 2a. TarotHook union — insert right after the TRUE last member ('cards-heal-first'),
// before `export type TarotCard`. 🔴 NOT before `export type TarotDeck` — that is a LATER,
// unrelated declaration; TarotCard/TarotOption/TarotVersion/TarotMethod sit in between, and
// inserting there silently merges new members into TarotMethod's union instead (no syntax
// error, since a line starting with `|` legally continues WHATEVER union type alias came
// last — found via bisection after a first pass wired every new hook into the wrong type).
{
  const anchor = `export type TarotCard = 'a' | 'b' | 'c' // the option the visitor tapped (A/B/C)`
  const i = findOnce(anchor, 'TarotCard (TarotHook insertion point)')
  const lines = ORDER.map((h) => `  | '${h}' // ${HEADLINE[h]}`).join('\n')
  const block = `// ── Money-age-energy, alone-age/energy and commit-age-matrix hooks (2026-08-25) ──\n` +
    `// 44 new hooks, both Natural + Shadow arms, wired verbatim from the approved manuscripts.\n` +
    `// Money reuses MONEY_TAROT_HOOKS as-is; alone reuses LONELINESS_TAROT_HOOKS as-is; commit\n` +
    `// has no frame Set, same decode-him fallthrough as cards-wont-commit. No new guard.\n${lines}\n`
  reg = reg.slice(0, i) + block + reg.slice(i)
}

// 2b. TAROT_HOOKS array — insert before its closing `]`
{
  const openAnchor = 'export const TAROT_HOOKS: TarotHook[] = ['
  const start = findOnce(openAnchor, 'TAROT_HOOKS open')
  let depth = 0, end = -1
  for (let i = start + openAnchor.length - 1; i < reg.length; i++) {
    if (reg[i] === '[') depth++
    else if (reg[i] === ']') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('TAROT_HOOKS: unbalanced brackets')
  const lines = ORDER.map((h) => `  '${h}',`).join('\n')
  reg = reg.slice(0, end) + lines + '\n' + reg.slice(end)
}

// 2c. HEADLINES — insert after the cards-heal-first line
{
  const anchor = `  'cards-heal-first': 'Do I need to heal before my soulmate arrives?',\n`
  const i = findOnce(anchor, 'HEADLINES tail (cards-heal-first)')
  const insertAt = i + anchor.length
  const lines = ORDER.map((h) => `  '${h}': ${JSON.stringify(HEADLINE[h])},`).join('\n')
  reg = reg.slice(0, insertAt) + lines + '\n' + reg.slice(insertAt)
}

// 2d. TAROT_QUESTION — insert after the cards-heal-first line
{
  const anchor = `  'cards-heal-first': 'Before I look closer, tell me… what is at the top of the list, before love?',\n`
  const i = findOnce(anchor, 'TAROT_QUESTION tail (cards-heal-first)')
  const insertAt = i + anchor.length
  const lines = ORDER.map((h) => `  '${h}': ${JSON.stringify(META[h].question)},`).join('\n')
  reg = reg.slice(0, insertAt) + lines + '\n' + reg.slice(insertAt)
}

// 2e. New angle arrays + TarotAngle union + angleForHook + MONEY_HOOKS spread
{
  const moneyHooks = ORDER.filter((h) => META[h].family === 'money')
  const lonelinessHooks = ORDER.filter((h) => META[h].family === 'loneliness')
  const commitHooks = ORDER.filter((h) => META[h].family === 'commit')

  // arrays, inserted right before `export const TAROT_HOOKS: TarotHook[] = [`
  const arraysAnchor = 'export const TAROT_HOOKS: TarotHook[] = ['
  const arraysAt = findOnce(arraysAnchor, 'TAROT_HOOKS (angle-array insertion point)')
  const arraysBlock =
    `// The three age-matrix angles (2026-08-25). Each is its own reporting label so these\n` +
    `// don't silently pool into an existing family's live numbers — money-ageband against\n` +
    `// MONEY_RETIRING/WORKING/ENERGY/PRAYER, loneliness-ageband against the 6-hook\n` +
    `// LONELINESS_HOOKS baseline, commitment-ageband against the 3-hook live COMMITMENT_HOOKS.\n` +
    `// None of the three carries a new guard — money and loneliness hooks run the existing\n` +
    `// MONEY_TAROT_HOOKS / LONELINESS_TAROT_HOOKS frame in prompts.ts unmodified; commitment\n` +
    `// hooks have no frame Set at all, same as cards-will-commit / cards-wont-commit /\n` +
    `// cards-ready-commit.\n` +
    `export const MONEY_AGEBAND_HOOKS: TarotHook[] = [\n${moneyHooks.map((h) => `  '${h}',`).join('\n')}\n]\n` +
    `export const LONELINESS_AGEBAND_HOOKS: TarotHook[] = [\n${lonelinessHooks.map((h) => `  '${h}',`).join('\n')}\n]\n` +
    `export const COMMITMENT_AGEBAND_HOOKS: TarotHook[] = [\n${commitHooks.map((h) => `  '${h}',`).join('\n')}\n]\n\n`
  reg = reg.slice(0, arraysAt) + arraysBlock + reg.slice(arraysAt)

  // TarotAngle union — after `| 'soulmate-healing'`
  const angleAnchor = `  | 'soulmate-healing'\n`
  const angleAt = findOnce(angleAnchor, 'TarotAngle union tail (soulmate-healing)')
  const angleInsertAt = angleAt + angleAnchor.length
  const angleBlock =
    `  // The three age-matrix angles (2026-08-25) — see MONEY_AGEBAND_HOOKS etc above.\n` +
    `  | 'money-ageband'\n  | 'loneliness-ageband'\n  | 'commitment-ageband'\n`
  reg = reg.slice(0, angleInsertAt) + angleBlock + reg.slice(angleInsertAt)

  // angleForHook — before `return 'decode-him'`
  const angleFnAnchor = `  return 'decode-him'\n}`
  const angleFnAt = findOnce(angleFnAnchor, "angleForHook return 'decode-him'")
  const angleFnBlock =
    `  if (MONEY_AGEBAND_HOOKS.includes(hook)) return 'money-ageband'\n` +
    `  if (LONELINESS_AGEBAND_HOOKS.includes(hook)) return 'loneliness-ageband'\n` +
    `  if (COMMITMENT_AGEBAND_HOOKS.includes(hook)) return 'commitment-ageband'\n`
  reg = reg.slice(0, angleFnAt) + angleFnBlock + reg.slice(angleFnAt)

  // MONEY_HOOKS spread — add ...MONEY_AGEBAND_HOOKS
  const moneyHooksAnchor = `const MONEY_HOOKS: TarotHook[] = [\n  ...MONEY_RETIRING_HOOKS,\n  ...MONEY_WORKING_HOOKS,\n  ...MONEY_ENERGY_HOOKS,\n  ...MONEY_PRAYER_HOOKS,\n]`
  const moneyHooksAt = findOnce(moneyHooksAnchor, 'MONEY_HOOKS spread')
  reg = reg.slice(0, moneyHooksAt) +
    moneyHooksAnchor.replace('...MONEY_PRAYER_HOOKS,\n]', '...MONEY_PRAYER_HOOKS,\n  ...MONEY_AGEBAND_HOOKS,\n]') +
    reg.slice(moneyHooksAt + moneyHooksAnchor.length)
}

// 2f. RETURN_MHF.reads — brace-count to find the READS sub-object's closing `}` (NOT
// RETURN_MHF's own outer closing brace, which is CardSetConfig's — inserting there once put
// 44 new hooks as siblings of `reads` on the CardSetConfig object instead of inside it, caught
// by tsc's "does not exist in type 'CardSetConfig'").
{
  const openAnchor = 'const RETURN_MHF: CardSetConfig = {'
  const start = findOnce(openAnchor, 'RETURN_MHF open')
  const readsAnchor = '\n  reads: {'
  const readsStart = reg.indexOf(readsAnchor, start)
  if (readsStart === -1) throw new Error('RETURN_MHF: reads: { not found')
  let depth = 0, end = -1
  for (let i = readsStart + readsAnchor.length - 1; i < reg.length; i++) {
    if (reg[i] === '{') depth++
    else if (reg[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('RETURN_MHF.reads: unbalanced braces')
  const fold = (seven: string[]) => [seven[0], seven[1], seven.slice(2, 6).join('\n'), seven[6]]
  const esc = (s: string) => JSON.stringify(s)
  const blocks = ORDER.map((hook) => {
    const cuts = naturalParsed[hook].cards
    const body = ['a', 'b', 'c'].map((c) => {
      const beats = fold(cuts[c]).map((b) => `        ${esc(b)},`).join('\n')
      return `      ${c}: [\n${beats}\n      ],`
    }).join('\n')
    return `    '${hook}': {\n` +
      `      // 🔄 Natural Tarot-Cut, wired 2026-08-25 from ${NATURAL_MS} — approved copy,\n` +
      `      // folded verbatim: cuts 3-6 become beat 3, joined by newlines.\n` +
      `${body}\n    },`
  }).join('\n')
  reg = reg.slice(0, end) + blocks + '\n' + reg.slice(end)
}

if (!CHECK) writeFileSync(REG, reg)
console.log(CHECK ? `${REG}: parsed + patched in memory only (--check)` : `wrote ${REG}`)

// ── 3. patch server/lib/prompts.ts ──────────────────────────────────────────────────────────
let prompts = readFileSync(PROMPTS, 'utf8')
const findOncePrompts = (needle: string, label: string) => {
  const i = prompts.indexOf(needle)
  if (i === -1) throw new Error(`prompts.ts anchor not found: ${label}`)
  if (prompts.indexOf(needle, i + 1) !== -1) throw new Error(`prompts.ts anchor not unique: ${label}`)
  return i
}

{
  const moneyHooks = ORDER.filter((h) => META[h].family === 'money')
  const lonelinessHooks = ORDER.filter((h) => META[h].family === 'loneliness')

  // Sets are `new Set([ ... ])` — bracket-count from the opening `[` rather than
  // string-matching the tail, since MONEY_TAROT_HOOKS and MONEY_PRAYER_TAROT_HOOKS end with
  // the identical two lines ('cards-prayed-years', 'cards-prayers-unanswered').
  const insertBeforeSetClose = (openAnchor: string, label: string, newLines: string[]) => {
    const start = findOncePrompts(openAnchor, `${label} open`)
    let depth = 0, end = -1
    for (let i = start + openAnchor.length - 1; i < prompts.length; i++) {
      if (prompts[i] === '[') depth++
      else if (prompts[i] === ']') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end === -1) throw new Error(`${label}: unbalanced brackets`)
    prompts = prompts.slice(0, end) + newLines.map((h) => `  '${h}',\n`).join('') + prompts.slice(end)
  }

  insertBeforeSetClose('const MONEY_TAROT_HOOKS = new Set([', 'MONEY_TAROT_HOOKS', moneyHooks)
  insertBeforeSetClose('const LONELINESS_TAROT_HOOKS = new Set([', 'LONELINESS_TAROT_HOOKS', lonelinessHooks)

  // TAROT_HOOK_CONTEXT tail
  const contextAnchor = `  'cards-heal-first': 'She is asking Evelyn to confirm a precondition. Confirming it is the single most common thing she has already been told for free.',\n}`
  const contextAt = findOncePrompts(contextAnchor, 'TAROT_HOOK_CONTEXT tail')
  const contextLines = [...moneyHooks, ...lonelinessHooks]
    .map((h) => `  '${h}': ${JSON.stringify(META[h].context)},`).join('\n')
  prompts = prompts.slice(0, contextAt) +
    `  'cards-heal-first': 'She is asking Evelyn to confirm a precondition. Confirming it is the single most common thing she has already been told for free.',\n` +
    contextLines + '\n}' +
    prompts.slice(contextAt + contextAnchor.length)

  // TAROT_HOOK_TENDENCY tail
  const tendencyAnchor = `  'cards-heal-first': "that there is no before — it does not run in order — and she has been holding a queue of her own making, with love filed last. NEVER say she must heal first and NEVER rule on her healing at all. NEVER hand her advice of any kind, including the kind ones ('just live your life', 'it comes when you stop looking'). NEVER use therapy language, NEVER give a date",\n}`
  const tendencyAt = findOncePrompts(tendencyAnchor, 'TAROT_HOOK_TENDENCY tail')
  const tendencyLines = [...moneyHooks, ...lonelinessHooks]
    .map((h) => `  '${h}': ${JSON.stringify(META[h].tendency)},`).join('\n')
  prompts = prompts.slice(0, tendencyAt) +
    `  'cards-heal-first': "that there is no before — it does not run in order — and she has been holding a queue of her own making, with love filed last. NEVER say she must heal first and NEVER rule on her healing at all. NEVER hand her advice of any kind, including the kind ones ('just live your life', 'it comes when you stop looking'). NEVER use therapy language, NEVER give a date",\n` +
    tendencyLines + '\n}' +
    prompts.slice(tendencyAt + tendencyAnchor.length)
}

if (!CHECK) writeFileSync(PROMPTS, prompts)
console.log(CHECK ? `${PROMPTS}: patched in memory only (--check)` : `wrote ${PROMPTS}`)

// ── 4. patch server/routes.ts — validHooks ──────────────────────────────────────────────────
let routes = readFileSync(ROUTES, 'utf8')
{
  const anchor = '"cards-waiting-to-heal", "cards-heal-first"];'
  const at = routes.indexOf(anchor)
  if (at === -1) throw new Error('routes.ts: validHooks tail not found')
  if (routes.indexOf(anchor, at + 1) !== -1) throw new Error('routes.ts: validHooks tail not unique')
  const addition = ORDER.map((h) => `, "${h}"`).join('')
  routes = routes.slice(0, at) + '"cards-waiting-to-heal", "cards-heal-first"' + addition + '];' + routes.slice(at + anchor.length)
}
if (!CHECK) writeFileSync(ROUTES, routes)
console.log(CHECK ? `${ROUTES}: patched in memory only (--check)` : `wrote ${ROUTES}`)

console.log(`\n✓ wiring complete: ${ORDER.length} hooks × 2 arms (natural inline, shadow via drafts + shadow-drafts-to-registry.mts)`)
console.log('  next: npx tsx scripts/shadow-drafts-to-registry.mts   (regenerates tarotReadsShadow.ts + self-verifies)')
