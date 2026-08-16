// creative-cascade — JOB A. Inventory the BUILT territory and print the gap.
// Code-only. No DB, no flags, instant. Run from repo root.
//
// 🔴 WHAT THIS MEASURES, AND WHAT IT DOES NOT.
// It reads the REGISTRIES — the rosters the funnel actually serves — so "what is BUILT"
// is complete and cannot go stale. It says NOTHING about traffic or spend: a hook can
// sit in the registry for months with no ad pointed at it. Built ≠ running ≠ spending.
//   built    → this script
//   running  → cascade-stack.mjs (needs --live)
//   spending → Meta Ads Manager only. Not in this repo. See LIMITS in SKILL.md.
//
//   node .claude/skills/creative-cascade/scripts/cascade-map.mjs                    # census
//   node .claude/skills/creative-cascade/scripts/cascade-map.mjs --cascade seg.json # one segment
//
// Vocabulary is shared with fb-ad-question-mining: segment → injury → question → format.
// "persona" is never used — in this repo a persona is a V2 AI advisor, a different product.
import fs from 'node:fs';
import path from 'node:path';
import { readRegistry } from './lib/registry.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const R = readRegistry({
  tarot: arg('tarot', 'client/src/content/tarotReads.ts'),
  palm: arg('palm', 'client/src/content/palmReads.ts'),
  app: arg('app', 'client/src/App.tsx'),
});

const cascadePath = arg('cascade', null);

// ── CENSUS — the whole account's built territory ──
if (!cascadePath) {
  console.log(`\n# Creative-cascade census — what is BUILT (not what is running)\n`);
  console.log(`## Which cascade levels exist in code at all\n`);
  console.log(`| Level | In code? | Where |`);
  console.log(`|---|---|---|`);
  console.log(`| 1. segment | ❌ NO  | nowhere. Lives only in docs/fb-ad-question-mining/*.md |`);
  console.log(`| 2. injury  | ❌ NO  | nowhere. Lives only in those same run files |`);
  console.log(`| 3. question| ✅ yes | TAROT_HOOKS / PALM_HOOKS + HEADLINES |`);
  console.log(`| 4. format  | ✅ yes | routes in App.tsx |`);
  console.log(`\n🔴 CONSEQUENCE, and it is the biggest single finding this script produces:`);
  console.log(`   nothing in the running system records which SEGMENT or which INJURY an ad`);
  console.log(`   was bought against. So "is ROOMMATES tapping out" is not answerable from`);
  console.log(`   this data at all — not thinly, not at all. The finest grain the funnel`);
  console.log(`   records is the QUESTION (hook), and above it angleForHook's 19 families.`);
  console.log(`\n⚠ angleForHook's "angle" is NOT the cascade's injury. It is roughly a THEME`);
  console.log(`   (commitment, trust, reunion). Grouping by it and calling it an injury`);
  console.log(`   over-reports by a whole level. Same warning as fb-ad-question-mining.\n`);

  console.log(`## Level 3 — questions built, grouped by angleForHook family (≈ theme)\n`);
  console.log(`family (code "angle")   qs  questions`);
  console.log('─'.repeat(100));
  for (const [a, hs] of [...R.byAngle].sort((x, y) => y[1].length - x[1].length)) {
    console.log(`${a.padEnd(23)} ${String(hs.length).padStart(3)}  ${R.tarotHeadlines.get(hs[0]) || hs[0]}`);
    for (const h of hs.slice(1)) console.log(`${''.padEnd(28)}${R.tarotHeadlines.get(h) || h}`);
  }
  console.log(`\n### palm — ${R.palmHooks.length} questions, NO family layer in code`);
  console.log(`⚑ palmReads.ts has no *_HOOKS arrays and no angleForHook. Palm questions are one`);
  console.log(`   flat list, so a palm family is not reportable as a group the way a tarot one`);
  console.log(`   is. That is a real hole in the cascade, not a display quirk.\n`);
  for (const h of R.palmHooks) console.log(`   ${h.padEnd(22)} ${R.palmHeadlines.get(h) || ''}`);

  console.log(`\n## Level 4 — ${R.formats.length} formats: ${R.formats.join(', ')}`);
  console.log(`   tarot art within a format: ${R.decks.length} decks (${R.decks.join(', ')}); default ${R.defaultDeck}`);
  console.log(`   palm  art within a format: ${R.signs.length} signs`);
  console.log(`\n   🔴 THESE ARE DELIVERY VARIANTS, NOT AD FORMATS. /fb-tarot, /b and /c differ`);
  console.log(`   only in how the reading reaches her AFTER she clicks (static reveal card /`);
  console.log(`   reveal as chat / interactive). The FEED SEES AN IDENTICAL AD. So they change`);
  console.log(`   what % of clickers convert — they can never fight creative fatigue, and one`);
  console.log(`   question across three of them is ONE ad with three funnels, not three ads.`);
  console.log(`\n   The cascade's FORMAT level — static / video / UGC / carousel, the thing that`);
  console.log(`   decides who stops scrolling — lives in META ADS MANAGER. It is not in this`);
  console.log(`   repo at all (only image briefs under fb-palm/docs). This census cannot see it.`);

  console.log(`\n## The territory, counted`);
  console.log(`   tarot: ${R.tarotHooks.length} questions built`);
  console.log(`   palm : ${R.palmHooks.length} questions built`);
  console.log(`   TOTAL: ${R.tarotHooks.length + R.palmHooks.length} QUESTIONS, each reachable through ${R.tarotFormats.length} delivery variants.`);
  console.log(`\n   🔴 Do NOT multiply those two numbers and call it ad territory — that was done`);
  console.log(`   once and inflated the count 3x. Total ads = questions x CREATIVES PER QUESTION,`);
  console.log(`   and creatives-per-question is an Ads Manager number this repo cannot read.`);
  console.log(`\n   How many carry a live ad is NOT in this repo. Run cascade-stack.mjs to see`);
  console.log(`   which built questions have ever produced a conversation; Ads Manager for spend.\n`);
  process.exit(0);
}

