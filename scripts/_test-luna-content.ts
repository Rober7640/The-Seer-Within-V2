// Test the Luna content generator (fallback + live Haiku). Loads .env first.
// Usage: npx tsx scripts/_test-luna-content.ts 2026-06-18
import 'dotenv/config';
import { planDay } from '../server/lib/dailySkyEditor.ts';
import { generateLunaDailyEmail, buildFallbackCopy } from '../server/lib/lunaContentGenerator.ts';

const date = process.argv[2] ?? '2026-06-18';
const plan = planDay(date);
console.log(`PLAN  ${plan.date} ${plan.zone}  [${plan.pillar}]  →  ${plan.headline}`);

console.log('\n--- FALLBACK (deterministic, no API) ---');
const fb = buildFallbackCopy(plan);
console.log('subject :', fb.subject);
console.log(fb.bodyText);

console.log('\n--- LIVE (Haiku) ---');
const live = await generateLunaDailyEmail(plan);
console.log('source  :', live.source);
console.log('subject :', live.subject);
console.log('preheader:', live.preheader);
console.log('');
console.log(live.bodyText);
console.log('\nP.S.', live.ps);
