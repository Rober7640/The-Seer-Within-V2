// CLI: print the transit calendar (day-picker output) for N days from a start date.
// Usage: npx tsx scripts/transit-calendar.ts 2026-06-18 14
import { buildCalendar } from '../server/lib/dailySkyEditor.ts';

const start = process.argv[2];
const days = process.argv[3] ? Number(process.argv[3]) : 14;

if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
  console.error('Usage: npx tsx scripts/transit-calendar.ts YYYY-MM-DD [days]');
  process.exit(1);
}

for (const d of buildCalendar(start, days)) {
  console.log(`\n${d.date} ${d.zone}  [${d.pillar}]  →  ${d.headline ?? '(quiet sky)'}`);
  console.log(`   moon: ${d.moonPhase.name} ${d.moonPhase.illumination}%  |  retro: ${d.retrogrades.join(', ') || 'none'}`);
  if (d.timingNote) console.log(`   ⏱  ${d.timingNote}`);
  for (const t of d.talkingPoints) console.log(`   • ${t}`);
}