// ── ONE SEGMENT'S CASCADE — map proposed injuries/questions onto what is built ──
// `--cascade -` reads the JSON from stdin, so this half of Job A works in a read-only
// or sandboxed session where writing a file is not allowed. Same shape either way.
let rawCascade;
if (cascadePath === '-') {
  rawCascade = fs.readFileSync(0, 'utf8');
} else {
  if (!fs.existsSync(cascadePath)) { console.error(`🔴 --cascade file not found: ${cascadePath}`); process.exit(2); }
  rawCascade = fs.readFileSync(cascadePath, 'utf8');
}
let C;
try { C = JSON.parse(rawCascade); }
catch (e) { console.error(`🔴 cascade JSON did not parse: ${e.message}`); process.exit(2); }
if (!C.injuries || typeof C.injuries !== 'object') {
  console.error('🔴 cascade file needs an "injuries" object — see examples/roommates-cascade.json');
  process.exit(2);
}
const wantFormats = Array.isArray(C.formats) && C.formats.length ? C.formats : R.tarotFormats;
const bad = wantFormats.filter((f) => !R.formats.includes(f));
if (bad.length) { console.error(`🔴 unknown format(s): ${bad.join(', ')} — known: ${R.formats.join(', ')}`); process.exit(2); }

console.log(`\n# Cascade — segment "${C.segment || path.basename(cascadePath)}"`);
if (C.source) console.log(`derived by fb-ad-question-mining: ${C.source}`);
if (!C.source) console.log(`⚠ no "source" field — a segment with no mining run behind it has not been verified.`);

const injuries = Object.entries(C.injuries);
const qCount = injuries.reduce((n, [, v]) => n + (v.questions || []).length, 0);
console.log(`\n${injuries.length} injur${injuries.length===1?"y":"ies"} × ${qCount} questions × ${wantFormats.length} formats = ${qCount * wantFormats.length} cells\n`);

// A segment wounds in several ways at once. One injury is almost always an unfinished
// derivation, not a small segment — and it is INVISIBLE downstream: the missing questions
// read as "unbuilt", so the gap report looks complete while showing a quarter of the map.
if (injuries.length === 1) {
  console.log(`🔴 ONLY ONE INJURY — treat this cascade as UNFINISHED, not as a small segment.`);
  console.log(`   A segment is a situation, and a situation wounds in several ways at once.`);
  console.log(`   ROOMMATES arrived with 1 injury; re-reading the SAME buyer quotes for wounds`);
  console.log(`   rather than topic gave 4 (un-event / erased / the clock / no permission) —`);
  console.log(`   ${qCount * wantFormats.length} cells became ${qCount * wantFormats.length * 4}.`);
  console.log(`   ⇒ Hand this back for fb-ad-question-mining Step 3b (derive the injuries)`);
  console.log(`     before pricing any build order off it.\n`);
}

