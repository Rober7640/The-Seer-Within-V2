// CLI: print the collective sky for a date as JSON (source of truth for email QA + the pipeline).
// Defaults to noon US Eastern (DST-aware). Usage: npx tsx scripts/daily-sky.ts 2026-06-18 [hourET]
import { getDailySky } from '../server/lib/astrologyEngine.ts';

const date = process.argv[2];
const hourET = process.argv[3] ? Number(process.argv[3]) : 12;

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: npx tsx scripts/daily-sky.ts YYYY-MM-DD [hourET]   # default noon ET (DST-aware)');
  process.exit(1);
}

console.log(JSON.stringify(getDailySky(date, hourET), null, 2));
