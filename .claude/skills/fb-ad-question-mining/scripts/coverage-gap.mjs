// fb-ad-question-mining — COVERAGE GAP MAP. Read-only, no DB required.
//
// The question a build decision actually turns on is not "what do commitment-clickers
// say" — it is "what do women say that NO LANDER CURRENTLY ASKS ABOUT". This answers that
// directly, by cross-referencing proposed sub-buckets against every hook in the registry.
//
// 🔴 WHY THIS BEATS THE FLATNESS PROXY IN size-subbuckets.mjs. Flatness infers "nothing
// targets this" from prevalence being even across source hooks — an inference drawn from
// ~15 days of exposure data covering four live hooks. This reads the ACTUAL roster of 49
// questions (57 today) straight from the code. It is complete, needs no attribution, and cannot go
// stale the way a 15-day window does. Use flatness as corroboration, not as the finding.
//
//   node .claude/skills/fb-ad-question-mining/scripts/coverage-gap.mjs \
//     --subs .claude/skills/fb-ad-question-mining/examples/commitment-subs.json
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const REGISTRY = arg('registry', 'client/src/content/tarotReads.ts');
const subsPath = arg('subs', null);
if (!subsPath || !fs.existsSync(subsPath)) {
  console.error('🔴 --subs <file.json> required: { "NAME": "regex", ... }');
  process.exit(2);
}
// `_`-prefixed keys are metadata (_comment, _verified), not sub-buckets — see the same
// filter in size-subbuckets.mjs.
const SUBS = Object.fromEntries(
  Object.entries(JSON.parse(fs.readFileSync(subsPath, 'utf8'))).filter(([k]) => !k.startsWith('_')));
const THEMES = {
  commitment: 'commit|marry|marriage|propose|future|serious|exclusive',
  trust:      'lie|lying|honest|truth|trust|hiding|secret|cheat|real person|who he says|misled|deceiv',
  reunion:    'come back|comes back|back together|reconcile|left|moved on|still a chance|really over',
  loneliness: 'alone|lonely|no one|nobody|find someone|will i ever|given up|searching',
};
if (!fs.existsSync(REGISTRY)) { console.error(`🔴 registry not found: ${REGISTRY} (run from repo root)`); process.exit(2); }

// Pull every  'cards-x': 'Question text?'  pair. The registry is the single source of
// truth for what is askable; a hook missing here cannot be running.
const src = fs.readFileSync(REGISTRY, 'utf8');
const HOOKS = [...src.matchAll(/'(cards-[a-z0-9-]+)':\s*(['"`])((?:\\.|(?!\2).)*)\2\s*,/g)]
  .map((m) => ({ hook: m[1], q: m[3].replace(/\\'/g, "'") }))
  .filter((h) => /\?$/.test(h.q.trim()));            // question text only, not read copy
const uniq = new Map();
for (const h of HOOKS) if (!uniq.has(h.hook)) uniq.set(h.hook, h.q);

console.log(`\n## Registry: ${uniq.size} live-askable questions in ${path.basename(REGISTRY)}`);

// Which landers currently serve the theme being deepened — the roster the new
// sub-buckets will sit beside, and the thing a new question must not duplicate.
const themeArg = arg('theme', null);
if (themeArg) {
  const tre = new RegExp(THEMES[themeArg] ?? themeArg, 'i');
  const serving = [...uniq].filter(([, q]) => tre.test(q));
  console.log(`\n## Landers already serving theme "${themeArg}" — ${serving.length} of ${uniq.size}`);
  for (const [h, q] of serving) console.log(`   ${h.padEnd(24)} "${q}"`);
  if (!serving.length) console.log('   (none — the whole theme is unbuilt)');
}
console.log('');
console.log('sub-bucket    existing lander that already asks it');
console.log('─'.repeat(78));

const gaps = [];
for (const [name, srcRe] of Object.entries(SUBS)) {
  const re = new RegExp(srcRe, 'i');
  const hits = [...uniq].filter(([, q]) => re.test(q));
  if (hits.length) {
    console.log(`${name.padEnd(13)} SERVED`);
    for (const [h, q] of hits) console.log(`${''.padEnd(13)}   ${h.padEnd(22)} "${q}"`);
  } else {
    console.log(`${name.padEnd(13)} ⚑ NO LANDER ASKS THIS — build candidate`);
    gaps.push(name);
  }
}

console.log('\n' + '─'.repeat(78));
console.log(gaps.length
  ? `## ${gaps.length} unserved sub-bucket(s): ${gaps.join(', ')}`
  : '## every proposed sub-bucket already has a lander — deepen elsewhere');

// A sub-bucket's regex is written to match what SHE TYPES, which is looser and longer
// than ad copy. A miss against 49 short questions is therefore weak evidence on its own —
// so show the nearest questions by shared vocabulary for a human to overrule.
if (gaps.length) {
  console.log(`\n## Nearest existing questions (a regex tuned for her prose can miss short ad copy —`);
  console.log(`   check these by eye before calling a gap real)`);
  const stop = new Set('is are am do does did will would he him his she her me my i you your the a an to of for it that this in on why what when how ever really just'.split(' '));
  for (const name of gaps) {
    const words = [...new Set((SUBS[name].match(/[a-z]{4,}/gi) || []).map((w) => w.toLowerCase()))]
      .filter((w) => !stop.has(w));
    const scored = [...uniq].map(([h, q]) => {
      const qw = q.toLowerCase().match(/[a-z]{4,}/g) || [];
      return { h, q, score: words.filter((w) => qw.some((x) => x.startsWith(w.slice(0, 5)))).length };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    console.log(`\n  ${name}`);
    if (!scored.length) console.log(`    (nothing shares vocabulary — a clean gap)`);
    for (const s of scored) console.log(`    ${s.h.padEnd(22)} "${s.q}"`);
  }
}
console.log('');
