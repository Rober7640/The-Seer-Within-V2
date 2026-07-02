// Cheap, deterministic pre-QA audit: flag days where the engine labels a major moon
// phase or a retrograde station on a calendar day that ISN'T the exact-event day —
// the "[Phase] today" / "stations retrograde today" day-early bug the QA agent caught.
// Pure engine, no AI/web. Run BEFORE the persona-email-qa gate to target fixes.
//   npx tsx scripts/_audit-batch-events.ts 2026-06-20 90
import { getDailySky } from '../server/lib/astrologyEngine.ts';

const start = process.argv[2] ?? '2026-06-20';
const days = process.argv[3] ? Number(process.argv[3]) : 90;

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

interface Row { date: string; phase: string; elong: number; illum: number; retro: string[]; }
const rows: Row[] = [];
for (let i = 0; i < days; i++) {
  const date = addDays(start, i);
  const sky = getDailySky(date);
  rows.push({ date, phase: sky.moonPhase.name, elong: sky.moonPhase.elongation, illum: sky.moonPhase.illumination, retro: sky.retrogrades });
}

// Distance-to-exact metrics for each lunation milestone.
const mNew = (e: number) => Math.min(e, 360 - e);     // exact New at 0/360
const mFull = (e: number) => Math.abs(e - 180);       // exact Full at 180
const mQ1 = (e: number) => Math.abs(e - 90);          // First Quarter at 90
const mQ3 = (e: number) => Math.abs(e - 270);         // Last Quarter at 270
const METRIC: Record<string, (e: number) => number> = {
  'New Moon': mNew, 'Full Moon': mFull, 'First Quarter': mQ1, 'Last Quarter': mQ3,
};

// A labeled major-phase day is "day-early/late" if an adjacent day is strictly closer
// to the exact event (i.e., this day is not the local minimum of the metric).
const phaseFlags: string[] = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const metric = METRIC[r.phase];
  if (!metric) continue;
  const here = metric(r.elong);
  const prev = i > 0 ? metric(rows[i - 1].elong) : Infinity;
  const next = i < rows.length - 1 ? metric(rows[i + 1].elong) : Infinity;
  if (here > prev + 0.01 || here > next + 0.01) {
    const closer = here > prev ? rows[i - 1].date : rows[i + 1].date;
    phaseFlags.push(`  ⚠ ${r.date}  labeled "${r.phase}" but ${closer} is closer to exact  (Δ-to-exact ${here.toFixed(1)}° vs ${Math.min(prev, next).toFixed(1)}°, illum ${r.illum}%)`);
  }
}

// Retrograde stations: a planet's retro flag changes between consecutive days. The
// flip-day the engine reports can be ±1 day from the canonical station time, so any
// "stations today" copy on/near these dates needs a web double-check.
const stationFlags: string[] = [];
for (let i = 1; i < rows.length; i++) {
  const before = new Set(rows[i - 1].retro);
  const after = new Set(rows[i].retro);
  for (const p of after) if (!before.has(p)) stationFlags.push(`  ↺ ${rows[i].date}  ${p} turns RETROGRADE (engine flip day — verify vs ephemeris, may be the day before)`);
  for (const p of before) if (!after.has(p)) stationFlags.push(`  ↻ ${rows[i].date}  ${p} turns DIRECT (engine flip day — verify vs ephemeris)`);
}

console.log(`Audit ${start} → ${addDays(start, days - 1)} (${days} days)\n`);
console.log(`PHASE LABELS ON A NON-EXACT DAY (day-early/late "[Phase] today" risk): ${phaseFlags.length}`);
console.log(phaseFlags.join('\n') || '  (none)');
console.log(`\nRETROGRADE STATIONS in window (verify any "stations today" copy vs ephemeris): ${stationFlags.length}`);
console.log(stationFlags.join('\n') || '  (none)');
