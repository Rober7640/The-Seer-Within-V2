// Verify the assembler fills template A correctly (uses fallback copy — no API).
import { writeFileSync } from 'fs';
import { planDay } from '../server/lib/dailySkyEditor.ts';
import { buildFallbackCopy } from '../server/lib/lunaContentGenerator.ts';
import { pickBlurb } from '../server/lib/lunaBlurbs.ts';
import { assembleEmail } from '../server/lib/lunaEmailAssembler.ts';

const plan = planDay('2026-06-18');
const copy = buildFallbackCopy(plan);
const blurb = pickBlurb(plan.pillar, 0);
const out = assembleEmail(copy, blurb, plan);

const file = 'scripts/_assembler-sample.html';
writeFileSync(file, out.html);

const checks: Array<[string, boolean]> = [
  ['wrote HTML', out.html.length > 5000],
  ['no leftover LV-XX', !out.html.includes('LV-XX')],
  [`utm_content=${blurb.id} present`, out.html.includes(`utm_content=${blurb.id}`)],
  ['correct ET weekday (Thu, Jun 18)', out.html.includes('Thu, Jun 18')],
  ['old wrong weekday gone (Wed, Jun 18)', !out.html.includes('Wed, Jun 18')],
  ['placeholder H1 replaced', !out.html.includes('The Moon walks straight into Mars tonight')],
  ['blurb text injected', out.html.includes(blurb.text.slice(0, 30))],
  ['CTA label injected', out.html.includes(blurb.ctaLabel)],
  ['friction line injected', out.html.includes(blurb.friction.slice(0, 20))],
  ['avatar still present', out.html.includes('luna-avatar.jpg')],
];
console.log(`PLAN [${plan.pillar}] ${plan.headline}  | blurb ${blurb.id} "${blurb.ctaLabel}"`);
let ok = true;
for (const [label, pass] of checks) { console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`); if (!pass) ok = false; }
console.log(ok ? `\nASSEMBLER OK ✅  → ${file}` : '\nASSEMBLER FAILED ❌');
process.exit(ok ? 0 : 1);
