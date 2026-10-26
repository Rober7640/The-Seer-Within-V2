// Tests the canonical birth-chart selection — the invariant that fixes the Traci
// McKennon incident (2026-10-22): the SAME user got DIFFERENT charts from
// different personas because charts were stored per-persona. Charts are now
// per-USER; selectCanonicalBirthChartRow must pick ONE row deterministically so
// every persona resolves to the same chart.
// Run with: npx tsx server/lib/birthChartCanonical.test.ts

import { selectCanonicalBirthChartRow } from './chatEngine';

let passed = 0, failed = 0;
const failures: string[] = [];
function ok(cond: boolean, name: string) {
  if (cond) passed++; else { failed++; failures.push(name); }
}

// Minimal row factory (only the fields the selector reads).
let seq = 0;
function row(opts: { personaId: string | null; time?: string; updatedAt?: Date; id?: string }) {
  return {
    id: opts.id ?? `row-${++seq}`,
    personaId: opts.personaId,
    memoryType: 'birth_chart',
    updatedAt: opts.updatedAt ?? new Date(2026, 0, 1),
    createdAt: new Date(2026, 0, 1),
    fullContext: JSON.stringify({
      text: `chart for ${opts.personaId ?? 'canonical'}`,
      raw: { birthData: { date: '1971-02-15', time: opts.time ?? '12:00', lon: -115 } },
    }),
  } as any;
}

// 1. Canonical (personaId null) always wins, regardless of order/recency.
{
  const luna = row({ personaId: 'luna', time: '14:30', updatedAt: new Date(2026, 9, 1) });
  const canonical = row({ personaId: null, time: '14:30', updatedAt: new Date(2026, 0, 2) });
  ok(selectCanonicalBirthChartRow([luna, canonical])?.personaId === null, 'canonical (null) wins over newer legacy');
  ok(selectCanonicalBirthChartRow([canonical, luna])?.personaId === null, 'order-independent');
}

// 2. No canonical yet: a REAL captured time beats a noon default.
{
  const novaNoon = row({ personaId: 'nova', time: '12:00', updatedAt: new Date(2026, 9, 5) });
  const lunaReal = row({ personaId: 'luna', time: '14:30', updatedAt: new Date(2026, 9, 1) });
  const chosen = selectCanonicalBirthChartRow([novaNoon, lunaReal]);
  ok(chosen?.personaId === 'luna', 'real time beats noon default even if noon row is newer');
}

// 3. THE invariant: two personas querying the same rows get the SAME chart.
{
  const rows = [
    row({ personaId: 'luna', time: '14:30' }),
    row({ personaId: 'nova', time: '12:00' }),
    row({ personaId: 'evelyn', time: '09:00', updatedAt: new Date(2026, 9, 9) }),
  ];
  const a = selectCanonicalBirthChartRow(rows);
  const b = selectCanonicalBirthChartRow([...rows].reverse());
  ok(a?.id === b?.id, 'same rows → same chosen row regardless of query order (consistency invariant)');
}

// 4. Empty → null.
ok(selectCanonicalBirthChartRow([]) === null, 'no rows → null');

console.log(`\ncanonical birth-chart selection: ${passed} passed, ${failed} failed`);
if (failed) { console.log('FAILURES:'); failures.forEach(f => console.log(`  ✗ ${f}`)); process.exit(1); }
process.exit(0);