const fills = [];
const bare = [];
let free = 0;
for (const [injury, spec] of injuries) {
  const qs = spec.questions || [];
  console.log(`## injury: ${injury}`);
  if (spec.theme && R.byAngle.has(spec.theme)) {
    console.log(`   angleForHook family "${spec.theme}" holds ${R.byAngle.get(spec.theme).length} built questions today`);
  }
  for (const q of qs) {
    const tBuilt = R.tarotHooks.includes(q), pBuilt = R.palmHooks.includes(q);
    const label = tBuilt ? (R.tarotHeadlines.get(q) || q) : pBuilt ? (R.palmHeadlines.get(q) || q) : q;
    console.log(`   [${(tBuilt ? 'BUILT tarot' : pBuilt ? 'BUILT palm' : 'UNBUILT').padEnd(11)}] ${label}`);
    if (tBuilt && spec.theme && R.hookAngle.get(q) !== spec.theme) {
      console.log(`${''.padEnd(17)}⚑ registry files this under family "${R.hookAngle.get(q)}", not "${spec.theme}" — reporting will not group it where you expect`);
    }
    for (const f of wantFormats) {
      const tFmt = f.startsWith('tarot-'), pFmt = f.startsWith('palm-');
      let cost, note;
      if (tFmt && tBuilt) { cost = 'FREE'; note = `URL only: /fb-tarot${f === 'tarot-a' ? '' : '/' + f.slice(-1)}?hook=${q}`; }
      else if (pFmt && pBuilt) { cost = 'FREE'; note = `URL only: /fb-palm${f === 'palm-a' ? '' : '/' + f.slice(-1)}?hook=${q}`; }
      // 🔴 `bare` is NOT free-and-equivalent. It costs no engineering, but no lander echoes
      // the ad question back, so she gets no message scent — the thing the quiz bridge
      // exists to provide. Tiering it as FREE made an all-unbuilt segment print "3 of 12
      // cells reachable today", which reads as "we can run this ad now". We cannot.
      else if (f === 'bare') { cost = 'NO-BRIDGE'; note = 'ad → chat with no quiz bridge. Zero build, but the ad question is never echoed back. A control that prices the bridge, not a substitute for a lander'; }
      else if (tFmt && pBuilt) { cost = 'PORT'; note = 'palm question with no tarot entry — add one via fb-tarot-add-card'; }
      else if (pFmt && tBuilt) { cost = 'PORT'; note = 'tarot question with no palm entry — fb-palm-hooks. NOTE the palm quiz reads HER, so a decode-him question needs a self-frame'; }
      // 🔴 Be exact about what a new question costs. `CardSetConfig.reads` is keyed
      // PER HOOK, so a new question reuses the deck ART but still needs its own 3
      // four-sentence reveals written into that deck, plus the two server rosters
      // (routes.ts validHooks, prompts.ts vocab) synced or the chat handoff 400s.
      // Saying "no new art" alone reads as "no work" and under-quotes the job.
      else if (tFmt) { cost = 'QUESTION'; note = `reuses deck ${R.defaultDeck} ART (no card strip needed), but still: 3 reveal reads into that deck + registry entry + server roster sync — fb-tarot-add-card`; }
      else { cost = 'QUESTION'; note = 'new palm question + reads (fb-palm-hooks)'; }
      if (cost === 'FREE') free++;
      else if (cost === 'NO-BRIDGE') bare.push({ q: label });
      else fills.push({ injury, q: label, f, cost, note });
    }
  }
  console.log('');
}

console.log('─'.repeat(100));
console.log(`## THE GAP\n`);
console.log(`   ${free} of ${qCount * wantFormats.length} cells are LIVE-READY — a built lander, reachable by changing a URL.`);
if (bare.length) {
  console.log(`   ${bare.length} more are "bare" (ad → chat, no quiz bridge). Zero build, but no lander echoes`);
  console.log(`   the ad question, so she gets no message scent. Count these as a CONTROL that prices`);
  console.log(`   the bridge — never as "we can run this ad today".`);
}
// 🔴 THE BUILD UNIT IS THE QUESTION, NOT THE CELL. Listing every cell makes a 14-question
// gap look like 42 builds. It is 14 builds, each unlocking 3 tarot formats for free. Get
// this wrong and the whole plan gets priced 3× and shelved.
const byQuestion = new Map();
for (const f of fills) {
  if (!byQuestion.has(f.q)) byQuestion.set(f.q, { q: f.q, injury: f.injury, cells: [], cost: f.cost, note: f.note });
  const e = byQuestion.get(f.q);
  e.cells.push(f.f);
  if (f.cost === 'QUESTION') { e.cost = 'QUESTION'; e.note = f.note; }
}
const builds = [...byQuestion.values()];
const rank = { PORT: 0, QUESTION: 1 };
console.log(`\n   ${builds.length} BUILD(S) unlock those ${fills.length} cells — the build unit is the`);
console.log(`   question, not the cell. One registry entry serves every tarot format.\n`);
for (const b of builds.sort((a, x) => (rank[a.cost] ?? 9) - (rank[x.cost] ?? 9))) {
  console.log(`   [${b.cost.padEnd(8)}] ${b.q}`);
  console.log(`${''.padEnd(15)}unlocks ${b.cells.length} cell(s): ${b.cells.join(', ')}`);
  console.log(`${''.padEnd(15)}${b.note}`);
}
console.log(`\n🔴 An UNBUILT question here is a GAP, not a brief. Do not invent a question to fill`);
console.log(`   a cell — that is the failure this skill exists to prevent. New questions come`);
console.log(`   from fb-ad-question-mining, traced to a real buyer quote. See SKILL.md.\n`);
