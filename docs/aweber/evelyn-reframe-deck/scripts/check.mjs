// Throwaway prototype of the reframe-deck mechanical self-check (scratchpad only).
// DRAFT-STAGE bars from PLAYBOOK.md (countable only; judgment bars = human review).
// Corrected after test-run 1: CTA slug lives in FRONTMATTER + a bold "→ label" in the
// body (the full tagged URL is assembled later by render.mjs). Length window matches
// what the 7 gold emails actually are (~290-360w), not the overstated 400-500.
import fs from 'fs';

function analyze(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const idx = raw.indexOf('\n---\n');
  const front = idx >= 0 ? raw.slice(0, idx) : '';
  let body = idx >= 0 ? raw.slice(idx + 5) : raw;
  body = body.replace(/\n—\s*Evelyn\s*$/, '\n');

  const dear     = (body.match(/\bdear\b/gi) || []).length;
  const reframe  = (body.match(/↳ THE REFRAME\./g) || []).length;
  const emdash   = (body.match(/—/g) || []).length;
  const slug     = (front.match(/campaign=([a-z0-9-]+)/) || [])[1] || null;
  const bodyCTA  = /\*\*→/.test(body);                    // bold "→ label" CTA line
  const underline = /<u>/i.test(body) || /__[^_]+__/.test(body);

  const text = body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/[>#*`_→↳]/g, ' ');
  const words = (text.match(/\b[\w']+\b/g) || []).length;

  return { dear, reframe, emdash, slug, bodyCTA, underline, words };
}

const files = process.argv.slice(2);
let anyFail = false;
for (const f of files) {
  const a = analyze(f);
  const checks = {
    'dear 2-4':      a.dear >= 2 && a.dear <= 4,
    'reframe x1':    a.reframe === 1,
    'em-dash <=2':   a.emdash <= 2,
    'CTA slug+label': !!a.slug && a.bodyCTA,
    'no underline':  !a.underline,
    'words 280-420': a.words >= 280 && a.words <= 420,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) anyFail = true;
  const name = f.split('/').pop().padEnd(38);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} dear=${a.dear} reframe=${a.reframe} emdash=${a.emdash} words=${a.words} slug=${a.slug || 'none'} cta=${a.bodyCTA?'y':'n'} ul=${a.underline?'y':'n'}`);
  for (const [k, v] of Object.entries(checks)) if (!v) console.log(`        ✗ ${k}`);
}
process.exit(anyFail ? 1 : 0);
