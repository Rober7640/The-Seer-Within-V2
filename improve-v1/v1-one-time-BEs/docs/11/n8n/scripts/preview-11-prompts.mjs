/**
 * Writes the exact prompts the fixture would send, and estimates a run's cost. Free.
 *   node scripts/preview-11-prompts.mjs [--fixture giving]
 *   → runs/preview-<fixture>/
 *
 * Writer replies are Diane's hand reading as a stand-in, so "everything written so far" is the
 * real length. Tokens are estimated at 4 characters each, because nothing here calls a model.
 */
import fs from 'fs';
import path from 'path';
import { loadWf, GETBACK, GIVING, RUNS, execute, fakeOpenAI, goldReading, START, SPEC } from './lib-11.mjs';

const fixture = process.argv.includes('--fixture') ? process.argv[process.argv.indexOf('--fixture') + 1] : 'getback';
if (!['getback', 'giving'].includes(fixture)) throw new Error('--fixture getback or giving');
const wf = loadWf(fixture === 'giving' ? GIVING : GETBACK);
const gold = goldReading();
const fake = fakeOpenAI({ sections: (k) => gold[k] });
const r = execute(wf, { start: START, http: fake.http });
const dir = path.join(RUNS, `preview-${fixture}`);
fs.mkdirSync(dir, { recursive: true });
const j = r.last('3 ·');
const toks = (c) => Math.round(c / 4);
const rows = [];
// The stand-in text is Diane's, so this fixture regenerates. One pass is the first seven calls.
fake.calls.slice(0, 7).forEach((c, i) => {
  const label = c.schema === 'story_plan' ? 'plan' : c.schema === 'verdict' ? 'grade' : `act-${'ABCDE'[i - 1]}`;
  const sys = c.body.messages[0].content, user = c.body.messages[1].content;
  fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, '0')}-${label}.txt`), `=== SYSTEM ===\n${sys}\n\n=== USER ===\n${user}\n`);
  rows.push({ label, in: toks(sys.length + user.length) });
});
const words = (k) => j.devices.words[k];
const out = { plan: 1800, grade: 250,
  'act-A': ['opening', 1, 2, 3], 'act-B': [4, 5, 6], 'act-C': [7, 8, 9], 'act-D': [10, 11, 12], 'act-E': ['letter', 'close'] };
for (const row of rows) {
  row.out = Array.isArray(out[row.label]) ? Math.round(out[row.label].reduce((n, k) => n + words(k), 0) * 1.35) : out[row.label];
}
const IN = rows.reduce((n, r2) => n + r2.in, 0), OUT = rows.reduce((n, r2) => n + r2.out, 0);
const usd = (mult) => (IN * 2 + OUT * mult * 10) / 1e6;
console.log(`\n  ${j.birth_name} · SU ${j.numbers.su} EX ${j.numbers.ex} LP ${j.numbers.lp} · ${j.answers.took} · ${j.answers.fork}`);
console.log(`  deal: ${j.deal.map((d) => `${d.house}:${d.card_name.replace(/^The /, '')}`).join(' · ')}`);
console.log(`  links: ${j.links.length}\n`);
for (const r2 of rows) console.log(`    ${r2.label.padEnd(7)} ~${String(r2.in).padStart(6)} in   ~${String(r2.out).padStart(5)} out (visible)`);
console.log(`    total   ~${String(IN).padStart(6)} in   ~${String(OUT).padStart(5)} out (visible)\n`);
console.log('  one pass at $2 in / $10 out, no cache discount:');
for (const [name, mult] of [['no hidden thinking', 1], ['thinking = 1x visible', 2], ['thinking = 3x visible', 4]]) console.log(`    ${name.padEnd(24)} $${usd(mult).toFixed(2)}   with one regenerate $${(2 * usd(mult)).toFixed(2)}`);
console.log(`\n  prompts: ${dir}\n`);
