// Validation harness for getDailySky() in server/lib/astrologyEngine.ts
// Run: npx tsx scripts/_test-daily-sky.ts
import { getDailySky } from '../server/lib/astrologyEngine.ts';

const dates = [
  '2026-03-20', // spring equinox  -> Sun ~0° Aries
  '2026-06-21', // summer solstice -> Sun ~0° Cancer
  '2026-06-18', // the email's date (cross-checked vs published ephemeris)
];

for (const d of dates) {
  const sky = getDailySky(d); // noon UTC
  console.log(`\n================ ${sky.date}  noon ${sky.zone} (${sky.hourUTC}:00 UTC) ================`);
  for (const p of sky.placements) {
    const deg = `${p.degree}°${String(p.minutes).padStart(2, '0')}'`;
    console.log(`  ${p.name.padEnd(11)} ${p.sign.padEnd(11)} ${deg.padEnd(7)} lon=${p.longitude.toFixed(2)}°${p.retrograde ? '  ℞' : ''}`);
  }
  console.log(`  Moon phase : ${sky.moonPhase.name} (elong ${sky.moonPhase.elongation}°, ~${sky.moonPhase.illumination}% lit)`);
  console.log(`  Retrograde : ${sky.retrogrades.length ? sky.retrogrades.join(', ') : 'none'}`);
  console.log(`  Aspects    :`);
  for (const a of sky.aspects) {
    console.log(`     ${a.planet1} ${a.aspectSymbol} ${a.planet2}  (${a.aspectType}, orb ${a.orb}°)`);
  }
}

// --- Regression assertion: June 18 must match the validated numbers ---
const jun18 = getDailySky('2026-06-18');
const sun = jun18.placements.find(p => p.name === 'Sun')!;
const moon = jun18.placements.find(p => p.name === 'Moon')!;
const checks: Array<[string, boolean]> = [
  ['noon ET resolved to 16:00 UTC (EDT)', jun18.zone === 'EDT' && jun18.hourUTC === 16],
  ['Sun in Gemini ~27°', sun.sign === 'Gemini' && sun.degree === 27],
  ['Moon in Leo (mid-teens°)', moon.sign === 'Leo' && moon.degree >= 13 && moon.degree <= 19],
  ['Pluto retrograde', jun18.retrogrades.includes('Pluto')],
  ['Moon phase Waxing Crescent', jun18.moonPhase.name === 'Waxing Crescent'],
  ['Moon ~14-22% lit', jun18.moonPhase.illumination >= 14 && jun18.moonPhase.illumination <= 22],
  ['Moon has a same-day aspect (Mars square / Saturn trine at noon ET)', jun18.aspects.some(a =>
    a.planet1 === 'Moon' || a.planet2 === 'Moon')],
];
console.log('\n================ REGRESSION CHECKS ================');
let ok = true;
for (const [label, pass] of checks) {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) ok = false;
}
console.log(ok ? '\nALL CHECKS PASSED ✅' : '\nSOME CHECKS FAILED ❌');
process.exit(ok ? 0 : 1);
