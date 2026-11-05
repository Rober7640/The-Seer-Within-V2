/**
 * Writes the exact prompts a fixture would send, and estimates a run's cost. Free.
 *   node scripts/preview-12-prompts.mjs [--fixture faketta] [--hand]
 *   → runs/preview-<fixture>/
 *
 * Writer replies are short filler, or with --hand (Testina only) the hand-written stand-in, so
 * "everything written so far" is the real length. Tokens are estimated at 4 characters each,
 * because nothing here calls a model.
 */
import fs from 'fs';
import path from 'path';
import { loadWf, TESTINA, FAKETTA, RUNS, execute, fakeOpenAI, handActs, START } from './lib-12.mjs';

const fixture = process.argv.includes('--fixture') ? process.argv[process.argv.indexOf('--fixture') + 1] : 'testina';
if (!['testina', 'faketta'].includes(fixture)) throw new Error('--fixture testina or faketta');
const useHand = process.argv.includes('--hand');
if (useHand && fixture !== 'testina') throw new Error('--hand exists for Testina only');
const hand = useHand ? handActs() : null;
const fake = fakeOpenAI(hand ? { acts: (id) => hand[id] } : {});
let r;
try { r = execute(loadWf(fixture === 'faketta' ? FAKETTA : TESTINA), { start: START, http: fake.http }); }
catch (e) { if (!/HOLD/.test(e.message)) throw e; }   // filler text fails the number checks; the prompts are what we want
const dir = path.join(RUNS, `preview-${fixture}`);
fs.mkdirSync(dir, { recursive: true });
const toks = (c) => Math.round(c / 4);
const rows = [];
fake.calls.slice(0, 5).forEach((c, i) => {
  const label = c.schema === 'verdict' ? 'grade' : c.schema.replace('_', '-');
  const sys = c.body.messages[0].content, user = c.body.messages[1].content;
  fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, '0')}-${label}.txt`),
    `=== SYSTEM ===\n${sys}\n\n=== USER ===\n${user}\n${c.body.response_format ? `\n=== SCHEMA ===\n${JSON.stringify(c.body.response_format, null, 1)}\n` : ''}`);
  rows.push({ label, in: toks(sys.length + user.length) });
});
const j = (r && r.last('3a ·')) || null;
const words = j ? j.devices.words : {};
const segOut = { 'act-a': ['opening', 'n1', 'n2', 'n3'], 'act-b': ['six', 'pin', 'stop'], 'act-c': Object.keys(words).filter((k) => k.startsWith('day')),
  'act-d': Object.keys(words).filter((k) => k === 'hours' || k === 'close' || k.startsWith('use_')) };
for (const row of rows) row.out = row.label === 'grade' ? 250 : Math.round((segOut[row.label] || []).reduce((n, k) => n + (words[k] || 0), 0) * 1.35);
const IN = rows.reduce((n, x) => n + x.in, 0), OUT = rows.reduce((n, x) => n + x.out, 0);
const usd = (mult) => (IN * 2 + OUT * mult * 10) / 1e6;
if (j) {
  const L = j.lucky;
  console.log(`\n  ${j.birth_name} · arm ${j.arm} · bump ${j.bump ? 'yes' : 'no'} · numbers ${L.numbers.three.join(', ')} · ${L.windowLabel}`);
  console.log(`  openers: ${j.devices.openers.join(' ')}\n  endings: ${j.devices.endings.join(' ')}\n  ticket months: ${j.devices.ticket_months.join(' ')}\n`);
}
for (const x of rows) console.log(`    ${x.label.padEnd(7)} ~${String(x.in).padStart(6)} in   ~${String(x.out).padStart(5)} out (visible)`);
console.log(`    total   ~${String(IN).padStart(6)} in   ~${String(OUT).padStart(5)} out (visible)\n`);
console.log('  one pass at $2 in / $10 out, no cache discount:');
for (const [name, mult] of [['no hidden thinking', 1], ['thinking = 1x visible', 2], ['thinking = 3x visible', 4]]) console.log(`    ${name.padEnd(24)} $${usd(mult).toFixed(2)}   with one regenerate $${(2 * usd(mult)).toFixed(2)}`);
console.log(`\n  prompts: ${dir}\n`);
