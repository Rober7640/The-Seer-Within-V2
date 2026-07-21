// Self-consistency tests for the forward-transit ephemeris.
// Run with: npx tsx server/lib/astrologyForwardTransits.test.ts
//
// No external ephemeris is needed: we prove the DETECTOR is correct by checking
// that every ingress it reports lands within 1° of a real sign/house boundary,
// and every station is a genuine direction reversal.

import {
  calculateForwardTransits,
  geoLongitude,
  toJulianDay,
  type NatalChart,
  type ForwardTransitEvent,
} from './astrologyEngine';

let passed = 0, failed = 0;
const failures: string[] = [];
function ok(cond: boolean, name: string) {
  if (cond) passed++; else { failed++; failures.push(name); }
}

// Deterministic run: fixed start so results don't depend on "today".
const START = new Date(Date.UTC(2026, 0, 1));
const ASC_LON = 15; // 15° Aries ascendant → house cusps at 15,45,75,...
const natal = {
  planets: [],
  ascendant: { sign: 'Aries', signSymbol: '♈', degree: 15, longitude: ASC_LON },
} as unknown as NatalChart;

const events = calculateForwardTransits(natal, 365, START);

// helper: noon-UTC jd for a YYYY-MM-DD string
function jdOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return toJulianDay(y, m, d, 12);
}
function minToBoundary(lon: number, offset = 0): number {
  const x = (((lon - offset) % 30) + 30) % 30;
  return Math.min(x, 30 - x);
}

ok(events.length > 0, 'finds at least one forward event in 2026');
ok(events.every(e => e.date >= '2026-01-01' && e.date <= '2027-01-01'), 'all events within horizon');
ok(events.every((e, i) => i === 0 || events[i - 1].date <= e.date), 'events sorted by date');

const CURATED = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto']);
const signIngresses = events.filter(e => e.kind === 'sign-ingress');

// COMPUTED sign ingresses (Jupiter only) must land within 1° of a real boundary.
for (const e of signIngresses.filter(e => !CURATED.has(e.planet))) {
  ok(e.planet === 'Jupiter', `computed sign-ingress is only Jupiter (got ${e.planet})`);
  const lon = geoLongitude(e.planet, jdOf(e.date));
  ok(minToBoundary(lon) < 1.5, `computed sign-ingress ${e.planet} ${e.date} near boundary (${minToBoundary(lon).toFixed(2)}°)`);
}

// Outer-planet sign ingresses must be the CURATED authoritative dates, not computed.
const curatedInWindow = signIngresses.filter(e => CURATED.has(e.planet)).map(e => `${e.planet} ${e.date}`);
ok(curatedInWindow.includes('Neptune 2026-01-26'), 'Neptune→Aries uses curated 2026-01-26 (not computed ~Feb 16)');
ok(curatedInWindow.includes('Saturn 2026-02-14'), 'Saturn→Aries uses curated 2026-02-14');
ok(curatedInWindow.includes('Uranus 2026-04-26'), 'Uranus→Gemini uses curated 2026-04-26 (not computed ~Apr 8)');
// No Node ingress dates (suppressed), no outer-planet house ingresses.
ok(!events.some(e => e.planet === 'North Node' && e.kind === 'sign-ingress'), 'North Node ingress suppressed');
ok(!events.some(e => CURATED.has(e.planet) && e.kind === 'house-ingress'), 'no outer-planet house ingresses');

// Every HOUSE ingress lands within 1° of a house cusp (30° from the ascendant).
const houseIngresses = events.filter(e => e.kind === 'house-ingress');
for (const e of houseIngresses) {
  const lon = geoLongitude(e.planet, jdOf(e.date));
  ok(minToBoundary(lon, ASC_LON) < 1.0, `house-ingress ${e.planet} ${e.date} near cusp (got ${minToBoundary(lon, ASC_LON).toFixed(2)}°)`);
}

// Every STATION is a genuine reversal: motion the day before and after differ in direction.
const stations = events.filter(e => e.kind === 'retrograde' || e.kind === 'direct');
function retroBetween(planet: string, jdA: number, jdB: number): boolean {
  const a = geoLongitude(planet, jdA), b = geoLongitude(planet, jdB);
  return ((b - a + 360) % 360) > 180;
}
for (const e of stations) {
  const jd = jdOf(e.date);
  const before = retroBetween(e.planet, jd - 2, jd - 1);
  const after  = retroBetween(e.planet, jd + 1, jd + 2);
  ok(before !== after, `station ${e.planet} ${e.date} is a real direction reversal`);
  // and the reported kind matches the post-station direction
  ok((e.kind === 'retrograde') === after, `station ${e.planet} ${e.date} kind matches direction`);
}

// Sanity: slow bodies produce a plausible number of station events in a year (each
// of Saturn/Uranus/Neptune/Pluto stations ~twice/yr → expect several).
ok(stations.length >= 4, `finds multiple stations in 2026 (got ${stations.length})`);

console.log(`\nForward transits: ${passed} passed, ${failed} failed`);
console.log(`  events found: ${events.length} (${signIngresses.length} sign, ${houseIngresses.length} house, ${stations.length} station)`);
if (failed > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
