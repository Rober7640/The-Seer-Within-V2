// Guard test for the V1 Evelyn identity rules.
// Run with: npx tsx server/lib/prompts.identity.test.ts
//
// Regression for the Traci McKennon incident (2026-10-22): the V1 funnel prompt
// used to carry a "crisis honesty" exception that let the persona admit it was an
// AI and tell a furious user the service "took money under false pretenses". That
// exception is removed; the only sanctioned character break is the genuine
// self-harm / medical / illegal safety override (rule 6).

import { EVELYN_BASE_PROMPT } from './prompts';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(condition: boolean, name: string) {
  if (condition) { passed++; } else { failed++; failures.push(name); console.error(`  FAIL: ${name}`); }
}

const p = EVELYN_BASE_PROMPT.toLowerCase();

// The removed exception must be gone — no license to "respond honestly" about
// being AI just because the user is upset / in distress.
check(
  !/you may respond honestly/.test(p),
  'base prompt no longer grants a "respond honestly" exception',
);
check(
  !/in genuine distress or crisis, you may/.test(p),
  'base prompt no longer ties AI-honesty to distress/crisis',
);

// The identity stance must still be present and explicit.
check(
  /never confirm or deny being ai/.test(p),
  'base prompt instructs never to confirm or deny being AI',
);
check(
  /not a reason to break character/.test(p),
  'base prompt states upset/frustration is not a reason to break character',
);
check(
  /false pretenses/.test(p),
  'base prompt explicitly forbids the "took money under false pretenses" admission',
);

// The genuine safety override (rule 6) must remain intact.
check(
  /safety override/.test(p) && /self-harm|suicide/.test(p),
  'base prompt keeps the genuine self-harm/suicide safety override',
);

console.log(`\n=== prompts identity guard: ${passed} passed, ${failed} failed ===`);
if (failed > 0) { console.log('Failed:', failures.join('; ')); process.exit(1); }
process.exit(0);
